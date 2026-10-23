import { EVENTS } from '../content/events.ts';
import type { Effect, EventChoice, GameEvent, Id, LogTone } from '../types/types.ts';
import { checkAll, evalFormula, subjectOf, type Ctx } from './formula.ts';
import { die } from './lifecycle.ts';
import { formatMoney, localizePrice, localizeSalary } from './localization.ts';
import { pick, pickWeighted, type Rng } from './rng.ts';
import {
  account, activeJob, addLog, clampStat, countryOf, edgeBetween, player, related, unlink, type World,
} from './world.ts';

export const eventById = (id: Id): GameEvent | undefined => EVENTS.find((e) => e.id === id);

/** Binds every role of `ev` to a related NPC, or returns null when a required role has no candidate. */
function bindRoles(w: World, ev: GameEvent, rng: Rng): Record<string, Id> | null {
  const roles: Record<string, Id> = {};
  for (const sel of ev.roles) {
    const candidates = related(w, w.save.currentPlayerId, sel.relation, sel.alive === false)
      .map((r) => r.person)
      .filter((p) => (sel.alive === false ? p.status !== 'alive' : true) && (!sel.sex || p.sex === sel.sex))
      .filter((p) => checkAll(sel.where, { w, roles: { ...roles, [sel.role]: p.id } }));
    if (candidates.length === 0) {
      if (sel.required) return null;
      continue;
    }
    roles[sel.role] = pick(rng, candidates).id;
  }
  return roles;
}

function eligible(w: World, ev: GameEvent, rng: Rng): Record<string, Id> | null {
  const p = player(w);
  const { pre } = ev;
  if (p.age < pre.minAge || p.age > pre.maxAge) return null;
  if (pre.countries.length && !pre.countries.includes(p.countryCode)) return null;
  if (pre.excludeCountries.includes(p.countryCode)) return null;
  if (Object.entries(pre.requiredFlags).some(([k, v]) => p.flags[k] !== v)) return null;
  if (pre.forbiddenFlags.some((k) => p.flags[k] !== undefined && p.flags[k] !== false)) return null;
  const last = w.save.eventHistory[ev.id];
  if (last !== undefined && (ev.once || w.save.year - last < Math.max(1, ev.cooldownYears))) return null;
  const roles = bindRoles(w, ev, rng);
  if (!roles) return null;
  return checkAll(pre.conditions, { w, roles }) ? roles : null;
}

/** Step 6 of +Age: pick one event (scheduled chains first, then weighted RNG) and mark it pending. */
export function selectEvent(w: World, rng: Rng): void {
  const due = w.save.scheduledEvents.filter((s) => s.year <= w.save.year);
  w.save.scheduledEvents = w.save.scheduledEvents.filter((s) => s.year > w.save.year);
  for (const s of due) {
    const ev = eventById(s.eventId);
    const roles = ev && eligible(w, ev, rng);
    if (ev && roles) return setPending(w, ev, roles);
  }
  const options = EVENTS.flatMap((ev) => {
    const roles = eligible(w, ev, rng);
    return roles ? [{ ev, roles, weight: evalFormula(ev.weight, { w, roles }) }] : [];
  });
  const chosen = pickWeighted(rng, options, (o) => o.weight);
  if (chosen) setPending(w, chosen.ev, chosen.roles);
}

function setPending(w: World, ev: GameEvent, roles: Record<string, Id>): void {
  w.save.pendingEvent = { eventId: ev.id, roleBindings: roles };
  w.save.eventHistory[ev.id] = w.save.year;
}

export interface PendingView {
  prompt: string;
  choices: { id: Id; label: string }[];
}

export function pendingView(w: World): PendingView | null {
  const pending = w.save.pendingEvent;
  const ev = pending && eventById(pending.eventId);
  if (!pending || !ev) return null;
  const ctx: Ctx = { w, roles: pending.roleBindings };
  return {
    prompt: renderText(ev.prompt, ctx),
    choices: visibleChoices(ev, ctx).map((c) => ({ id: c.id, label: renderText(c.label, ctx) })),
  };
}

const visibleChoices = (ev: GameEvent, ctx: Ctx): EventChoice[] => ev.choices.filter((c) => checkAll(c.conditions, ctx));

/** Tokens: {player} or any bound role name -> first name, {money} -> last money effect. */
export function renderText(template: string, ctx: Ctx & { money?: string }): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    if (key === 'money') return ctx.money ?? whole;
    if (key === 'player') return player(ctx.w).firstName;
    const id = ctx.roles[key];
    return id ? ctx.w.persons[id]?.firstName ?? whole : whole;
  });
}

/** Applies the player's choice for the pending event and logs the outcome. */
export function resolveChoice(w: World, rng: Rng, choiceId: Id): { text: string; tone: LogTone } {
  const pending = w.save.pendingEvent;
  const ev = pending && eventById(pending.eventId);
  if (!pending || !ev) throw new Error('no pending event');
  const ctx: Ctx & { money?: string } = { w, roles: pending.roleBindings };
  const choice = visibleChoices(ev, ctx).find((c) => c.id === choiceId);
  if (!choice) throw new Error(`choice ${choiceId} not available`);
  const outcome = pickWeighted(rng, choice.outcomes, (o) => evalFormula(o.weight, ctx)) ?? choice.outcomes[0];
  for (const e of outcome.effects) applyEffect(w, e, ctx);
  const text = renderText(outcome.text, ctx);
  delete w.save.pendingEvent;
  addLog(w, text, outcome.tone);
  return { text, tone: outcome.tone };
}

export function applyEffect(w: World, e: Effect, ctx: Ctx & { money?: string }): void {
  const p = player(w);
  switch (e.op) {
    case 'stat': {
      const target = subjectOf(ctx, e.subject);
      const delta = evalFormula(e.delta, ctx);
      if ('stat' in e.ref) target.stats[e.ref.stat] = clampStat(target.stats[e.ref.stat] + delta);
      else if ('hidden' in e.ref) target.hidden[e.ref.hidden] = clampStat(target.hidden[e.ref.hidden] + delta);
      else target.personality[e.ref.personality] = clampStat(target.personality[e.ref.personality] + delta);
      return;
    }
    case 'money': {
      const country = countryOf(p);
      const intl = evalFormula(e.amount, ctx);
      const local = e.scale === 'wage' ? localizeSalary(intl, country) : localizePrice(intl, country);
      account(w, p.id).balance += local;
      ctx.money = formatMoney(Math.abs(local), country);
      return;
    }
    case 'relationBar': {
      const id = ctx.roles[e.role];
      if (!id) return;
      const delta = evalFormula(e.delta, ctx);
      for (const edge of [edgeBetween(w, p.id, id), edgeBetween(w, id, p.id)]) {
        if (edge) edge.bar = clampStat(edge.bar + delta);
      }
      return;
    }
    case 'setFlag': subjectOf(ctx, e.subject).flags[e.key] = e.value; return;
    case 'addTrait': {
      const t = subjectOf(ctx, e.subject);
      if (!t.traitIds.includes(e.traitId)) t.traitIds.push(e.traitId);
      return;
    }
    case 'removeTrait': {
      const t = subjectOf(ctx, e.subject);
      t.traitIds = t.traitIds.filter((x) => x !== e.traitId);
      return;
    }
    case 'addCondition':
      if (!p.conditions.some((x) => x.diseaseId === e.diseaseId)) {
        p.conditions.push({ diseaseId: e.diseaseId, sinceYear: w.save.year, severity: e.severity, treated: false });
      }
      return;
    case 'endRelationship': {
      const id = ctx.roles[e.role];
      if (!id) return;
      unlink(w, p.id, id, e.reason === 'divorce' ? 'exSpouse' : 'exPartner');
      if (e.reason === 'divorce') delete p.flags.married;
      return;
    }
    case 'loseJob': {
      const job = activeJob(w, p.id);
      if (job) { job.endedYear = w.save.year; job.endReason = e.reason; }
      return;
    }
    case 'die': die(w, p.id, e.causeId); return;
    case 'chain': w.save.scheduledEvents.push({ eventId: e.eventId, year: w.save.year + e.delayYears }); return;
  }
}

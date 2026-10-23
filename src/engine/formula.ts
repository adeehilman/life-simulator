import type { Condition, Formula, Id, PersonEntity, StatRef, Subject } from '../types/types.ts';
import { localizePrice } from './localization.ts';
import { activeEducation, activeJob, account, countryOf, edgeBetween, player, type World } from './world.ts';

/** Evaluation context: the world plus NPCs bound to event roles (role name -> person id). */
export interface Ctx {
  w: World;
  roles: Record<string, Id>;
}

export function subjectOf(ctx: Ctx, subject: Subject | undefined): PersonEntity {
  if (!subject || subject === 'player') return player(ctx.w);
  const id = ctx.roles[subject.role];
  const p = id ? ctx.w.persons[id] : undefined;
  if (!p) throw new Error(`role ${subject.role} not bound`);
  return p;
}

export function readStat(p: PersonEntity, ref: StatRef): number {
  if ('stat' in ref) return p.stats[ref.stat];
  if ('hidden' in ref) return p.hidden[ref.hidden];
  return p.personality[ref.personality];
}

export function evalFormula(f: Formula, ctx: Ctx): number {
  switch (f.op) {
    case 'const': return f.value;
    case 'ref': return readStat(subjectOf(ctx, f.subject), f.ref);
    case 'age': return subjectOf(ctx, f.subject).age;
    case 'relationBar': {
      const id = ctx.roles[f.role];
      return id ? edgeBetween(ctx.w, ctx.w.save.currentPlayerId, id)?.bar ?? 0 : 0;
    }
    case 'jobPerformance': return activeJob(ctx.w, ctx.w.save.currentPlayerId)?.performance ?? 0;
    case 'flag': {
      const v = subjectOf(ctx, f.subject).flags[f.key];
      return typeof v === 'number' ? v : v === true ? 1 : 0;
    }
    case 'add': return f.of.reduce((s, x) => s + evalFormula(x, ctx), 0);
    case 'mul': return f.of.reduce((s, x) => s * evalFormula(x, ctx), 1);
    case 'min': return Math.min(...f.of.map((x) => evalFormula(x, ctx)));
    case 'max': return Math.max(...f.of.map((x) => evalFormula(x, ctx)));
    case 'sub': return evalFormula(f.a, ctx) - evalFormula(f.b, ctx);
    case 'div': {
      const b = evalFormula(f.b, ctx);
      return b === 0 ? 0 : evalFormula(f.a, ctx) / b;
    }
    case 'clamp': return Math.max(f.min, Math.min(f.max, evalFormula(f.of, ctx)));
    case 'logistic': return 1 / (1 + Math.exp(-f.k * (evalFormula(f.x, ctx) - f.mid)));
    case 'karmaBias': {
      const p = evalFormula(f.p, ctx) + ((player(ctx.w).hidden.karma - 50) * f.strength) / 100;
      return Math.max(0, Math.min(1, p));
    }
    case 'if': return checkCondition(f.cond, ctx) ? evalFormula(f.then, ctx) : evalFormula(f.else, ctx);
  }
}

function compare(a: number, cmp: string, b: number): boolean {
  switch (cmp) {
    case 'lt': return a < b;
    case 'lte': return a <= b;
    case 'gt': return a > b;
    case 'gte': return a >= b;
    case 'eq': return a === b;
    default: return a !== b;
  }
}

export function checkCondition(c: Condition, ctx: Ctx): boolean {
  const p = player(ctx.w);
  switch (c.op) {
    case 'cmp': return compare(evalFormula(c.left, ctx), c.cmp, evalFormula(c.right, ctx));
    case 'flag': return (subjectOf(ctx, c.subject).flags[c.key] ?? false) === c.equals;
    case 'hasTrait': return subjectOf(ctx, c.subject).traitIds.includes(c.traitId);
    case 'hasCondition': return p.conditions.some((x) => x.diseaseId === c.diseaseId);
    case 'employed': {
      const job = activeJob(ctx.w, p.id);
      return !!job && (!c.category || job.careerId.startsWith(`${c.category}:`));
    }
    case 'inSchool': {
      const edu = activeEducation(ctx.w, p.id);
      return !!edu && (!c.stage || edu.stage === c.stage);
    }
    case 'country': return c.in.includes(p.countryCode);
    case 'legalAge': {
      const legal = countryOf(p).legal;
      const age = {
        driving: legal.drivingAge,
        marriage: legal.marriage.minimumAge,
        marriageNoConsent: legal.marriage.withoutParentalConsentAge,
        drinking: legal.drinkingAge,
        gambling: legal.gamblingAge ?? Infinity,
        retirement: legal.retirementAge,
      }[c.milestone];
      return p.age >= age;
    }
    case 'balance':
      return compare(account(ctx.w, p.id).balance, c.cmp, localizePrice(c.value, countryOf(p)));
    case 'all': return c.of.every((x) => checkCondition(x, ctx));
    case 'any': return c.of.some((x) => checkCondition(x, ctx));
    case 'not': return !checkCondition(c.of, ctx);
  }
}

export const checkAll = (cs: Condition[] | undefined, ctx: Ctx): boolean => (cs ?? []).every((c) => checkCondition(c, ctx));

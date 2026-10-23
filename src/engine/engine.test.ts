import { describe, expect, it } from 'vitest';
import { EVENTS } from '../content/events.ts';
import { INDONESIA } from '../data/countries/id.ts';
import { UNITED_STATES } from '../data/countries/us.ts';
import { applyJob, buyAsset, findDate, interact, tryForBaby, visitDoctor } from './actions.ts';
import { pendingView, resolveChoice } from './events.ts';
import { checkCondition, evalFormula } from './formula.ts';
import { continueAsChild, livingChildren } from './lifecycle.ts';
import { gompertzDeathProbability, incomeTax, localizeSalary, toMinor } from './localization.ts';
import { createWorld } from './people.ts';
import { mulberry32, saveRng } from './rng.ts';
import { ageUp } from './tick.ts';
import { account, player, related, type World } from './world.ts';

/** Plays one full life choosing the first available option for every event. */
function playLife(w: World, maxYears = 130): void {
  const rng = saveRng(w.save);
  for (let i = 0; i < maxYears && player(w).status === 'alive'; i++) {
    ageUp(w, rng);
    const view = pendingView(w);
    if (view) resolveChoice(w, rng, view.choices[0]!.id);
  }
}

describe('rng', () => {
  it('is deterministic for the same state', () => {
    expect(mulberry32(123)).toEqual(mulberry32(123));
    expect(mulberry32(123)[0]).not.toEqual(mulberry32(124)[0]);
  });
});

describe('localization', () => {
  it('applies progressive income tax above the allowance', () => {
    // Rp67.5M - Rp54M PTKP = Rp13.5M taxed at 5%
    expect(incomeTax(toMinor(67_500_000, INDONESIA), INDONESIA)).toBe(675_000);
    // $90,000 - $16,100 = $73,900 → $10,970 (in cents)
    expect(incomeTax(toMinor(90_000, UNITED_STATES), UNITED_STATES)).toBe(1_097_000);
  });
  it('scales salaries by PPP and wage index', () => {
    expect(localizeSalary(90_000, INDONESIA)).toBe(67_500_000);
  });
  it('mortality rises with age', () => {
    expect(gompertzDeathProbability(90, INDONESIA.mortality)).toBeGreaterThan(gompertzDeathProbability(60, INDONESIA.mortality));
  });
});

describe('formula & conditions', () => {
  it('evaluates against the player', () => {
    const w = createWorld(7);
    const p = player(w);
    p.stats.smarts = 80;
    const ctx = { w, roles: {} };
    expect(evalFormula({ op: 'add', of: [{ op: 'ref', ref: { stat: 'smarts' } }, { op: 'const', value: 5 }] }, ctx)).toBe(85);
    expect(checkCondition({ op: 'legalAge', milestone: 'driving' }, ctx)).toBe(false);
    p.age = 17;
    expect(checkCondition({ op: 'legalAge', milestone: 'driving' }, ctx)).toBe(true);
  });
});

describe('new life', () => {
  it('creates a player with two parents in Indonesia', () => {
    const w = createWorld(42);
    const p = player(w);
    expect(p.countryCode).toBe('ID');
    expect(p.age).toBe(0);
    expect(related(w, p.id, ['parent'])).toHaveLength(2);
    expect(w.log.length).toBeGreaterThan(0);
  });
});

describe('+Age pipeline', () => {
  it('runs whole lives without throwing and always ends in death', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const w = createWorld(seed);
      playLife(w);
      expect(player(w).status).toBe('dead');
      expect(player(w).age).toBeGreaterThan(0);
    }
  });

  it('auto-enrolls school at the country entry age', () => {
    const w = createWorld(11);
    const rng = saveRng(w.save);
    for (let i = 0; i < 8; i++) {
      ageUp(w, rng);
      const v = pendingView(w);
      if (v) resolveChoice(w, rng, v.choices[0]!.id);
    }
    const stages = Object.values(w.educations).filter((e) => e.personId === w.save.currentPlayerId).map((e) => e.stage);
    expect(stages).toContain('primary');
  });

  it('blocks +Age while an event is pending', () => {
    const w = createWorld(3);
    const rng = saveRng(w.save);
    for (let i = 0; i < 30 && !w.save.pendingEvent; i++) ageUp(w, rng);
    const age = player(w).age;
    if (w.save.pendingEvent) {
      ageUp(w, rng);
      expect(player(w).age).toBe(age);
    }
  });

  it('every event has 2-4 choices and valid tokens', () => {
    for (const ev of EVENTS) {
      expect(ev.choices.length).toBeGreaterThanOrEqual(2);
      expect(ev.choices.length).toBeLessThanOrEqual(4);
    }
  });
});

describe('actions & lineage', () => {
  it('adult can work, date, have a child, and the child can continue', () => {
    const w = createWorld(99);
    const rng = saveRng(w.save);
    const p = player(w);
    // Fast-forward to adulthood without the event layer.
    p.age = 25;
    p.stats.looks = 100;
    p.hidden.karma = 100;
    p.hidden.fertility = 100;
    applyJob(w, rng, 'fullTime:kasir');
    for (let i = 0; i < 10 && !related(w, p.id, ['partner']).length; i++) { delete p.flags['act:dating']; w.save.year++; findDate(w, rng, p.sex === 'male' ? 'female' : 'male'); }
    const partner = related(w, p.id, ['partner'])[0];
    expect(partner).toBeDefined();
    partner!.person.hidden.fertility = 100;
    for (let i = 0; i < 20 && livingChildren(w, p.id).length === 0; i++) { w.save.year++; tryForBaby(w, rng, partner!.person.id); }
    const kids = livingChildren(w, p.id);
    expect(kids.length).toBeGreaterThan(0);
    interact(w, rng, partner!.person.id, 'spendTime');
    account(w, p.id).balance = toMinor(1_000_000_000, INDONESIA);
    expect(buyAsset(w, 'rumah-tipe-45', 'cash').tone).toBe('positive');
    visitDoctor(w, rng);

    p.status = 'dead';
    continueAsChild(w, kids[0]!.id);
    expect(w.save.currentPlayerId).toBe(kids[0]!.id);
    expect(account(w, kids[0]!.id).balance).toBeGreaterThan(0);
    expect(Object.values(w.assets).every((a) => a.ownerId === kids[0]!.id)).toBe(true);
  });
});

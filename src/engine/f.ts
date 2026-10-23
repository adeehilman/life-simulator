// Small builders that keep authored content (events, careers) readable. They only produce plain data.
import type {
  Condition, Effect, Formula, HiddenStats, PersonalityStats, Subject, VisibleStats,
} from '../types/types.ts';

export const c = (value: number): Formula => ({ op: 'const', value });
export const stat = (s: keyof VisibleStats, subject?: Subject): Formula => ({ op: 'ref', ref: { stat: s }, subject });
export const hidden = (s: keyof HiddenStats, subject?: Subject): Formula => ({ op: 'ref', ref: { hidden: s }, subject });
export const persona = (s: keyof PersonalityStats, subject?: Subject): Formula =>
  ({ op: 'ref', ref: { personality: s }, subject });
export const add = (...of: Formula[]): Formula => ({ op: 'add', of });
export const mul = (...of: Formula[]): Formula => ({ op: 'mul', of });
export const clamp = (of: Formula, min = 0, max = 1): Formula => ({ op: 'clamp', of, min, max });
/** p + (karma-50)*strength/100 */
export const karma = (p: number | Formula, strength = 0.3): Formula =>
  ({ op: 'karmaBias', p: typeof p === 'number' ? c(p) : p, strength });
/** Smooth 0..1 curve centered on `mid` (e.g. smarts 50). */
export const curve = (x: Formula, mid = 50, k = 0.08): Formula => ({ op: 'logistic', x, mid, k });

export const minStat = (s: keyof VisibleStats, value: number): Condition =>
  ({ op: 'cmp', left: stat(s), cmp: 'gte', right: c(value) });
export const notFlag = (key: string): Condition => ({ op: 'not', of: { op: 'flag', key, equals: true } });

// Effects
export const dStat = (s: keyof VisibleStats, delta: number, subject?: Subject): Effect =>
  ({ op: 'stat', ref: { stat: s }, delta: c(delta), subject });
export const dHidden = (s: keyof HiddenStats, delta: number): Effect => ({ op: 'stat', ref: { hidden: s }, delta: c(delta) });
/** Money in international dollars, PPP-scaled to the player's country. Negative = pay. */
export const money = (amount: number, scale: 'price' | 'wage' = 'price'): Effect => ({ op: 'money', amount: c(amount), scale });
export const bar = (role: string, delta: number): Effect => ({ op: 'relationBar', role, delta: c(delta) });
export const flag = (key: string, value: boolean | number | string = true): Effect => ({ op: 'setFlag', key, value });

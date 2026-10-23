import type { SaveGame } from '../types/types.ts';

export type Rng = () => number;

/** mulberry32 step: returns [value in [0,1), next state]. */
export function mulberry32(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/**
 * RNG bound to a save: every roll advances `save.rngState`, which is persisted with the save.
 * Reloading the tab therefore replays nothing — the next roll continues from the stored state.
 */
export function saveRng(save: SaveGame): Rng {
  return () => {
    const [value, next] = mulberry32(save.rngState);
    save.rngState = next;
    return value;
  };
}

export const chance = (rng: Rng, p: number): boolean => rng() < p;
export const randInt = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]!;

export function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T | undefined {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  if (total <= 0) return undefined;
  let roll = rng() * total;
  for (const item of items) {
    roll -= Math.max(0, weight(item));
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

/** Bell-ish stat 0..100 (average of two rolls). */
export const rollStat = (rng: Rng): number => Math.round(((rng() + rng()) / 2) * 100);

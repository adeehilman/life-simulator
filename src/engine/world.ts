import { COUNTRIES } from '../data/countries/index.ts';
import type {
  BankAccount, CountryConfig, Education, Employment, Id, LogEntry, LogTone, PersonEntity, Relationship,
  RelationType, SaveGame, SchoolStageId, Asset,
} from '../types/types.ts';

/** In-memory snapshot of one save. Mirrors the Dexie tables 1:1 (flat maps keyed by id). */
export interface World {
  save: SaveGame;
  persons: Record<Id, PersonEntity>;
  relationships: Record<Id, Relationship>;
  employments: Record<Id, Employment>;
  educations: Record<Id, Education>;
  assets: Record<Id, Asset>;
  accounts: Record<Id, BankAccount>;
  log: LogEntry[];
  /** How many trailing `log` entries are not yet written to IndexedDB. */
  unsavedLog: number;
}

export const SCHEMA_VERSION = 1;

export const uid = (): Id => crypto.randomUUID();

export const clampStat = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));

export function player(w: World): PersonEntity {
  const p = w.persons[w.save.currentPlayerId];
  if (!p) throw new Error('current player missing');
  return p;
}

export function countryOf(p: PersonEntity): CountryConfig {
  const c = COUNTRIES[p.countryCode];
  if (!c) throw new Error(`unknown country ${p.countryCode}`);
  return c;
}

export const fullName = (p: PersonEntity): string => [p.firstName, p.lastName].filter(Boolean).join(' ');

/** Active (not ended) edges from `personId`, optionally filtered by type. */
export function edgesFrom(w: World, personId: Id, types?: RelationType[]): Relationship[] {
  return Object.values(w.relationships).filter(
    (r) => r.fromId === personId && r.endedYear === undefined && (!types || types.includes(r.type)),
  );
}

export function edgeBetween(w: World, fromId: Id, toId: Id): Relationship | undefined {
  return Object.values(w.relationships).find((r) => r.fromId === fromId && r.toId === toId && r.endedYear === undefined);
}

/** Related people as {edge, person}, living only unless `includeDead`. */
export function related(w: World, personId: Id, types?: RelationType[], includeDead = false) {
  return edgesFrom(w, personId, types)
    .map((edge) => ({ edge, person: w.persons[edge.toId]! }))
    .filter(({ person }) => person && (includeDead || person.status === 'alive'));
}

/** Creates the two directed edges of a relationship. */
export function link(w: World, a: Id, b: Id, typeAB: RelationType, typeBA: RelationType, bar: number): void {
  const base = { saveId: w.save.id, sinceYear: w.save.year, flags: {} };
  const ab: Relationship = { id: uid(), fromId: a, toId: b, type: typeAB, bar: clampStat(bar), ...base };
  const ba: Relationship = { id: uid(), fromId: b, toId: a, type: typeBA, bar: clampStat(bar), ...base, flags: {} };
  w.relationships[ab.id] = ab;
  w.relationships[ba.id] = ba;
}

/** Ends both directions of a relationship, optionally replacing it with a new type (e.g. spouse -> exSpouse). */
export function unlink(w: World, a: Id, b: Id, newType?: RelationType): void {
  let bar = 30;
  for (const r of Object.values(w.relationships)) {
    const match = (r.fromId === a && r.toId === b) || (r.fromId === b && r.toId === a);
    if (!match || r.endedYear !== undefined) continue;
    r.endedYear = w.save.year;
    bar = Math.min(bar, r.bar);
  }
  if (newType) link(w, a, b, newType, newType, bar);
}

export function account(w: World, ownerId: Id): BankAccount {
  const found = Object.values(w.accounts).find((a) => a.ownerId === ownerId);
  if (found) return found;
  const owner = w.persons[ownerId]!;
  const acc: BankAccount = { id: uid(), saveId: w.save.id, ownerId, currency: countryOf(owner).currency.code, balance: 0 };
  w.accounts[acc.id] = acc;
  return acc;
}

export function addLog(w: World, text: string, tone: LogTone, personId: Id = w.save.currentPlayerId): void {
  const p = w.persons[personId]!;
  const seq = (w.log[w.log.length - 1]?.seq ?? -1) + 1;
  w.log.push({ id: uid(), saveId: w.save.id, seq, personId, age: p.age, year: w.save.year, text, tone });
  w.unsavedLog += 1;
}

export function activeJob(w: World, personId: Id): Employment | undefined {
  return Object.values(w.employments).find((e) => e.personId === personId && e.endedYear === undefined);
}

export function activeEducation(w: World, personId: Id): Education | undefined {
  return Object.values(w.educations).find((e) => e.personId === personId && e.status === 'enrolled');
}

export function hasGraduated(w: World, personId: Id, stage: SchoolStageId, majorIds: Id[] = []): boolean {
  return Object.values(w.educations).some(
    (e) => e.personId === personId && e.stage === stage && e.status === 'graduated'
      && (majorIds.length === 0 || (e.majorId !== undefined && majorIds.includes(e.majorId))),
  );
}

export const STAGE_ORDER: SchoolStageId[] = ['preschool', 'primary', 'middle', 'high', 'university', 'graduate'];

/** Highest graduated stage index, -1 if none. */
export function educationLevel(w: World, personId: Id): number {
  return Math.max(-1, ...Object.values(w.educations)
    .filter((e) => e.personId === personId && e.status === 'graduated')
    .map((e) => STAGE_ORDER.indexOf(e.stage)));
}

export function ownedAssets(w: World, ownerId: Id): Asset[] {
  return Object.values(w.assets).filter((a) => a.ownerId === ownerId);
}

export function netWorth(w: World, ownerId: Id): number {
  const cash = account(w, ownerId).balance;
  return ownedAssets(w, ownerId).reduce((sum, a) => sum + a.value - (a.loan?.remaining ?? 0), cash);
}

/** Records that `key` was used this year; returns false if it was already used. */
export function oncePerYear(flags: Record<string, boolean | number | string>, key: string, year: number): boolean {
  if (flags[key] === year) return false;
  flags[key] = year;
  return true;
}

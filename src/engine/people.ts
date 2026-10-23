import { COUNTRIES, DEFAULT_COUNTRY_CODE } from '../data/countries/index.ts';
import type { CountryConfig, Id, NameBank, PersonEntity, SaveGame, Sex } from '../types/types.ts';
import { generateName, localizePrice } from './localization.ts';
import { chance, pick, pickWeighted, randInt, rollStat, saveRng, type Rng } from './rng.ts';
import { SCHEMA_VERSION, account, addLog, countryOf, fullName, link, uid, type World } from './world.ts';

export interface NewPersonOpts {
  sex?: Sex;
  age: number;
  bank?: NameBank;
  lastName?: string;
  countryCode?: string;
  cityId?: string;
  generation?: number;
}

export function createPerson(w: World, rng: Rng, o: NewPersonOpts): PersonEntity {
  const country = COUNTRIES[o.countryCode ?? DEFAULT_COUNTRY_CODE]!;
  const sex: Sex = o.sex ?? (chance(rng, 0.5) ? 'male' : 'female');
  const name = generateName(country, sex, rng, o.bank, o.lastName);
  const p: PersonEntity = {
    id: uid(),
    saveId: w.save.id,
    firstName: name.firstName,
    lastName: name.lastName,
    sex,
    gender: sex,
    birthYear: w.save.year - o.age,
    age: o.age,
    birthCountry: country.code,
    countryCode: country.code,
    cityId: o.cityId ?? pickWeighted(rng, country.cities, (c) => c.weight)!.id,
    nameBankId: name.nameBankId,
    status: 'alive',
    stats: { health: 60 + randInt(rng, 0, 40), happiness: rollStat(rng), smarts: rollStat(rng), looks: rollStat(rng) },
    hidden: { karma: rollStat(rng), discipline: rollStat(rng), fertility: 40 + randInt(rng, 0, 60), notoriety: 0 },
    personality: { craziness: rollStat(rng), generosity: rollStat(rng), religiousness: rollStat(rng), petulance: rollStat(rng) },
    conditions: [],
    traitIds: [],
    flags: {},
    avatarSeed: Math.floor(rng() * 1e9),
    generation: o.generation ?? 0,
  };
  w.persons[p.id] = p;
  return p;
}

export const bankOf = (c: CountryConfig, id: Id): NameBank => c.nameBanks.find((b) => b.id === id) ?? c.nameBanks[0]!;

/** Family name a child inherits under the bank's surname rule. */
export function inheritedLastName(bank: NameBank, father?: PersonEntity, mother?: PersonEntity): string | undefined {
  if (bank.surnameRule === 'paternal') return father?.lastName;
  if (bank.surnameRule === 'maternal') return mother?.lastName;
  return undefined;
}

/** Fertility after the biological age curve, 0..1. */
export function effectiveFertility(p: PersonEntity): number {
  const base = p.hidden.fertility / 100;
  if (p.sex === 'female') {
    if (p.age < 16 || p.age > 50) return 0;
    if (p.age <= 30) return base;
    return base * Math.max(0, 1 - ((p.age - 30) / 20) ** 1.5);
  }
  if (p.age < 16) return 0;
  return base * Math.max(0.15, 1 - Math.max(0, p.age - 40) / 50);
}

/** Creates a newborn child of `parentA` (+ optional `parentB`) and links the family. */
export function createChild(w: World, rng: Rng, parentA: PersonEntity, parentB?: PersonEntity): PersonEntity {
  const country = countryOf(parentA);
  const bank = bankOf(country, parentA.nameBankId);
  const father = [parentA, parentB].find((p) => p?.sex === 'male');
  const mother = [parentA, parentB].find((p) => p?.sex === 'female');
  const child = createPerson(w, rng, {
    age: 0, bank, lastName: inheritedLastName(bank, father, mother), countryCode: parentA.countryCode,
    cityId: parentA.cityId, generation: parentA.generation + 1,
  });
  for (const parent of [parentA, parentB]) {
    if (parent) link(w, parent.id, child.id, 'child', 'parent', 85);
  }
  // Siblings: other living children of the same parents.
  const siblings = Object.values(w.relationships)
    .filter((r) => r.fromId === parentA.id && r.type === 'child' && r.toId !== child.id && r.endedYear === undefined)
    .map((r) => r.toId);
  for (const sid of siblings) link(w, child.id, sid, 'sibling', 'sibling', 60);
  return child;
}

/** A brand-new life: player born into a family in the default country. */
export function createWorld(seed: number): World {
  const save: SaveGame = {
    id: uid(), createdAt: Date.now(), updatedAt: Date.now(), schemaVersion: SCHEMA_VERSION, rngState: seed | 0,
    year: new Date().getFullYear(), currentPlayerId: '', lineage: [], eventHistory: {}, scheduledEvents: [],
  };
  const w: World = { save, persons: {}, relationships: {}, employments: {}, educations: {}, assets: {}, accounts: {}, log: [], unsavedLog: 0 };
  const rng = saveRng(save);

  const country = COUNTRIES[DEFAULT_COUNTRY_CODE]!;
  const bank = pickWeighted(rng, country.nameBanks, (b) => b.weight)!;
  const cityId = pickWeighted(rng, country.cities, (c) => c.weight)!.id;
  const father = createPerson(w, rng, { sex: 'male', age: randInt(rng, 23, 42), bank, cityId });
  const mother = createPerson(w, rng, {
    sex: 'female', age: randInt(rng, 20, 38), bank: chance(rng, 0.8) ? bank : pick(rng, country.nameBanks), cityId,
  });
  link(w, father.id, mother.id, 'spouse', 'spouse', 50 + randInt(rng, 0, 40));
  for (const parent of [father, mother]) {
    account(w, parent.id).balance = localizePrice(randInt(rng, 500, 20_000), country);
  }
  // Older siblings, sometimes.
  const olderSiblings = chance(rng, 0.5) ? randInt(rng, 1, 2) : 0;
  for (let i = 0; i < olderSiblings; i++) {
    const sib = createChild(w, rng, father, mother);
    sib.age = randInt(rng, 1, Math.min(12, mother.age - 18));
    sib.birthYear = save.year - sib.age;
  }

  const hero = createChild(w, rng, father, mother);
  save.currentPlayerId = hero.id;
  save.lineage = [hero.id];
  account(w, hero.id);

  const city = country.cities.find((c) => c.id === cityId)!.name;
  const sexWord = hero.sex === 'male' ? 'laki-laki' : 'perempuan';
  addLog(w, `Aku lahir sebagai ${sexWord} di ${city}, ${country.name}. Namaku ${fullName(hero)}.`, 'neutral');
  addLog(w, `Ayahku ${fullName(father)} (${father.age}), ibuku ${fullName(mother)} (${mother.age}).`, 'neutral');
  return w;
}

/**
 * Master schema for the life-simulator engine (React + TypeScript + Dexie/IndexedDB).
 *
 * Design rules
 *  - All ids are strings (uuid or content slug) so Dexie can index them directly.
 *  - Static game content ("pools", scenarios, catalogs) is separate from per-save state.
 *  - Each module in FEATURE_MAP.md owns one section here; modules can be built independently.
 *  - Money is stored as integer minor units (cents) to avoid float drift.
 */

// ───────────────────────────── 0. Primitives ─────────────────────────────
export type Id = string;
export type Cents = number;
export type Percent = number; // 0..100
export type Year = number;

export type StatKey = 'health' | 'happiness' | 'smarts' | 'looks' | 'karma' | 'fame' | 'notoriety';
export type Stats = Record<StatKey, Percent>;

export type Gender = 'male' | 'female' | 'nonbinary';
export type Country = { id: Id; name: string; politicalSystem: 'democracy' | 'monarchy' | 'republic' | 'other'; currency: string };

// ───────────────────────── 1. Core Stats & Character ─────────────────────────
export interface Appearance {
  skinTone: number;
  hair: string;
  eyes: string;
  accessories: Id[]; // headwear, mask, sunglasses…
  surgeries: Id[];
}

export interface Person {
  id: Id;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthYear: Year;
  birthCountryId: Id;
  alive: boolean;
  deathYear?: Year;
  deathCauseId?: Id;
  stats: Stats;
  appearance: Appearance;
  traitIds: Id[];
}

export interface Hero extends Person {
  saveId: Id;
  age: number;
  cityId: Id;
  cash: Cents;
  // module state hung off the hero; every field optional so modules stay independent
  education?: EducationState;
  employment?: EmploymentState;
  specialCareers?: SpecialCareerState[];
  assets?: AssetsState;
  relationships?: RelationshipsState;
  health?: HealthState;
  legal?: LegalState;
  flags: Record<string, boolean | number | string>;
}

// ───────────────────────────── 2. Education ─────────────────────────────
export type SchoolLevel = 'preschool' | 'elementary' | 'middle' | 'high' | 'college' | 'graduate';

export interface EducationState {
  level: SchoolLevel;
  schoolName: string;
  gpa: number; // 0..4
  grades: Percent;
  cliqueId?: Id;
  fraternityId?: Id;
  degrees: { majorId: Id; level: SchoolLevel; year: Year }[];
  licenses: { kind: 'car' | 'boat' | 'plane'; passedYear: Year }[];
  disciplineRecord: { year: Year; kind: string }[];
}

// ─────────────────────── 3. Careers (standard + special) ───────────────────────
export interface CareerDef {
  id: Id;
  title: string;
  field: string;
  minEducation: SchoolLevel;
  ladder: { rank: number; title: string; salary: Cents }[];
  requirements?: Condition[];
}

export interface EmploymentState {
  careerId: Id;
  rank: number;
  salary: Cents;
  performance: Percent;
  yearsAtJob: number;
  coworkerIds: Id[];
  partTimeJobId?: Id;
  military?: { rankId: Id; deployed: boolean };
}

/** Discriminated union: one state shape per active career module. */
export type SpecialCareerState =
  | ActorCareer
  | MusicCareer
  | SportsCareer
  | BusinessCareer
  | PoliticianCareer
  | LandlordCareer
  | MafiaCareer
  | AstronautCareer
  | RoyalCareer
  | HustlerCareer
  | InfluencerCareer;

interface CareerBase {
  kind: string;
  startedYear: Year;
  level: number;
  reputation: Percent;
}

export interface ActorCareer extends CareerBase {
  kind: 'actor';
  agentId?: Id;
  filmography: { titleId: Id; genre: string; role: string; year: Year; boxOffice?: Cents; criticScore?: Percent }[];
  awards: Id[];
}
export interface MusicCareer extends CareerBase {
  kind: 'music';
  bandId?: Id;
  instruments: Id[];
  releases: { id: Id; title: string; genre: string; year: Year; sales: number }[];
  labelId?: Id;
  fans: number;
}
export interface SportsCareer extends CareerBase {
  kind: 'sports';
  sportId: Id;
  teamId?: Id;
  position?: string;
  contract?: { salary: Cents; yearsLeft: number };
  seasonStats: Record<string, number>;
  injuries: { partId: Id; year: Year; weeksOut: number }[];
}
export interface BusinessCareer extends CareerBase {
  kind: 'business';
  companies: { id: Id; name: string; industryId: Id; employees: number; revenue: Cents; expenses: Cents; products: Id[] }[];
}
export interface PoliticianCareer extends CareerBase {
  kind: 'politician';
  partyId?: Id;
  office: string;
  approval: Percent;
  campaign?: { office: string; funds: Cents; issues: Id[] };
  lawsPassed: Id[];
}
export interface LandlordCareer extends CareerBase {
  kind: 'landlord';
  properties: { id: Id; houseId: Id; rent: Cents; tenantIds: Id[]; condition: Percent }[];
  managerId?: Id;
}
export interface MafiaCareer extends CareerBase {
  kind: 'mafia';
  familyId: Id;
  rank: string;
  heat: Percent;
  respect: Percent;
}
export interface AstronautCareer extends CareerBase {
  kind: 'astronaut';
  agencyId: Id;
  rankId: Id;
  missions: { id: Id; destinationId: Id; year: Year; outcome: 'success' | 'partial' | 'failure' }[];
  fitness: Percent;
}
export interface RoyalCareer extends CareerBase {
  kind: 'royal';
  houseId: Id;
  title: string;
  publicApproval: Percent;
}
export interface HustlerCareer extends CareerBase {
  kind: 'hustler';
  streetCred: Percent;
  trade: 'busking' | 'panhandling' | 'scamming' | 'dealing';
  policeHeat: Percent;
}
export interface InfluencerCareer extends CareerBase {
  kind: 'influencer';
  channels: { id: Id; platform: string; followers: number; engagement: Percent }[];
}

// ───────────────────────────── 4. Assets ─────────────────────────────
export interface AssetsState {
  homes: Home[];
  vehicles: Vehicle[];
  aircraft: Vehicle[];
  watercraft: Vehicle[];
  luxury: LuxuryItem[];
  finance: FinanceState;
}

export interface Home {
  id: Id;
  typeId: Id;
  cityId: Id;
  value: Cents;
  mortgage?: Cents;
  condition: Percent;
  rentedOutTo?: Id[];
}

export interface Vehicle {
  id: Id;
  modelId: Id;
  value: Cents;
  condition: Percent;
  parts: Record<string, Percent>;
  loan?: Cents;
}

export interface LuxuryItem {
  id: Id;
  category: 'jewelry' | 'art' | 'antique' | 'collectible' | 'vacation' | 'heirloom';
  name: string;
  value: Cents;
  acquiredYear: Year;
}

export interface FinanceState {
  bank: Cents;
  debts: { id: Id; principal: Cents; rate: number; yearsLeft: number }[];
  holdings: { assetId: Id; kind: 'stock' | 'fund' | 'crypto'; units: number; costBasis: Cents }[];
  advisorId?: Id;
}

// ───────────────────────────── 5. Relationships ─────────────────────────────
export type RelationKind = 'parent' | 'child' | 'sibling' | 'spouse' | 'partner' | 'exPartner' | 'friend' | 'coworker' | 'classmate' | 'enemy';

export interface Relationship {
  personId: Id;
  kind: RelationKind;
  closeness: Percent;
  since: Year;
  flags: string[];
}

export interface Pet {
  id: Id;
  typeId: Id;
  name: string;
  age: number;
  health: Percent;
  bond: Percent;
  diseaseIds: Id[];
}

export interface RelationshipsState {
  people: Relationship[];
  marriage?: { spouseId: Id; year: Year; venueId?: Id; prenup: boolean };
  children: { personId: Id; adopted: boolean; supportOwed?: Cents }[];
  pets: Pet[];
  pregnancy?: { dueInMonths: number; fatherId?: Id; surrogate: boolean };
}

// ───────────────────────────── 6. Crime & Underground ─────────────────────────────
export interface LegalState {
  record: { id: Id; crimeId: Id; year: Year; outcome: 'fled' | 'fined' | 'convicted' | 'acquitted' }[];
  prison?: { facilityId: Id; yearsLeft: number; gangId?: Id; jobId?: Id; paroleEligibleIn: number };
  lawsuits: { id: Id; role: 'plaintiff' | 'defendant'; amount: Cents; status: 'open' | 'won' | 'lost' | 'settled' }[];
  wanted: Percent;
  blackMarketRep: Percent;
}

// ───────────────────────────── 7. Health ─────────────────────────────
export interface HealthState {
  conditions: { diseaseId: Id; since: Year; severity: Percent; treated: boolean }[];
  addictions: { substanceId: Id; level: Percent; sinceYear: Year }[];
  diet?: { dietId: Id; sinceYear: Year };
  injuries: { partId: Id; year: Year; permanent: boolean }[];
}

// ───────────────────────── 8. Events, Scenarios & Traits ─────────────────────────
export type Condition =
  | { op: 'stat'; stat: StatKey; cmp: 'lt' | 'lte' | 'gt' | 'gte' | 'eq'; value: number }
  | { op: 'age'; cmp: 'lt' | 'lte' | 'gt' | 'gte' | 'eq'; value: number }
  | { op: 'flag'; key: string; equals: boolean | number | string }
  | { op: 'hasTrait'; traitId: Id }
  | { op: 'career'; kind: SpecialCareerState['kind'] }
  | { op: 'cash'; cmp: 'lt' | 'gt'; value: Cents }
  | { op: 'all' | 'any'; of: Condition[] }
  | { op: 'not'; of: Condition };

export type Effect =
  | { op: 'statDelta'; stat: StatKey; delta: number }
  | { op: 'cashDelta'; delta: Cents }
  | { op: 'setFlag'; key: string; value: boolean | number | string }
  | { op: 'addTrait'; traitId: Id }
  | { op: 'removeTrait'; traitId: Id }
  | { op: 'addCondition'; diseaseId: Id }
  | { op: 'relationDelta'; personRef: string; delta: number }
  | { op: 'goto'; scenarioId: Id }
  | { op: 'log'; text: string };

export interface Trait {
  id: Id;
  name: string;
  category: 'personality' | 'supernatural' | 'status';
  modifiers: Partial<Record<StatKey, number>>;
}

export interface ScenarioChoice {
  id: Id;
  label: string;
  conditions?: Condition[];
  /** weighted outcomes: the engine rolls one */
  outcomes: { weight: number; text: string; effects: Effect[] }[];
}

export interface Scenario {
  id: Id;
  module: ModuleId;
  prompt: string; // may contain {tokens} filled from a ContentPool
  weight: number;
  conditions: Condition[];
  choices: ScenarioChoice[];
  cooldownYears?: number;
  once?: boolean;
}

/** Reusable text/data lists (names, headlines, excuses, brands…). One pool per kind. */
export interface ContentPool<T = string> {
  id: Id;
  module: ModuleId;
  kind: string;
  entries: { value: T; weight?: number; tags?: string[] }[];
}

export type ModuleId =
  | 'core' | 'education' | 'career'
  | 'actor' | 'astronaut' | 'music' | 'sports' | 'business' | 'politician' | 'mafia' | 'landlord'
  | 'hustler' | 'royal' | 'influencer'
  | 'realEstate' | 'vehicles' | 'aircraft' | 'watercraft' | 'luxury' | 'finance'
  | 'romance' | 'family' | 'pets' | 'friends'
  | 'blackMarket' | 'prison' | 'crime'
  | 'health' | 'events' | 'spiritual' | 'supernatural';

// ───────────────────────────── Save game + Dexie tables ─────────────────────────────
export interface LifeLogEntry {
  id: Id;
  saveId: Id;
  age: number;
  year: Year;
  text: string;
  module: ModuleId;
}

export interface SaveGame {
  id: Id;
  createdAt: number;
  updatedAt: number;
  seed: number; // deterministic RNG
  hero: Hero;
  world: { year: Year; countryId: Id };
  seenScenarioIds: Record<Id, Year>;
  schemaVersion: number;
}

/** Table layout for Dexie. Keep the index strings in db.ts next to these types. */
export interface DbTables {
  saves: SaveGame; // 'id, updatedAt'
  people: Person & { saveId: Id }; // 'id, saveId, [saveId+alive]'
  log: LifeLogEntry; // 'id, [saveId+age], module'
  careers: CareerDef; // 'id, field'
  scenarios: Scenario; // 'id, module'
  pools: ContentPool; // 'id, module, kind'
  traits: Trait; // 'id, category'
}

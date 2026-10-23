/**
 * Core type system for the life simulator (100% client-side, React + Dexie/IndexedDB).
 *
 * Design rules
 *  - Flat entity map: every person, relationship edge, job and asset is its own record keyed by id.
 *    Nothing is nested inside the player, so "continue as child" only swaps `SaveGame.currentPlayerId`.
 *  - All content (countries, careers, events) is plain JSON-compatible data: no functions, no classes.
 *    Formulas are expressed as a small serializable AST (`Formula`) evaluated by the engine.
 *  - Money:
 *      * Stored amounts are integers in the minor unit of a specific currency (`MinorUnits` + `CurrencyCode`).
 *      * Catalog prices/salaries are authored once in international dollars (`IntlDollars`, PPP-based)
 *        and converted per country via `CountryConfig.economy`.
 *      * Country config values (tax brackets, living cost) are authored in local MAJOR units for readability.
 *  - Stats are integers 0..100.
 */

// ───────────────────────────── 0. Primitives ─────────────────────────────
export type Id = string;
/** ISO 3166-1 alpha-2, e.g. 'ID', 'US'. */
export type CountryCode = string;
/** ISO 4217, e.g. 'IDR', 'USD'. */
export type CurrencyCode = string;
/** Integer amount in the minor unit of a currency (cents for USD, rupiah for IDR because minorDigits = 0). */
export type MinorUnits = number;
/** Local major currency units (e.g. 60_000_000 = Rp60 juta). Used only in authored config. */
export type MajorUnits = number;
/** PPP-based international dollars, the single authoring unit for catalog prices and salaries. */
export type IntlDollars = number;
export type Stat = number; // 0..100
export type Probability = number; // 0..1
export type Rate = number; // 0..1, e.g. 0.15 = 15%
export type Age = number;
export type Year = number;

// ───────────────────────────── 1. Country config ─────────────────────────────
export interface CurrencyFormat {
  code: CurrencyCode;
  symbol: string; // 'Rp', '$'
  symbolPosition: 'prefix' | 'suffix';
  /** Space between symbol and number ('Rp 1.000' vs '$1,000'). */
  symbolSpacing: boolean;
  /** Digits of the stored minor unit. IDR = 0 (sen not used in practice), USD = 2. */
  minorDigits: 0 | 2 | 3;
  /** Digits shown in the UI (may be fewer than minorDigits). */
  displayDigits: 0 | 2;
  /** BCP 47 locale used for Intl.NumberFormat (thousands/decimal separators, compact notation). */
  locale: string;
}

export interface CountryEconomy {
  /** Local currency units per 1 USD at market rate. Used to convert cash when emigrating. */
  marketRatePerUsd: number;
  /** Local currency units per 1 international dollar (PPP conversion factor). Scales catalog prices. */
  pppFactor: number;
  /** Relative wage level vs the reference economy (1.0). Scales catalog salaries on top of pppFactor. */
  wageIndex: number;
  /** Annual base cost of living per adult, local major units. */
  baseLivingCostAdult: MajorUnits;
  /** Annual cost per dependent child, local major units. */
  costPerChild: MajorUnits;
  /** Default annual interest rates used for new loans. */
  mortgageRate: Rate;
  carLoanRate: Rate;
}

export interface TaxBracket {
  /** Upper bound of taxable income for this bracket, local major units. `null` = no upper bound. */
  upTo: MajorUnits | null;
  rate: Rate;
}

export interface TaxRules {
  /** Income exempt before brackets apply (PTKP / standard deduction), local major units. */
  incomeAllowance: MajorUnits;
  /** Annual progressive brackets, ordered ascending. Empty array = no income tax. */
  incomeBrackets: TaxBracket[];
  estate: {
    /** Estate value exempt from tax, local major units. */
    exemption: MajorUnits;
    /** Brackets applied to the amount above the exemption. Empty = no estate/inheritance tax. */
    brackets: TaxBracket[];
  };
}

export interface HealthcareRules {
  type: 'free' | 'paid';
  /** Share of treatment cost paid by the patient (0 = fully covered, 1 = fully out of pocket). */
  patientCostShare: Rate;
  /** Mandatory annual premium/contribution, local major units (0 if none). */
  annualPremium: MajorUnits;
}

export type SchoolStageId = 'preschool' | 'primary' | 'middle' | 'high' | 'university' | 'graduate';

export interface SchoolStage {
  id: SchoolStageId;
  /** Local display name, e.g. 'SD', 'Elementary School'. */
  localName: string;
  entryAge: Age;
  durationYears: number;
  compulsory: boolean;
}

export interface LegalMilestones {
  schoolStages: SchoolStage[];
  /** Compulsory education ends after this age. */
  compulsoryEducationUntilAge: Age;
  drivingAge: Age;
  marriage: {
    /** Minimum age to marry at all (with parental consent / dispensation). */
    minimumAge: Age;
    /** Age from which no parental consent is needed. */
    withoutParentalConsentAge: Age;
    sameSexAllowed: boolean;
  };
  drinkingAge: Age;
  /** `null` = gambling (casino) is illegal in this country. */
  gamblingAge: Age | null;
  retirementAge: Age;
}

/**
 * Gompertz mortality: hazard(x) = a * e^(b * x).
 * Annual death probability at age x: q = 1 - exp(-(a / b) * (e^(b(x+1)) - e^(bx))).
 */
export interface MortalityParams {
  gompertzA: number;
  gompertzB: number;
}

export type SurnameRule = 'paternal' | 'maternal' | 'none';

export interface NameBank {
  id: Id;
  /** Ethnic / cultural group label, e.g. 'jawa', 'batak'. */
  group: string;
  /** Relative chance a newborn in this country belongs to this group. */
  weight: number;
  surnameRule: SurnameRule;
  firstNames: { male: string[]; female: string[]; unisex: string[] };
  /** Family names (marga, surname). Empty when surnameRule = 'none'. */
  lastNames: string[];
}

export interface CountryConfig {
  code: CountryCode;
  name: string;
  /** Emoji flag (no image assets). */
  flag: string;
  /** Bumped when the data is revised, so saves can detect stale config. */
  dataVersion: string;
  currency: CurrencyFormat;
  economy: CountryEconomy;
  tax: TaxRules;
  healthcare: HealthcareRules;
  legal: LegalMilestones;
  mortality: MortalityParams;
  nameBanks: NameBank[];
  cities: { id: Id; name: string; weight: number }[];
  /** 0..100: how hard it is to be accepted when emigrating here. */
  immigrationDifficulty: Stat;
}

// ───────────────────────────── 2. Person entity ─────────────────────────────
export type Sex = 'male' | 'female';
export type Gender = 'male' | 'female' | 'nonbinary';

/** Shown to the player as bars. */
export interface VisibleStats {
  health: Stat;
  happiness: Stat;
  smarts: Stat;
  looks: Stat;
}

/** Hidden from the UI; meaningful when this person is (or becomes) the player. */
export interface HiddenStats {
  /** Biases RNG rolls: luck, lottery, disease, verdicts. */
  karma: Stat;
  /** Diet success, addiction resistance, study/work consistency. */
  discipline: Stat;
  /** Base fertility; the effective value is scaled by an age curve in the engine. */
  fertility: Stat;
  /** Fame/fear in prison and criminal circles. */
  notoriety: Stat;
}

/** Hidden personality; drives NPC reactions. Kept on every person so a child can become the player later. */
export interface PersonalityStats {
  craziness: Stat;
  generosity: Stat;
  religiousness: Stat;
  petulance: Stat;
}

export type LifeStatus = 'alive' | 'dead' | 'missing';

export type AvatarStage = 'baby' | 'child' | 'teen' | 'adult' | 'elder';

export interface PersonEntity {
  id: Id;
  saveId: Id;
  firstName: string;
  /** Undefined for naming traditions without a family name. */
  lastName?: string;
  sex: Sex;
  gender: Gender;
  birthYear: Year;
  age: Age;
  birthCountry: CountryCode;
  /** Current residence: drives currency, tax, laws. */
  countryCode: CountryCode;
  cityId: Id;
  nameBankId: Id;
  status: LifeStatus;
  death?: { year: Year; age: Age; causeId: Id };
  stats: VisibleStats;
  hidden: HiddenStats;
  personality: PersonalityStats;
  /** Health conditions: diseaseId -> state. */
  conditions: { diseaseId: Id; sinceYear: Year; severity: Stat; treated: boolean }[];
  traitIds: Id[];
  /** Free-form flags read by event preconditions. */
  flags: Record<string, boolean | number | string>;
  /** Avatar seed for the generated emoji/vector face. */
  avatarSeed: number;
  /** Generation index in the lineage (0 = first character played in this save). */
  generation: number;
  /** Will & testament: who inherits. Empty/undefined = split equally among living children. */
  will?: { beneficiaryIds: Id[] };
}

// ───────────────────────────── 2b. Education ─────────────────────────────
export interface MajorDef {
  id: Id;
  name: string;
}

/** One record per school stage attended (flat, references person). */
export interface Education {
  id: Id;
  saveId: Id;
  personId: Id;
  stage: SchoolStageId;
  institution: string;
  majorId?: Id;
  startedYear: Year;
  endedYear?: Year;
  status: 'enrolled' | 'graduated' | 'dropped';
  /** Current grades 0..100. */
  grades: Stat;
}

// ───────────────────────────── 2c. Health catalog ─────────────────────────────
export interface DiseaseDef {
  id: Id;
  name: string;
  /** Health lost per year while untreated, at severity 50. */
  annualHealthLoss: number;
  curable: boolean;
  /** Treatment price before healthcare cost share, international dollars. */
  treatmentCost: IntlDollars;
  /** Base yearly chance to catch it (scaled by age and karma). */
  baseChance: Probability;
  /** Yearly chance to heal without treatment (0 for chronic diseases). */
  naturalRecovery: Probability;
  minAge: Age;
}

// ───────────────────────────── 3. Relationships (edges) ─────────────────────────────
export type RelationType =
  | 'parent' | 'child' | 'sibling' | 'halfSibling' | 'stepParent' | 'stepChild'
  | 'grandparent' | 'grandchild'
  | 'partner' | 'fiance' | 'spouse' | 'exPartner' | 'exSpouse'
  | 'friend' | 'bestFriend' | 'enemy'
  | 'coworker' | 'boss' | 'classmate' | 'teacher';

/**
 * Directed edge: how `fromId` relates to and feels about `toId`.
 * A pair normally has two edges (A→B 'parent', B→A 'child'), each with its own bar.
 */
export interface Relationship {
  id: Id;
  saveId: Id;
  fromId: Id;
  toId: Id;
  type: RelationType;
  /** Relationship bar shown in the UI, 0..100. */
  bar: Stat;
  sinceYear: Year;
  /** Set when the relationship ended (breakup, divorce, death). */
  endedYear?: Year;
  marriage?: { year: Year; prenup: boolean; venueId?: Id };
  flags: Record<string, boolean | number | string>;
}

export type NpcAction = 'conversation' | 'compliment' | 'insult' | 'spendTime' | 'giveMoney' | 'askForMoney';

// ───────────────────────────── 4. Careers ─────────────────────────────
export type CareerCategory = 'fullTime' | 'partTime' | 'military' | 'politics' | 'special';

export interface CareerRank {
  rank: number;
  title: string;
  /** Annual base salary in international dollars; localized via pppFactor * wageIndex. */
  salary: IntlDollars;
  /** Minimum years in the previous rank before promotion can roll. */
  minYearsBefore: number;
}

export interface CareerDef {
  id: Id;
  category: CareerCategory;
  title: string;
  field: string;
  minEducation: SchoolStageId | null;
  /** Majors accepted when minEducation is university/graduate; empty = any. */
  acceptedMajors: Id[];
  /** Restrict to some countries; empty = available everywhere. */
  countries: CountryCode[];
  minAge: Age;
  ladder: CareerRank[];
  /** Extra requirements (stats, flags, clean record…). */
  requirements: Condition[];
  /** Chance to be hired after applying (evaluates to 0..1). */
  hireChance: Formula;
  /** Annual chance of promotion (0..1). */
  promotionChance: Formula;
  /** Annual chance of being fired (0..1). */
  fireChance: Formula;
}

/** Live employment record (flat, references person + career). */
export interface Employment {
  id: Id;
  saveId: Id;
  personId: Id;
  careerId: Id;
  rank: number;
  /** Actual salary already converted into the employer country's currency. */
  salary: MinorUnits;
  currency: CurrencyCode;
  countryCode: CountryCode;
  performance: Stat;
  yearsInRank: number;
  startedYear: Year;
  endedYear?: Year;
  endReason?: 'quit' | 'fired' | 'retired' | 'laidOff' | 'died';
}

// ───────────────────────────── 5. Assets ─────────────────────────────
export type AssetKind = 'house' | 'car' | 'boat' | 'aircraft' | 'jewelry' | 'collectible';

export interface AssetDef {
  id: Id;
  kind: AssetKind;
  name: string;
  /** Base purchase price in international dollars. */
  basePrice: IntlDollars;
  /** Annual value change (negative = depreciation). */
  annualAppreciation: Rate;
  /** Annual upkeep as a share of current value. */
  upkeepRate: Rate;
  countries: CountryCode[];
}

export interface Loan {
  principal: MinorUnits;
  remaining: MinorUnits;
  annualRate: Rate;
  termYears: number;
  yearsLeft: number;
  /** Fixed annual payment (annuity), computed at origination. */
  annualPayment: MinorUnits;
}

export interface Asset {
  id: Id;
  saveId: Id;
  ownerId: Id;
  defId: Id;
  kind: AssetKind;
  name: string;
  countryCode: CountryCode;
  currency: CurrencyCode;
  purchasePrice: MinorUnits;
  value: MinorUnits;
  condition: Stat;
  purchasedYear: Year;
  loan?: Loan;
  rental?: { tenantId?: Id; annualRent: MinorUnits };
}

export interface BankAccount {
  id: Id;
  saveId: Id;
  ownerId: Id;
  currency: CurrencyCode;
  /** Negative = debt. */
  balance: MinorUnits;
}

// ───────────────────────────── 6. Formulas & conditions ─────────────────────────────
export type StatRef =
  | { stat: keyof VisibleStats }
  | { hidden: keyof HiddenStats }
  | { personality: keyof PersonalityStats };

/** Who a value is read from: the player or a role bound by the event. */
export type Subject = 'player' | { role: string };

/**
 * Serializable expression evaluated by the engine. Examples:
 *   hire chance = clamp(0.2 + smarts/200, 0, 0.95)
 *   { op: 'clamp', min: 0, max: 0.95, of:
 *     { op: 'add', of: [{ op: 'const', value: 0.2 }, { op: 'mul', of: [{ op: 'ref', ref: { stat: 'smarts' } }, { op: 'const', value: 0.005 }] }] } }
 */
export type Formula =
  | { op: 'const'; value: number }
  | { op: 'ref'; ref: StatRef; subject?: Subject }
  | { op: 'age'; subject?: Subject }
  | { op: 'relationBar'; role: string }
  /** Current job performance of the player (0 if unemployed). */
  | { op: 'jobPerformance' }
  | { op: 'flag'; key: string; subject?: Subject } // numeric flag, 0 if missing
  | { op: 'add' | 'mul' | 'min' | 'max'; of: Formula[] }
  | { op: 'sub' | 'div'; a: Formula; b: Formula }
  | { op: 'clamp'; of: Formula; min: number; max: number }
  /** 1 / (1 + e^(-k(x - mid))): smooth 0..1 curve, handy for stat-driven odds. */
  | { op: 'logistic'; x: Formula; mid: number; k: number }
  /** Shift a probability by karma: p + (karma - 50) * strength / 100, clamped 0..1. */
  | { op: 'karmaBias'; p: Formula; strength: number }
  | { op: 'if'; cond: Condition; then: Formula; else: Formula };

export type Cmp = 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq';

export type Condition =
  | { op: 'cmp'; left: Formula; cmp: Cmp; right: Formula }
  | { op: 'flag'; key: string; equals: boolean | number | string; subject?: Subject }
  | { op: 'hasTrait'; traitId: Id; subject?: Subject }
  | { op: 'hasCondition'; diseaseId: Id }
  | { op: 'employed'; category?: CareerCategory }
  | { op: 'inSchool'; stage?: SchoolStageId }
  | { op: 'country'; in: CountryCode[] }
  | { op: 'legalAge'; milestone: 'driving' | 'marriage' | 'marriageNoConsent' | 'drinking' | 'gambling' | 'retirement' }
  | { op: 'balance'; cmp: Cmp; value: IntlDollars }
  | { op: 'all' | 'any'; of: Condition[] }
  | { op: 'not'; of: Condition };

// ───────────────────────────── 7. Events ─────────────────────────────
export type LogTone = 'positive' | 'negative' | 'neutral' | 'death';

/** How an event binds an NPC to a role, e.g. `{mother}` in text. */
export interface RoleSelector {
  role: string;
  relation: RelationType[];
  alive?: boolean;
  sex?: Sex;
  /** Extra filter evaluated with this NPC as `{ role }` subject. */
  where?: Condition[];
  /** If no NPC matches, the event is not eligible. */
  required: boolean;
}

export type Effect =
  | { op: 'stat'; ref: StatRef; delta: Formula; subject?: Subject }
  /** Amount authored in international dollars; scaled by the player's country. */
  | { op: 'money'; amount: Formula; scale: 'price' | 'wage' }
  | { op: 'relationBar'; role: string; delta: Formula }
  | { op: 'setFlag'; key: string; value: boolean | number | string; subject?: Subject }
  | { op: 'addTrait' | 'removeTrait'; traitId: Id; subject?: Subject }
  | { op: 'addCondition'; diseaseId: Id; severity: number }
  | { op: 'endRelationship'; role: string; reason: 'breakup' | 'divorce' }
  | { op: 'loseJob'; reason: 'fired' | 'laidOff' }
  | { op: 'die'; causeId: Id }
  | { op: 'chain'; eventId: Id; delayYears: number };

export interface EventOutcome {
  id: Id;
  /** Relative weight; evaluated at roll time so stats/karma can shift the odds. */
  weight: Formula;
  /** Log text with tokens: {player.firstName}, {mother.firstName}, {money:amount}. */
  text: string;
  tone: LogTone;
  effects: Effect[];
}

export interface EventChoice {
  id: Id;
  label: string;
  /** Hide the choice unless all pass. */
  conditions?: Condition[];
  outcomes: [EventOutcome, ...EventOutcome[]];
}

/** 2–4 choices; the modal cannot be dismissed without picking one. */
export type EventChoices =
  | [EventChoice, EventChoice]
  | [EventChoice, EventChoice, EventChoice]
  | [EventChoice, EventChoice, EventChoice, EventChoice];

export interface EventPreconditions {
  minAge: Age;
  maxAge: Age;
  /** Empty = all countries. */
  countries: CountryCode[];
  excludeCountries: CountryCode[];
  requiredFlags: Record<string, boolean | number | string>;
  forbiddenFlags: string[];
  conditions: Condition[];
}

export interface GameEvent {
  id: Id;
  module: string;
  /** Text shown in the modal, with tokens. */
  prompt: string;
  roles: RoleSelector[];
  pre: EventPreconditions;
  /** Base selection weight, can depend on stats. */
  weight: Formula;
  /** Years before it can fire again; 0 = no cooldown. */
  cooldownYears: number;
  once: boolean;
  choices: EventChoices;
}

// ───────────────────────────── 8. Save game & log ─────────────────────────────
export interface LogEntry {
  id: Id;
  saveId: Id;
  /** Monotonic order within the save. */
  seq: number;
  personId: Id;
  age: Age;
  year: Year;
  text: string;
  tone: LogTone;
}

export interface SaveGame {
  id: Id;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
  /** RNG state, advanced and persisted after every roll (prevents refresh exploits). */
  rngState: number;
  year: Year;
  currentPlayerId: Id;
  /** Ordered list of characters played in this save (lineage for "continue as child"). */
  lineage: Id[];
  /** eventId -> last year it fired. */
  eventHistory: Record<Id, Year>;
  /** Event awaiting a choice; restored after reload so the modal cannot be skipped. */
  pendingEvent?: { eventId: Id; roleBindings: Record<string, Id> };
  /** Chained events scheduled for a future year. */
  scheduledEvents: { eventId: Id; year: Year }[];
}

/**
 * Dexie tables (save state only). Static content (countries, careers, events…) ships in the JS bundle,
 * which the service worker caches for offline play, so it never goes stale inside IndexedDB.
 * Index strings live in db.ts.
 */
export interface DbTables {
  saves: SaveGame;
  persons: PersonEntity;
  relationships: Relationship;
  employments: Employment;
  educations: Education;
  assets: Asset;
  accounts: BankAccount;
  log: LogEntry;
}

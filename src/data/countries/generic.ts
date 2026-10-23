import type { CountryConfig } from '../../types/types.ts';

/**
 * Generic world used as the single active country in phase 1: USD money, US-style number format,
 * Indonesian-language labels. All rules and figures are invented for gameplay balance, not taken
 * from any real country. Real-country configs (id.ts, us.ts) are switched on in a later phase.
 */
export const GENERIC_WORLD: CountryConfig = {
  code: 'ZZ', // ISO 3166 user-assigned code, never collides with a real country
  name: 'Dunia',
  flag: '🌐',
  dataVersion: '2026.1',
  currency: {
    code: 'USD',
    symbol: '$',
    symbolPosition: 'prefix',
    symbolSpacing: false,
    minorDigits: 2,
    displayDigits: 0,
    locale: 'en-US',
  },
  economy: {
    marketRatePerUsd: 1,
    pppFactor: 1,
    wageIndex: 1,
    baseLivingCostAdult: 20_000,
    costPerChild: 10_000,
    mortgageRate: 0.06,
    carLoanRate: 0.07,
  },
  tax: {
    incomeAllowance: 10_000,
    incomeBrackets: [
      { upTo: 40_000, rate: 0.1 },
      { upTo: 100_000, rate: 0.2 },
      { upTo: 250_000, rate: 0.3 },
      { upTo: null, rate: 0.4 },
    ],
    estate: { exemption: 1_000_000, brackets: [{ upTo: null, rate: 0.2 }] },
  },
  healthcare: {
    type: 'paid',
    patientCostShare: 0.5,
    annualPremium: 0,
  },
  legal: {
    schoolStages: [
      { id: 'preschool', localName: 'TK', entryAge: 5, durationYears: 1, compulsory: false },
      { id: 'primary', localName: 'SD', entryAge: 6, durationYears: 6, compulsory: true },
      { id: 'middle', localName: 'SMP', entryAge: 12, durationYears: 3, compulsory: true },
      { id: 'high', localName: 'SMA', entryAge: 15, durationYears: 3, compulsory: true },
      { id: 'university', localName: 'Kuliah', entryAge: 18, durationYears: 4, compulsory: false },
      { id: 'graduate', localName: 'Pascasarjana', entryAge: 22, durationYears: 2, compulsory: false },
    ],
    compulsoryEducationUntilAge: 17,
    drivingAge: 17,
    marriage: { minimumAge: 18, withoutParentalConsentAge: 18, sameSexAllowed: true },
    drinkingAge: 18,
    gamblingAge: 18,
    retirementAge: 65,
  },
  mortality: { gompertzA: 6.0e-5, gompertzB: 0.088 },
  nameBanks: [
    {
      id: 'zz-neutral',
      group: 'netral',
      weight: 1,
      surnameRule: 'paternal',
      firstNames: {
        male: ['Adam', 'Daniel', 'Leo', 'Noah', 'Ryan', 'Adrian', 'Kevin', 'Marco', 'Rafael', 'Victor'],
        female: ['Nina', 'Maya', 'Sara', 'Lina', 'Clara', 'Diana', 'Elena', 'Mira', 'Laura', 'Vera'],
        unisex: ['Alex', 'Sam', 'Robin', 'Kai'],
      },
      lastNames: ['Hart', 'Stone', 'Rivers', 'Lane', 'Brook', 'Fields', 'Moreno', 'Varga', 'Kovac', 'Lind'],
    },
  ],
  cities: [
    { id: 'zz-teluk-biru', name: 'Teluk Biru', weight: 5 },
    { id: 'zz-bukit-hijau', name: 'Bukit Hijau', weight: 4 },
    { id: 'zz-kota-lama', name: 'Kota Lama', weight: 4 },
    { id: 'zz-sumber-jaya', name: 'Sumber Jaya', weight: 3 },
    { id: 'zz-lembah-mas', name: 'Lembah Mas', weight: 2 },
    { id: 'zz-pantai-indah', name: 'Pantai Indah', weight: 2 },
  ],
  immigrationDifficulty: 0,
};

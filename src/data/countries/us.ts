import type { CountryConfig } from '../../types/types.ts';

/**
 * United States. Federal rules only; state taxes and state-specific ages are simplified away.
 * Figures are real-world approximations for gameplay (data year 2026), not legal advice.
 * Re-check before release: IRS 2026 single-filer brackets and standard deduction, federal estate
 * exemption, SSA full retirement age (67 for those born 1960+).
 */
export const UNITED_STATES: CountryConfig = {
  code: 'US',
  name: 'United States',
  flag: '🇺🇸',
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
    pppFactor: 1, // reference economy
    wageIndex: 1,
    baseLivingCostAdult: 24_000,
    costPerChild: 12_000,
    mortgageRate: 0.065,
    carLoanRate: 0.07,
  },
  tax: {
    incomeAllowance: 16_100, // standard deduction, single
    incomeBrackets: [
      { upTo: 12_400, rate: 0.1 },
      { upTo: 50_400, rate: 0.12 },
      { upTo: 105_700, rate: 0.22 },
      { upTo: 201_775, rate: 0.24 },
      { upTo: 256_225, rate: 0.32 },
      { upTo: 640_600, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    estate: { exemption: 15_000_000, brackets: [{ upTo: null, rate: 0.4 }] },
  },
  healthcare: {
    type: 'paid', // treatment drains the bank account
    patientCostShare: 0.4, // abstracts typical private insurance; 1.0 would model being uninsured
    annualPremium: 0, // folded into baseLivingCostAdult
  },
  legal: {
    schoolStages: [
      { id: 'preschool', localName: 'Kindergarten', entryAge: 5, durationYears: 1, compulsory: false },
      { id: 'primary', localName: 'Elementary School', entryAge: 6, durationYears: 5, compulsory: true },
      { id: 'middle', localName: 'Middle School', entryAge: 11, durationYears: 3, compulsory: true },
      { id: 'high', localName: 'High School', entryAge: 14, durationYears: 4, compulsory: true },
      { id: 'university', localName: 'College', entryAge: 18, durationYears: 4, compulsory: false },
      { id: 'graduate', localName: 'Graduate School', entryAge: 22, durationYears: 2, compulsory: false },
    ],
    compulsoryEducationUntilAge: 17, // varies 16–18 by state
    drivingAge: 16,
    marriage: { minimumAge: 18, withoutParentalConsentAge: 18, sameSexAllowed: true },
    drinkingAge: 21,
    gamblingAge: 21,
    retirementAge: 67,
  },
  mortality: { gompertzA: 4.3e-5, gompertzB: 0.09 },
  nameBanks: [
    {
      id: 'us-general',
      group: 'general',
      weight: 75,
      surnameRule: 'paternal',
      firstNames: {
        male: ['James', 'Michael', 'Ethan', 'Noah', 'Daniel', 'Ryan', 'Tyler', 'Brandon', 'Jacob', 'Austin'],
        female: ['Emily', 'Olivia', 'Madison', 'Ashley', 'Hannah', 'Megan', 'Lauren', 'Chloe', 'Sarah', 'Abigail'],
        unisex: ['Jordan', 'Taylor', 'Casey', 'Riley'],
      },
      lastNames: ['Smith', 'Johnson', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Thompson', 'Moore', 'Clark', 'Walker'],
    },
    {
      id: 'us-hispanic',
      group: 'hispanic',
      weight: 19,
      surnameRule: 'paternal',
      firstNames: {
        male: ['Carlos', 'Luis', 'Miguel', 'Diego', 'Javier', 'Mateo', 'Alejandro'],
        female: ['Sofia', 'Valeria', 'Camila', 'Isabella', 'Lucia', 'Gabriela', 'Daniela'],
        unisex: ['Guadalupe'],
      },
      lastNames: ['Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Ramirez', 'Torres'],
    },
  ],
  cities: [
    { id: 'us-new-york', name: 'New York', weight: 10 },
    { id: 'us-los-angeles', name: 'Los Angeles', weight: 8 },
    { id: 'us-chicago', name: 'Chicago', weight: 5 },
    { id: 'us-houston', name: 'Houston', weight: 5 },
    { id: 'us-phoenix', name: 'Phoenix', weight: 3 },
    { id: 'us-atlanta', name: 'Atlanta', weight: 3 },
    { id: 'us-seattle', name: 'Seattle', weight: 2 },
    { id: 'us-miami', name: 'Miami', weight: 2 },
  ],
  immigrationDifficulty: 75,
};

import type { CountryConfig } from '../../types/types.ts';

/**
 * Indonesia. Figures are real-world approximations for gameplay (data year 2026), not legal advice.
 * Sources to re-check before release: UU HPP 2021 (PPh 21 brackets, PTKP), UU 16/2019 (marriage age),
 * UU 20/2003 (wajib belajar 9 tahun), PP 45/2015 (pension age +1 every 3 years), JKN contribution rates.
 */
export const INDONESIA: CountryConfig = {
  code: 'ID',
  name: 'Indonesia',
  flag: '🇮🇩',
  dataVersion: '2026.1',
  currency: {
    code: 'IDR',
    symbol: 'Rp',
    symbolPosition: 'prefix',
    symbolSpacing: false,
    minorDigits: 0, // sen is not used in practice; keeps billionaire balances far below 2^53
    displayDigits: 0,
    locale: 'id-ID',
  },
  economy: {
    marketRatePerUsd: 16_500,
    pppFactor: 5_000,
    wageIndex: 0.15,
    baseLivingCostAdult: 30_000_000,
    costPerChild: 12_000_000,
    mortgageRate: 0.09,
    carLoanRate: 0.07,
  },
  tax: {
    incomeAllowance: 54_000_000, // PTKP, single without dependents
    incomeBrackets: [
      { upTo: 60_000_000, rate: 0.05 },
      { upTo: 250_000_000, rate: 0.15 },
      { upTo: 500_000_000, rate: 0.25 },
      { upTo: 5_000_000_000, rate: 0.3 },
      { upTo: null, rate: 0.35 },
    ],
    estate: { exemption: 0, brackets: [] }, // no inheritance tax for direct-line heirs
  },
  healthcare: {
    type: 'free', // JKN/BPJS: covered by the state scheme with a small contribution
    patientCostShare: 0.1,
    annualPremium: 420_000,
  },
  legal: {
    schoolStages: [
      { id: 'preschool', localName: 'TK', entryAge: 5, durationYears: 2, compulsory: false },
      { id: 'primary', localName: 'SD', entryAge: 7, durationYears: 6, compulsory: true },
      { id: 'middle', localName: 'SMP', entryAge: 13, durationYears: 3, compulsory: true },
      { id: 'high', localName: 'SMA/SMK', entryAge: 16, durationYears: 3, compulsory: false },
      { id: 'university', localName: 'S1', entryAge: 19, durationYears: 4, compulsory: false },
      { id: 'graduate', localName: 'S2', entryAge: 23, durationYears: 2, compulsory: false },
    ],
    compulsoryEducationUntilAge: 15,
    drivingAge: 17,
    marriage: { minimumAge: 19, withoutParentalConsentAge: 21, sameSexAllowed: false },
    drinkingAge: 21,
    gamblingAge: null, // gambling is illegal
    retirementAge: 59,
  },
  mortality: { gompertzA: 1.0e-4, gompertzB: 0.085 },
  nameBanks: [
    {
      id: 'id-jawa',
      group: 'jawa',
      weight: 40,
      surnameRule: 'none',
      firstNames: {
        male: ['Budi', 'Agus', 'Joko', 'Bambang', 'Wahyu', 'Teguh', 'Slamet', 'Dimas', 'Aditya', 'Rizky'],
        female: ['Sri', 'Siti', 'Dewi', 'Endang', 'Ratna', 'Wulan', 'Ayu', 'Putri', 'Lestari', 'Rahayu'],
        unisex: ['Tri', 'Eka', 'Dwi'],
      },
      lastNames: [],
    },
    {
      id: 'id-sunda',
      group: 'sunda',
      weight: 16,
      surnameRule: 'none',
      firstNames: {
        male: ['Asep', 'Ujang', 'Dadang', 'Cecep', 'Yayan', 'Ridwan', 'Iwan', 'Dede'],
        female: ['Euis', 'Neneng', 'Imas', 'Cucu', 'Lilis', 'Nining', 'Yanti', 'Rina'],
        unisex: ['Dede'],
      },
      lastNames: [],
    },
    {
      id: 'id-batak',
      group: 'batak',
      weight: 4,
      surnameRule: 'paternal',
      firstNames: {
        male: ['Togar', 'Martua', 'Parlindungan', 'Hotman', 'Rudolf', 'Bonar', 'Sahat'],
        female: ['Rosmauli', 'Tiurma', 'Lamria', 'Rotua', 'Mariana', 'Hotnida'],
        unisex: [],
      },
      lastNames: ['Siregar', 'Nasution', 'Simanjuntak', 'Hutapea', 'Lubis', 'Sitompul', 'Panjaitan', 'Sinaga'],
    },
    {
      id: 'id-tionghoa',
      group: 'tionghoa',
      weight: 3,
      surnameRule: 'paternal',
      firstNames: {
        male: ['Hendra', 'Willy', 'Kevin', 'Steven', 'Rudy', 'Jonathan', 'Felix'],
        female: ['Lina', 'Melinda', 'Cynthia', 'Jessica', 'Vivian', 'Stephanie', 'Fransiska'],
        unisex: [],
      },
      lastNames: ['Wijaya', 'Gunawan', 'Halim', 'Santoso', 'Tanuwijaya', 'Salim', 'Kurniawan'],
    },
  ],
  cities: [
    { id: 'id-jakarta', name: 'Jakarta', weight: 10 },
    { id: 'id-surabaya', name: 'Surabaya', weight: 6 },
    { id: 'id-bandung', name: 'Bandung', weight: 5 },
    { id: 'id-medan', name: 'Medan', weight: 5 },
    { id: 'id-semarang', name: 'Semarang', weight: 3 },
    { id: 'id-makassar', name: 'Makassar', weight: 3 },
    { id: 'id-yogyakarta', name: 'Yogyakarta', weight: 2 },
    { id: 'id-denpasar', name: 'Denpasar', weight: 2 },
  ],
  immigrationDifficulty: 60,
};

// Proof that one set of catalog values localizes per country.
// Run: node scripts/demo-localization.ts
import { COUNTRIES } from '../src/data/countries/index.ts';
import {
  estateTax, formatMoney, generateName, gompertzDeathProbability, incomeTax, localizePrice, localizeSalary,
} from '../src/engine/localization.ts';

// Same authored catalog values for both countries (international dollars).
const SALARY_SOFTWARE_ENGINEER = 90_000;
const PRICE_COMPACT_CAR = 25_000;
const ESTATE_INTL = 20_000_000;

// Small deterministic RNG so the output is reproducible.
let seed = 42;
const rng = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31);

for (const c of Object.values(COUNTRIES)) {
  const salary = localizeSalary(SALARY_SOFTWARE_ENGINEER, c);
  const tax = incomeTax(salary, c);
  const estate = localizePrice(ESTATE_INTL, c);
  const names = Array.from({ length: 4 }, (_, i) => {
    const n = generateName(c, i % 2 ? 'female' : 'male', rng);
    return [n.firstName, n.lastName].filter(Boolean).join(' ');
  });

  console.log(`\n${c.flag} ${c.name} (${c.currency.code})`);
  console.log(`  Gaji software engineer : ${formatMoney(salary, c)} / tahun`);
  console.log(`  Pajak penghasilan      : ${formatMoney(tax, c)}  → bersih ${formatMoney(salary - tax, c)}`);
  console.log(`  Biaya hidup dewasa     : ${formatMoney(c.economy.baseLivingCostAdult * 10 ** c.currency.minorDigits, c)} / tahun`);
  console.log(`  Harga mobil kompak     : ${formatMoney(localizePrice(PRICE_COMPACT_CAR, c), c)}`);
  console.log(`  Pajak warisan (estate ${formatMoney(estate, c)}): ${formatMoney(estateTax(estate, c), c)}`);
  console.log(`  Kesehatan              : ${c.healthcare.type}, pasien bayar ${c.healthcare.patientCostShare * 100}%`);
  console.log(`  Usia SIM/nikah tanpa izin/alkohol/judi/pensiun: ${c.legal.drivingAge}/${c.legal.marriage.withoutParentalConsentAge}/${c.legal.drinkingAge}/${c.legal.gamblingAge ?? 'ilegal'}/${c.legal.retirementAge}`);
  console.log(`  Sekolah: ${c.legal.schoolStages.map((s) => `${s.localName}@${s.entryAge}`).join(', ')}`);
  console.log(`  Peluang meninggal usia 70 / 85: ${(gompertzDeathProbability(70, c.mortality) * 100).toFixed(1)}% / ${(gompertzDeathProbability(85, c.mortality) * 100).toFixed(1)}%`);
  console.log(`  Contoh nama: ${names.join(', ')}`);
}

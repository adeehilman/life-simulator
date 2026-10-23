import type {
  CountryConfig, IntlDollars, MajorUnits, MinorUnits, MortalityParams, NameBank, Sex, TaxBracket,
} from '../types/types.ts';

import type { Rng } from './rng.ts';

const scale = (c: CountryConfig) => 10 ** c.currency.minorDigits;

export const toMinor = (major: MajorUnits, c: CountryConfig): MinorUnits => Math.round(major * scale(c));
export const toMajor = (minor: MinorUnits, c: CountryConfig): MajorUnits => minor / scale(c);

/** Catalog price (international dollars) -> local currency, PPP-adjusted. */
export const localizePrice = (price: IntlDollars, c: CountryConfig): MinorUnits =>
  toMinor(price * c.economy.pppFactor, c);

/** Catalog salary (international dollars) -> local currency, PPP and wage-level adjusted. */
export const localizeSalary = (salary: IntlDollars, c: CountryConfig): MinorUnits =>
  toMinor(salary * c.economy.pppFactor * c.economy.wageIndex, c);

/** Cash conversion at market rate, used when emigrating. */
export const convertCurrency = (amount: MinorUnits, from: CountryConfig, to: CountryConfig): MinorUnits =>
  toMinor((toMajor(amount, from) / from.economy.marketRatePerUsd) * to.economy.marketRatePerUsd, to);

export function formatMoney(amount: MinorUnits, c: CountryConfig): string {
  const { symbol, symbolPosition, symbolSpacing, displayDigits, locale } = c.currency;
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: displayDigits,
    maximumFractionDigits: displayDigits,
  }).format(Math.abs(toMajor(amount, c)));
  const gap = symbolSpacing ? ' ' : '';
  const body = symbolPosition === 'prefix' ? `${symbol}${gap}${number}` : `${number}${gap}${symbol}`;
  return amount < 0 ? `-${body}` : body;
}

/** Tax on `taxable` (major units) through ascending progressive brackets. */
export function progressiveTax(taxable: MajorUnits, brackets: TaxBracket[]): MajorUnits {
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of brackets) {
    if (taxable <= lower) break;
    const top = upTo === null ? taxable : Math.min(taxable, upTo);
    tax += (top - lower) * rate;
    if (upTo === null) break;
    lower = upTo;
  }
  return tax;
}

export function incomeTax(grossAnnual: MinorUnits, c: CountryConfig): MinorUnits {
  const taxable = Math.max(0, toMajor(grossAnnual, c) - c.tax.incomeAllowance);
  return toMinor(progressiveTax(taxable, c.tax.incomeBrackets), c);
}

export function estateTax(estate: MinorUnits, c: CountryConfig): MinorUnits {
  const taxable = Math.max(0, toMajor(estate, c) - c.tax.estate.exemption);
  return toMinor(progressiveTax(taxable, c.tax.estate.brackets), c);
}

/** Probability of dying within the next year at `age` (Gompertz). Karma adjustment is applied by the engine. */
export function gompertzDeathProbability(age: number, { gompertzA: a, gompertzB: b }: MortalityParams): number {
  const cumulativeHazard = (a / b) * (Math.exp(b * (age + 1)) - Math.exp(b * age));
  return 1 - Math.exp(-cumulativeHazard);
}

function pickWeighted<T>(items: T[], weight: (item: T) => number, rng: Rng): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1]!;
}

const pick = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)]!;

/**
 * Random local name. `bank` and `inheritedLastName` let the engine keep families consistent
 * (a child takes the parent's bank and, for paternal/maternal rules, the parent's family name).
 */
export function generateName(
  c: CountryConfig,
  sex: Sex,
  rng: Rng,
  bank: NameBank = pickWeighted(c.nameBanks, (b) => b.weight, rng),
  inheritedLastName?: string,
): { firstName: string; lastName?: string; nameBankId: string } {
  const firstName = pick([...bank.firstNames[sex], ...bank.firstNames.unisex], rng);
  const lastName = bank.surnameRule === 'none' ? undefined : inheritedLastName ?? pick(bank.lastNames, rng);
  return { firstName, lastName, nameBankId: bank.id };
}

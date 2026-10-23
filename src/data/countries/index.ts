import type { CountryCode, CountryConfig } from '../../types/types.ts';
import { GENERIC_WORLD } from './generic.ts';
import { INDONESIA } from './id.ts';
import { UNITED_STATES } from './us.ts';

/** Every authored config, including ones not playable yet. */
export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  [GENERIC_WORLD.code]: GENERIC_WORLD,
  [INDONESIA.code]: INDONESIA,
  [UNITED_STATES.code]: UNITED_STATES,
};

/** Phase 1: Indonesia only (IDR). Add 'US' etc. here to enable more countries. */
export const ACTIVE_COUNTRY_CODES: CountryCode[] = [INDONESIA.code];
export const DEFAULT_COUNTRY_CODE: CountryCode = INDONESIA.code;

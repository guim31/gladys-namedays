// -----------------------------------------------------------------------------
// Configuration: DEFAULT_CONFIG mirrors the manifest defaults (tied by
// test/manifest.test.js), and normalizeConfig() turns whatever Gladys sends
// (a field never saved is absent) into a complete, valid object. Nothing here
// throws: a wrong entry is dropped.
// -----------------------------------------------------------------------------

import { COUNTRIES, normalizeName } from './namedays.js';

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// Followed names: a family fits, a phone book does not (one scene event per
// name and hour, a short "next" text).
export const MAX_NAMES = 20;
export const MAX_NAME_LENGTH = 40;

export const DEFAULT_CONFIG = {
  countries: ['de'],
  names: '',
  language: 'fr',
};

/**
 * @param {object} [raw] the configuration sent by Gladys
 * @returns {{ countries: string[], names: string[], language: string }}
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const countries = Array.isArray(source.countries)
    ? COUNTRIES.filter((country) => source.countries.includes(country))
    : [];
  return {
    countries: countries.length > 0 ? countries : DEFAULT_CONFIG.countries,
    names: parseNames(source.names),
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
  };
}

/**
 * The followed names, as the user wrote them: separated by commas,
 * semicolons or line breaks, duplicates (case and accents ignored) dropped.
 */
export function parseNames(value) {
  const names = [];
  const seen = new Set();
  const text = typeof value === 'string' ? value : '';
  for (const token of text.split(/[,;\n]+/)) {
    const name = token.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
    const key = normalizeName(name);
    if (key && !seen.has(key) && names.length < MAX_NAMES) {
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}

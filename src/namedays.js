// -----------------------------------------------------------------------------
// The name-day calendars, embedded: src/data/namedays.json, built by
// scripts/build-data.mjs from the data of nameday.abalin.net (MIT License).
// Everything here is pure and works offline: a name day is a day of the year
// ('MM-DD') per country, and February 29 exists in leap years only.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { addDays, daysBetween } from './dates.js';

const DATA = JSON.parse(readFileSync(new URL('./data/namedays.json', import.meta.url), 'utf8'));

/** The country codes of the data, lower case ('de', 'se'...). */
export const COUNTRIES = Object.keys(DATA.countries);

// Letters NFD does not split into a base letter and an accent.
const FOLDED = { ł: 'l', ø: 'o', đ: 'd', ð: 'd', æ: 'ae', œ: 'oe', þ: 'th', ı: 'i', ß: 'ss' };

/** "Ábel", "ABEL " and "abel" are the same name, "Łukasz" and "Lukasz" too. */
export function normalizeName(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[łøđðæœþıß]/g, (letter) => FOLDED[letter])
    .replace(/\s+/g, ' ')
    .trim();
}

/** The names celebrated on a date ('YYYY-MM-DD') in a country. */
export function namesOn(country, date) {
  return DATA.countries[country]?.[date.slice(5)] ?? [];
}

// Per country: normalized name -> the days ('MM-DD') it is celebrated. A
// compound entry ("Maria Magdalena") is found by its full form and by each of
// its words: a "Magdalena" is celebrated that day too.
const indexes = new Map();

function indexOf(country) {
  let index = indexes.get(country);
  if (!index) {
    index = new Map();
    for (const [day, names] of Object.entries(DATA.countries[country] ?? {})) {
      for (const name of names) {
        const full = normalizeName(name);
        const keys = new Set([full, ...full.split(' ')]);
        for (const key of keys) {
          if (!index.has(key)) {
            index.set(key, new Set());
          }
          index.get(key).add(day);
        }
      }
    }
    indexes.set(country, index);
  }
  return index;
}

/** The days ('MM-DD', sorted) a name is celebrated in a country. */
export function daysOf(name, country) {
  return [...(indexOf(country).get(normalizeName(name)) ?? [])].sort();
}

/** True when the name is celebrated on that date in that country. */
export function isCelebrated(name, country, date) {
  return indexOf(country).get(normalizeName(name))?.has(date.slice(5)) ?? false;
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** The first date on or after `from` ('YYYY-MM-DD') whose day is `day`. */
function nextOccurrence(day, from) {
  let year = Number(from.slice(0, 4));
  if (`${year}-${day}` < from) {
    year += 1;
  }
  if (day === '02-29') {
    while (!isLeapYear(year)) {
      year += 1;
    }
  }
  return `${year}-${day}`;
}

/**
 * The next day, on or after `from`, a name is celebrated in any of the
 * countries.
 * @returns {{ date: string, days: number, countries: string[] }|null} the
 *   countries that celebrate it that day; null when it is in no calendar
 */
export function nextCelebration(name, countries, from) {
  let best = null;
  for (const country of countries) {
    for (const day of daysOf(name, country)) {
      const date = nextOccurrence(day, from);
      if (!best || date < best.date) {
        best = { date, countries: [country] };
      } else if (date === best.date && !best.countries.includes(country)) {
        best.countries.push(country);
      }
    }
  }
  return best ? { ...best, days: daysBetween(from, best.date) } : null;
}

/** The names of a list celebrated on a date in any of the countries. */
export function celebratedOn(names, countries, date) {
  return names
    .map((name) => ({
      name,
      countries: countries.filter((country) => isCelebrated(name, country, date)),
    }))
    .filter((entry) => entry.countries.length > 0);
}

export { addDays };

// -----------------------------------------------------------------------------
// The embedded calendars: the cleaning of the upstream data (real entries of
// nameday.abalin.net in test/fixtures/abalin), and the lookups the devices,
// the scenes and the widget rely on: several names a day, accents, February 29,
// a name celebrated on several days and in several countries.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COUNTRIES as BUILT, buildData, cleanNames } from '../scripts/build-data.mjs';
import {
  COUNTRIES,
  celebratedOn,
  daysOf,
  isCelebrated,
  namesOn,
  nextCelebration,
  normalizeName,
} from '../src/namedays.js';

const sample = JSON.parse(
  readFileSync(new URL('./fixtures/abalin/namedays-sample.json', import.meta.url), 'utf8'),
);
const embedded = JSON.parse(
  readFileSync(new URL('../src/data/namedays.json', import.meta.url), 'utf8'),
);

test('the embedded data is the output of the build script, for the same countries', () => {
  assert.deepEqual(COUNTRIES, BUILT);
  assert.equal(embedded.source.license, 'MIT');
  const rebuilt = buildData(sample);
  for (const country of COUNTRIES) {
    for (const [day, names] of Object.entries(rebuilt[country])) {
      assert.deepEqual(embedded.countries[country][day], names, `${country} ${day}`);
    }
  }
});

test('holidays, saint titles and abbreviations are not names', () => {
  // Real upstream values.
  assert.deepEqual(cleanNames('de', 'Maria, Neujahr'), ['Maria']);
  assert.deepEqual(cleanNames('de', 'Heilige, 3 Könige, Raimund'), ['Raimund']);
  assert.deepEqual(cleanNames('de', 'Johannes B., Marcella, Rudbert'), [
    'Johannes',
    'Marcella',
    'Rudbert',
  ]);
  assert.deepEqual(cleanNames('de', '40, Märtyrer, Emil, Gustav'), ['Emil', 'Gustav']);
  assert.deepEqual(cleanNames('de', 'Adam, u., Eva Hl., Abend'), ['Adam', 'Eva']);
  assert.deepEqual(cleanNames('de', 'Christfest, (Weihnachten)'), []);
  assert.deepEqual(cleanNames('cz', 'Nový rok'), []);
  assert.deepEqual(cleanNames('cz', 'Petr a Pavel'), ['Petr', 'Pavel']);
  assert.deepEqual(cleanNames('se', 'Nyårsdagen'), []);
  assert.deepEqual(cleanNames('dk', 'Hellige 3 Konger'), []);
  assert.deepEqual(cleanNames('at', 'Gabriel(a], Michael(a], Rafael(a)'), [
    'Gabriel',
    'Gabriela',
    'Michael',
    'Michaela',
    'Rafael',
    'Rafaela',
  ]);
  assert.deepEqual(cleanNames('lv', 'Visu neparasto un kalendāros neierakstīto vārdu diena'), []);
  assert.deepEqual(cleanNames('fi', 'n/a'), []);
});

test('no embedded name is a holiday, an abbreviation or empty', () => {
  for (const country of COUNTRIES) {
    for (const [day, names] of Object.entries(embedded.countries[country])) {
      assert.match(day, /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
      assert.ok(names.length > 0);
      for (const name of names) {
        assert.match(name, /^\p{Lu}[\p{L}'’ -]*\p{L}$/u, `${country} ${day}: "${name}"`);
        assert.doesNotMatch(
          name,
          /(dag|dagen|Neujahr|Nový rok|svátek|Weihnacht)$/u,
          `${country} ${day}: "${name}"`,
        );
      }
    }
    // Every country covers nearly the whole year.
    assert.ok(Object.keys(embedded.countries[country]).length > 330, country);
  }
});

test('several names a day, in each country, with their accents', () => {
  assert.deepEqual(namesOn('pl', '2027-07-26'), ['Anna', 'Baldev', 'Grażyna', 'Mirosława']);
  assert.deepEqual(namesOn('de', '2027-07-26'), ['Anna', 'Joachim', 'Gloria']);
  assert.deepEqual(namesOn('hu', '2027-01-02'), ['Ábel']);
  assert.deepEqual(namesOn('cz', '2027-10-28'), []); // a public holiday, no name
  assert.deepEqual(namesOn('xx', '2027-10-28'), []);
});

test('names compare without case nor accents', () => {
  assert.equal(normalizeName('  ÁBEL '), 'abel');
  assert.equal(normalizeName('Grażyna'), 'grazyna');
  assert.equal(normalizeName('Jürgen'), 'jurgen');
  assert.ok(isCelebrated('abel', 'hu', '2027-01-02'));
  assert.ok(isCelebrated('GRAZYNA', 'pl', '2027-07-26'));
  assert.ok(!isCelebrated('Anna', 'pl', '2027-07-27'));
  // A compound entry is found by each of its words.
  assert.ok(isCelebrated('Magdalena', 'at', '2027-07-22'));
  assert.ok(isCelebrated('Maria Magdalena', 'at', '2027-07-22'));
});

test('February 29 exists in leap years only', () => {
  assert.deepEqual(namesOn('cz', '2028-02-29'), ['Horymír']);
  assert.deepEqual(daysOf('Horymír', 'cz'), ['02-29']);
  // From 1 March 2026, Horymír's next name day is 29 February 2028.
  assert.deepEqual(nextCelebration('Horymir', ['cz'], '2026-03-01'), {
    date: '2028-02-29',
    countries: ['cz'],
    days: 730,
  });
  assert.equal(nextCelebration('Horymír', ['cz'], '2028-02-29').days, 0);
});

test('the next name day: soonest country first, ties merged, absent names null', () => {
  assert.deepEqual(nextCelebration('Anna', ['de', 'pl', 'se'], '2027-07-25'), {
    date: '2027-07-26',
    countries: ['de', 'pl'],
    days: 1,
  });
  // After 26 July, the Polish 7 August comes before the Swedish 9 December.
  assert.deepEqual(nextCelebration('Anna', ['de', 'pl', 'se'], '2027-07-27'), {
    date: '2027-08-07',
    countries: ['pl'],
    days: 11,
  });
  // Across the new year.
  assert.equal(nextCelebration('Anna', ['se'], '2027-12-10').date, '2028-12-09');
  assert.equal(nextCelebration('Kevinator', COUNTRIES, '2027-07-25'), null);
  assert.equal(nextCelebration('', COUNTRIES, '2027-07-25'), null);
});

test('the followed names celebrated on a date, with their countries', () => {
  assert.deepEqual(celebratedOn(['anna', 'Zofia', 'Jakob'], ['de', 'pl'], '2027-07-26'), [
    { name: 'anna', countries: ['de', 'pl'] },
  ]);
  assert.deepEqual(celebratedOn([], ['de'], '2027-07-26'), []);
});

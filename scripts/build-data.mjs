// -----------------------------------------------------------------------------
// Builds src/data/namedays.json from the data file of nameday.abalin.net
// (https://github.com/xnekv03/nameday-api, json/namedays.json, MIT License,
// copyright xnekv03). Run it again when the upstream file changes:
//
//   curl -sLo /tmp/namedays.json \
//     https://raw.githubusercontent.com/xnekv03/nameday-api/<commit>/json/namedays.json
//   node scripts/build-data.mjs /tmp/namedays.json <commit>
//
// The upstream file mixes the names with public holidays ("Nový rok",
// "Nyårsdagen"), saint days and abbreviations ("Johannes B.", "u.", "v.P."):
// only names are kept. Countries whose calendar is a list of saints or is
// mostly empty upstream (Croatia, Italy, Spain, Greece, Bulgaria, Russia) are
// left out, as are France (the subject of another integration) and the US.
// -----------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs';

export const COUNTRIES = ['at', 'cz', 'de', 'dk', 'ee', 'fi', 'hu', 'lt', 'lv', 'pl', 'se', 'sk'];

// Holidays and other words that are not names, per country.
const NOT_NAMES = {
  de: [
    'Abend',
    'Allerheiligen',
    'Allerseelen',
    'Arbeiter',
    'Bekehrung.',
    'Christfest',
    'Christi',
    'Empfängnis',
    'Geburt',
    'Heilige',
    'Heimsuchg',
    'Herrn',
    'Himmelfahrt',
    'Lichtmess',
    'Mariä',
    'Märtyrer',
    'Neujahr',
    'Pauli',
    'Petri', // "Petri Stuhlfeier", a feast
    'Schalttag',
    'Schutzengelfest',
    'Stuhlfeier',
    'Verklärung',
    'Julan', // a typo, "Julian" follows
  ],
  // Truncated or garbled upstream tokens.
  at: ['Pe'],
  hu: ['Vu'],
  lt: ['M-Stvydas'],
  dk: ['Allehelgensdag', 'Børnedag', 'Juledag', 'Nytårsdag', 'Syvsoverdag'],
  se: ['Allhelgonadagen', 'Juldagen', 'Kyndelsmässodagen', 'Nyårsdagen'],
};

// Entries rewritten by hand: alternatives written with parentheses, saints
// with their title, names stuck together.
const FIXES = {
  at: {
    'Anna Katharina(e)': ['Anna Katharina'],
    'Simon (e)': ['Simon'],
    'K(C)lemens': ['Klemens', 'Clemens'],
    'K(C)ordula': ['Kordula', 'Cordula'],
    'Ramon(a]': ['Ramon', 'Ramona'],
    'Gabriel(a]': ['Gabriel', 'Gabriela'],
    'Michael(a]': ['Michael', 'Michaela'],
    'Rafael(a)': ['Rafael', 'Rafaela'],
    'Karl(a]': ['Karl', 'Karla'],
    'Andrea(s]': ['Andrea', 'Andreas'],
    'Guntram Ingbert': ['Guntram', 'Ingbert'],
  },
  de: { 'Hieronymus.': ['Hieronymus'], 'Johann.': ['Johann'], 'Amand.': ['Amand'] },
  dk: {
    'Peter Martyr': ['Peter'],
    'Knud Konge': ['Knud'],
    'Morten Bisp': ['Morten'],
    'St. Michael': ['Michael'],
    'Beda den Ærværdige': ['Beda'],
  },
  hu: { 'Lénárd Nuno': ['Lénárd', 'Nuno'] },
  pl: { 'Piotr. Jagoda': ['Piotr', 'Jagoda'] },
};

// Multi-word entries that are names (kept as written); any other multi-word
// entry of these countries is a holiday ("Den české státnosti").
const KEEP_AS_WRITTEN = {
  at: ['Maria Magdalena', 'Rosa Maria', 'Franz Xaver', 'Anna Katharina'],
  dk: ['Maria Magdalene'],
  pl: ['Maria Magdalena'],
  se: ['Olaus Petri', 'Gustav Adolf', 'Martin Luther'],
};

const WORD = /^\p{Lu}[\p{L}'’-]*$/u;
const ROMAN = /^[IVXLC]+$/;

/** The names of one raw upstream value of one country. */
export function cleanNames(country, raw) {
  if (!raw || raw.trim() === 'n/a') {
    return [];
  }
  const names = [];
  let tokens = raw.split(',').map((token) => token.trim());
  if (country === 'cz' || country === 'sk') {
    // "Petr a Pavel", "Adam a Eva": two names.
    tokens = tokens.flatMap((token) =>
      /^\p{Lu}\p{Ll}+ a \p{Lu}\p{Ll}+$/u.test(token) ? token.split(' a ') : [token],
    );
  }
  for (const token of tokens) {
    if (FIXES[country]?.[token]) {
      names.push(...FIXES[country][token]);
      continue;
    }
    if (!token || NOT_NAMES[country]?.includes(token)) {
      continue;
    }
    if (KEEP_AS_WRITTEN[country]?.includes(token)) {
      names.push(token);
      continue;
    }
    const words = token.split(/\s+/);
    if (words.length === 1) {
      // A single word: a name, unless it is an abbreviation ("u.", "Polyk."),
      // a number or a Roman numeral.
      if (WORD.test(token) && token.length > 1 && !ROMAN.test(token)) {
        names.push(token);
      }
      continue;
    }
    if (country === 'de') {
      // "Johannes B.", "Thomas Ap.", "Jakob d.Ä.": the name, then a title.
      const [first] = words;
      if (WORD.test(first) && !ROMAN.test(first) && !NOT_NAMES.de.includes(first)) {
        names.push(first);
      }
    }
    // Other multi-word entries are holidays or saint days.
  }
  return [...new Set(names)];
}

/** The data of the integration: { "MM-DD": [names] } per country. */
export function buildData(upstream) {
  const countries = Object.fromEntries(COUNTRIES.map((country) => [country, {}]));
  for (const entry of upstream) {
    const key = `${String(entry.month).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`;
    for (const country of COUNTRIES) {
      const names = cleanNames(country, entry[country]);
      if (names.length > 0) {
        countries[country][key] = names;
      }
    }
  }
  return countries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, commit] = process.argv.slice(2);
  // The upstream file has trailing commas: not strict JSON.
  const text = readFileSync(file, 'utf8').replace(/,(\s*[}\]])/g, '$1');
  const data = {
    source: {
      url: 'https://github.com/xnekv03/nameday-api',
      file: 'json/namedays.json',
      commit,
      license: 'MIT',
    },
    countries: buildData(JSON.parse(text)),
  };
  const out = new URL('../src/data/namedays.json', import.meta.url);
  writeFileSync(out, `${JSON.stringify(data)}\n`);
  for (const [country, days] of Object.entries(data.countries)) {
    const count = Object.values(days).reduce((sum, names) => sum + names.length, 0);
    console.log(`${country}: ${Object.keys(days).length} days, ${count} names`);
  }
}

// -----------------------------------------------------------------------------
// The devices: one per chosen country (the names celebrated today and
// tomorrow), and one for the followed names when there are some (who is
// celebrated today, and the next name day). Every feature is a `text/text`,
// and each device has two: Gladys shows the generic label of the type instead
// of the feature name when a feature is alone of its type.
// -----------------------------------------------------------------------------

import { NAMES, VALUE_TEXT, countryList, countryName } from './i18n.js';
import { formatDate } from './dates.js';

const TEXT = { category: 'text', type: 'text', min: 0, max: 0 };

// Feature keys are forever (Gladys keys history and scenes on them).
export const COUNTRY_FEATURES = ['today', 'tomorrow'];
export const FOLLOWED_FEATURES = ['today', 'next'];

/** The ids of the device of a country. */
export function countryIds(gladys, country) {
  return gladys.externalIds('country', country);
}

/** The ids of the followed-names device (one per integration). */
export function followedIds(gladys) {
  return gladys.externalIds('followed', 'names');
}

function feature(ids, key, name) {
  return {
    name,
    external_id: ids.feature(key),
    ...TEXT,
    read_only: true,
    has_feedback: false,
  };
}

/** The devices of a configuration. */
export function buildDevices(gladys, config) {
  const names = NAMES[config.language];
  const devices = config.countries.map((country) => {
    const ids = countryIds(gladys, country);
    return {
      name: names.country(countryName(country, config.language)),
      external_id: ids.device,
      should_poll: false,
      params: [{ name: 'country', value: country.toUpperCase() }],
      features: COUNTRY_FEATURES.map((key) => feature(ids, key, names[key])),
    };
  });
  if (config.names.length > 0) {
    const ids = followedIds(gladys);
    devices.push({
      name: names.followed,
      external_id: ids.device,
      should_poll: false,
      features: FOLLOWED_FEATURES.map((key) => feature(ids, key, names[`followed_${key}`])),
    });
  }
  return devices;
}

/** "Anna, Lukas" or the "no name" text: a text state is never empty. */
export function joinNames(names, empty) {
  return names.length > 0 ? names.join(', ') : empty;
}

/** "Anna (Germany) · Saturday 26 July 2027, in 5 days". */
export function nextText(next, language) {
  const text = VALUE_TEXT[language];
  if (!next) {
    return text.notFound;
  }
  const who = next.entries
    .map(({ name, countries }) => `${name} (${countryList(countries, language)})`)
    .join(', ');
  return `${who} · ${formatDate(next.date, language, 'long')}, ${text.when(next.days)}`;
}

/**
 * The states of every device for a day.
 * @param {object} gladys the SDK client
 * @param {object} config a normalized configuration
 * @param {object} day the snapshot of the service (src/service.js)
 */
export function buildStates(gladys, config, day) {
  const text = VALUE_TEXT[config.language];
  const states = [];
  const push = (ids, key, value) =>
    states.push({ device_feature_external_id: ids.feature(key), text: value });
  for (const country of config.countries) {
    const ids = countryIds(gladys, country);
    push(ids, 'today', joinNames(day.today[country], text.noName));
    push(ids, 'tomorrow', joinNames(day.tomorrow[country], text.noName));
  }
  if (config.names.length > 0) {
    const ids = followedIds(gladys);
    push(
      ids,
      'today',
      joinNames(
        day.followedToday.map(({ name }) => name),
        text.nobody,
      ),
    );
    push(ids, 'next', nextText(day.next, config.language));
  }
  return states;
}

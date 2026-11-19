// -----------------------------------------------------------------------------
// Dashboard widget "Name days": the names celebrated today (and tomorrow) in
// each chosen country as status rows, then the next name days of the followed
// names as the card's list. The core allows one list and one status block per
// widget, a status row of 40 characters and 10 rows: tomorrow shows while
// every country fits, and a long list of names is cut on a whole name. Produced from the
// calendars, not from the devices: it works before they are added. Localized
// from the language of the person looking at it (country names, dates).
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { addDays, formatDate } from './dates.js';
import { LANGUAGES } from './config.js';
import { VALUE_TEXT, WIDGET_TEXT, countryList, countryName } from './i18n.js';
import { WIDGET_KEY } from './service.js';

export const DEFAULT_ITEMS = 5;
export const MAX_ITEMS = 8; // the core's cap for a card-list in `list` display
const MAX_ROWS = 10; // the core's cap for a status block
const ROW_VALUE_MAX = 40;

function badge(days, text) {
  if (days <= 0) {
    return { text: text.badgeToday, color: WIDGET_COLORS.SUCCESS };
  }
  if (days === 1) {
    return { text: text.badgeTomorrow, color: WIDGET_COLORS.INFO };
  }
  return { text: text.badgeDays(days), color: WIDGET_COLORS.NEUTRAL };
}

/** "Anna, Joachim, Gloria", cut on a whole name with "…" past 40 characters. */
export function shortNames(names, empty) {
  const all = names.length > 0 ? names.join(', ') : empty;
  if (all.length <= ROW_VALUE_MAX) {
    return all;
  }
  let text = '';
  for (const name of names) {
    const next = text ? `${text}, ${name}` : name;
    if (next.length > ROW_VALUE_MAX - 2) {
      break;
    }
    text = next;
  }
  return `${text || names[0].slice(0, ROW_VALUE_MAX - 2)} …`;
}

/**
 * The widget content.
 * @param {object} service the NamedayService
 * @param {{ settings?: object, language?: string }} request
 */
export function buildContent(service, { settings = {}, language } = {}) {
  const lang = LANGUAGES.includes(language) ? language : service.config.language;
  const text = WIDGET_TEXT[lang];
  const { countries, names } = service.config;
  const today = service.today();
  const components = [];

  const days = [{ date: today, label: text.today, color: WIDGET_COLORS.SUCCESS }];
  // Tomorrow while every country fits in the 10 rows; today only beyond.
  if (settings.show_tomorrow !== false && countries.length * 2 <= MAX_ROWS) {
    days.push({ date: addDays(today, 1), label: text.tomorrow, color: WIDGET_COLORS.INFO });
  }
  const perDay = days.map((day) => ({ ...day, names: service.namesOn(day.date) }));
  const rows = countries.flatMap((country) =>
    perDay.map(({ label, color, names: byCountry }) => ({
      label: `${countryName(country, lang)} · ${label}`,
      value: shortNames(byCountry[country], VALUE_TEXT[lang].noName),
      icon: 'gift',
      color,
    })),
  );
  components.push({ type: 'status', items: rows.slice(0, MAX_ROWS) });
  // Eleven or twelve countries: the last ones are named, their devices remain.
  const hidden = countries.slice(MAX_ROWS);
  if (hidden.length > 0) {
    components.push({
      type: 'text',
      variant: 'caption',
      text: text.moreCountries(countryList(hidden, lang)),
    });
  }

  if (settings.show_followed !== false) {
    const count = clampCount(settings.count);
    const upcoming = service.upcoming(today).slice(0, count);
    if (upcoming.length > 0) {
      components.push({
        type: 'card-list',
        display: 'list',
        items: upcoming.map((entry) => ({
          title: entry.name,
          date: entry.date,
          badge: badge(entry.days, text),
          description: `${formatDate(entry.date, lang, 'long')} · ${countryList(entry.countries, lang)}`,
        })),
      });
    } else if (names.length === 0) {
      components.push({ type: 'text', variant: 'caption', text: text.noFollowed });
    }
  }
  // The clock asks for a refresh at midnight; the TTL is a safety net.
  return { ttl_seconds: 3600, components };
}

function clampCount(value) {
  const count = Math.trunc(Number(value ?? DEFAULT_ITEMS));
  return Number.isFinite(count) ? Math.min(Math.max(count, 1), MAX_ITEMS) : DEFAULT_ITEMS;
}

export const WIDGETS = {
  [WIDGET_KEY]: {
    get: (service, request) => buildContent(service, request),
  },
};

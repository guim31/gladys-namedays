// -----------------------------------------------------------------------------
// Scene actions (manifest `scene_actions`). "Name days of a date" gives the
// names of a country for today, tomorrow or any day of the coming year, for a
// message ("Today we celebrate {{…names}}"); "Next name day" gives when a name
// is celebrated next. Yes/no outputs are numbers (1 = yes, 0 = no): the
// "Condition on variables" of Gladys compares strictly, and nothing typed
// there can equal a boolean.
// -----------------------------------------------------------------------------

import { addDays, formatDate } from './dates.js';
import { countryList } from './i18n.js';
import { COUNTRIES, nextCelebration, namesOn } from './namedays.js';

export const MAX_DAYS_AHEAD = 366;

export const SCENE_ACTIONS = {
  get_namedays: async (service, { fields = {} }) => {
    const { config } = service;
    const country = COUNTRIES.includes(fields.country) ? fields.country : config.countries[0];
    const raw = Math.trunc(Number(fields.days_ahead ?? 0));
    const daysAhead = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), MAX_DAYS_AHEAD) : 0;
    const date = addDays(service.today(), daysAhead);
    const followed = service.followedOn(date);
    return {
      date,
      names: namesOn(country, date).join(', '),
      followed: followed.map(({ name }) => name).join(', '),
      has_followed: followed.length > 0 ? 1 : 0,
    };
  },

  next_nameday: async (service, { fields = {} }) => {
    const { config } = service;
    const name = String(fields.name ?? '').trim();
    const next = name ? nextCelebration(name, config.countries, service.today()) : null;
    if (!next) {
      return { date: '', date_text: '', days: -1, countries: '' };
    }
    return {
      date: next.date,
      date_text: formatDate(next.date, config.language, 'long'),
      days: next.days,
      countries: countryList(next.countries, config.language),
    };
  },
};

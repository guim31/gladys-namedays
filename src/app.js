// -----------------------------------------------------------------------------
// Registers every SDK handler on a GladysIntegration (or the SDK's fake Gladys
// in the tests) and returns the service, so index.js stays a few lines and the
// tests drive the very same wiring.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './config.js';
import { formatDate } from './dates.js';
import {
  ACTION_TEXT,
  INIT_FAILED,
  VALUE_TEXT,
  countryList,
  countryName,
  formatDayOfYear,
  inEveryLanguage,
  labelled,
} from './i18n.js';
import { daysOf, nextCelebration } from './namedays.js';
import { SCENE_ACTIONS } from './scenes.js';
import { NamedayService } from './service.js';
import { createStore } from './store.js';
import { WIDGETS } from './widgets.js';

const logger = createLogger({ name: 'namedays-app' });

// Action keys are forever: the manifest declares them.
export const FIND_ACTION = 'find_name';
export const CHECK_ACTION = 'check_names';

/**
 * An action failure: Gladys shows the message of a thrown error in red, and
 * what a handler returns in green.
 */
export class ActionFailure extends Error {
  constructor(text) {
    super(text.en);
    this.message = text;
  }
}

/**
 * @param {object} gladys GladysIntegration instance
 * @param {object} [options] test seams: store, now, timeZone, timers
 */
export function registerHandlers(gladys, options = {}) {
  const service = new NamedayService({
    gladys,
    store: options.store ?? createStore(),
    now: options.now,
    timeZone: options.timeZone,
    timers: options.timers ?? true,
  });

  // Resolved once the service has started; every handler waits for it.
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  let started = false;
  const whenReady =
    (fn) =>
    async (...args) => {
      await ready;
      return fn(...args);
    };

  gladys.on('connected', async () => {
    try {
      const config = normalizeConfig(await gladys.getConfig());
      if (started) {
        await service.reconfigure(config);
        return;
      }
      // Only once start() succeeded: a failed start is retried on the next
      // connection, or the clock (states at midnight, triggers) never runs.
      await service.start(config);
      started = true;
    } catch (err) {
      logger.error('Initialization failed', err);
      await gladys.setConnectionStatus(false, INIT_FAILED).catch(() => {});
    } finally {
      resolveReady();
    }
  });

  gladys.onScanRequest(whenReady(() => service.publishDevices()));

  gladys.onDeviceCreated(whenReady(() => service.deviceCreated()));

  gladys.onConfigUpdated(whenReady((config) => service.reconfigure(normalizeConfig(config))));

  gladys.onAction(
    FIND_ACTION,
    whenReady(async (params = {}) => {
      const name = String(params.name ?? '').trim();
      logger.info('Name search requested');
      return findMessage(service, name);
    }),
  );

  gladys.onAction(
    CHECK_ACTION,
    whenReady(async () => {
      logger.info('Check of the followed names requested');
      return checkMessage(service);
    }),
  );

  for (const [key, handler] of Object.entries(SCENE_ACTIONS)) {
    gladys.onSceneAction(
      key,
      whenReady((fields) => handler(service, { fields })),
    );
  }

  for (const [key, widget] of Object.entries(WIDGETS)) {
    gladys.onWidgetGet(
      key,
      whenReady((request) => widget.get(service, request)),
    );
  }

  return { service, ready, stop: () => service.stop() };
}

/** The days of a name in each chosen country: ["Germany: 26 July, 1 February"]. */
function dayLines(name, countries, language) {
  return countries
    .map((country) => ({ country, days: daysOf(name, country) }))
    .filter(({ days }) => days.length > 0)
    .map(({ country, days }) =>
      labelled(
        countryName(country, language),
        days.map((day) => formatDayOfYear(day, language)).join(', '),
        language,
      ),
    );
}

function nextLine(next, language) {
  return ACTION_TEXT[language].next(
    formatDate(next.date, language, 'long'),
    VALUE_TEXT[language].when(next.days),
  );
}

/** "Find a name": its days in each chosen country, and the next one. */
export function findMessage(service, name) {
  const { countries } = service.config;
  if (!name) {
    throw new ActionFailure(inEveryLanguage(ACTION_TEXT, (text) => text.missingName));
  }
  const next = nextCelebration(name, countries, service.today());
  if (!next) {
    throw new ActionFailure(
      inEveryLanguage(ACTION_TEXT, (text, language) =>
        text.notFound(name, countryList(countries, language)),
      ),
    );
  }
  return inEveryLanguage(ACTION_TEXT, (text, language) =>
    [
      text.found(name),
      ...dayLines(name, countries, language).map((line) => `- ${line}`),
      nextLine(next, language),
    ].join('\n'),
  );
}

/** "Check the followed names": the next name day of each, and the missing ones. */
export function checkMessage(service) {
  const { countries, names } = service.config;
  if (names.length === 0) {
    throw new ActionFailure(inEveryLanguage(ACTION_TEXT, (text) => text.noNames));
  }
  const upcoming = service.upcoming();
  const found = new Set(upcoming.map((entry) => entry.name));
  const missing = names.filter((name) => !found.has(name));
  return inEveryLanguage(ACTION_TEXT, (text, language) => {
    const lines = [text.checkHeader(countryList(countries, language))];
    for (const entry of upcoming) {
      const when = VALUE_TEXT[language].when(entry.days);
      const date = formatDate(entry.date, language, 'long');
      const where = countryList(entry.countries, language);
      lines.push(`- ${labelled(entry.name, `${date} (${when}, ${where})`, language)}`);
    }
    if (missing.length > 0) {
      lines.push('', text.missing, missing.join(', '));
    }
    return lines.join('\n');
  });
}

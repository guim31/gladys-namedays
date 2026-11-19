// -----------------------------------------------------------------------------
// The heart of the integration: the calendars of the chosen countries, the
// followed names, and the clock that turns them into device states and scene
// events.
//
// The clock ticks every minute and works in the time zone of Gladys:
// - a new local day republishes EVERY state, unchanged ones included. Gladys
//   flags a value older than 48 hours as "no recent value", and "Nobody"
//   stays the same for weeks;
// - a new local hour fires the scene triggers of that hour (their `hour`
//   filter is an equality: the event carries the hour). On the spring-forward
//   night the skipped hour never fires; on the fall-back night the repeated
//   hour fires once.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { addDays, formatDate, localSlot, processTimeZone } from './dates.js';
import { buildDevices, buildStates } from './device.js';
import { createFailureLog } from './failures.js';
import { countryList } from './i18n.js';
import { celebratedOn, nextCelebration, namesOn } from './namedays.js';

const logger = createLogger({ name: 'namedays' });

export const WIDGET_KEY = 'namedays';

// Trigger keys are forever: scenes store them.
export const TRIGGERS = {
  TODAY: 'followed_nameday',
  EVE: 'followed_nameday_eve',
};

// After a restart, the hour just begun is still fired when the container is
// back within these minutes and that hour was not fired before the restart.
const CATCH_UP_MINUTES = 10;
const SCHEDULER_FILE = 'scheduler.json';

export class NamedayService {
  /**
   * @param {object} options
   * @param {object} options.gladys the SDK client
   * @param {object} options.store JSON files in /data (src/store.js)
   * @param {Function} [options.now] the clock (tests)
   * @param {string} [options.timeZone] Gladys' time zone (default: TZ)
   * @param {boolean} [options.timers] false in the tests: they call tick()
   */
  constructor({ gladys, store, now = Date.now, timeZone, timers = true }) {
    this.gladys = gladys;
    this.store = store;
    this.now = now;
    this.timeZone = timeZone ?? processTimeZone();
    this.timers = timers;
    this.config = null;
    this.currentDate = null;
    this.lastSlot = null;
    this.timer = null;
    this.queue = Promise.resolve();
    // A failure repeated every minute or hour is logged once (src/failures.js).
    this.failures = createFailureLog(logger);
  }

  // One operation at a time: a tick never interleaves with a reconfiguration.
  serial(fn) {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => {});
    return run;
  }

  /** Today in Gladys' time zone. */
  today() {
    return localSlot(this.now(), this.timeZone).date;
  }

  start(config) {
    return this.serial(async () => {
      this.config = config;
      const slot = localSlot(this.now(), this.timeZone);
      this.currentDate = slot.date;
      const key = slotKey(slot);
      const fired = this.store.load(SCHEDULER_FILE)?.slot ?? null;
      await this.publishDevices();
      await this.publishDay({ force: true });
      await this.updateStatus();
      this.refreshWidget();
      if (fired !== key && slot.minute < CATCH_UP_MINUTES) {
        await this.fireSlot(slot);
      } else {
        this.lastSlot = key;
      }
      this.schedule();
    });
  }

  /** The configuration changed, or Gladys came back: publish everything again. */
  reconfigure(config) {
    return this.serial(async () => {
      this.config = config;
      await this.publishDevices();
      await this.publishDay({ force: true });
      await this.updateStatus();
      this.refreshWidget();
    });
  }

  /** The user added a device: its states were dropped until now. */
  deviceCreated() {
    return this.serial(async () => {
      // The SDK already forgot the states of a created device.
      await this.publishDay();
      this.refreshWidget();
    });
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
    return this.queue;
  }

  schedule() {
    if (!this.timers) {
      return;
    }
    clearTimeout(this.timer);
    // Just after the next minute, so a new hour is seen within a second.
    const delay = 60_000 - (this.now() % 60_000) + 500;
    this.timer = setTimeout(() => {
      this.tick()
        .then(() => this.failures.succeeded('tick', 'The clock works again'))
        .catch((err) => this.failures.failed('tick', 'Clock tick failed', err))
        .finally(() => this.schedule());
    }, delay);
    this.timer.unref?.();
  }

  /** One step of the clock: a new day, a new hour. */
  tick() {
    return this.serial(async () => {
      const slot = localSlot(this.now(), this.timeZone);
      if (slot.date !== this.currentDate) {
        this.currentDate = slot.date;
        await this.publishDay({ force: true });
        this.refreshWidget();
      }
      if (slotKey(slot) !== this.lastSlot) {
        await this.fireSlot(slot);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // What a day is
  // ---------------------------------------------------------------------------

  /** The names celebrated on a date, per chosen country. */
  namesOn(date) {
    return Object.fromEntries(
      this.config.countries.map((country) => [country, namesOn(country, date)]),
    );
  }

  /** The followed names celebrated on a date: [{ name, countries }]. */
  followedOn(date) {
    return celebratedOn(this.config.names, this.config.countries, date);
  }

  /**
   * The next name day of every followed name, on or after `from`, soonest
   * first: [{ name, date, days, countries }]. Names in no calendar are left out.
   */
  upcoming(from = this.today()) {
    return this.config.names
      .map((name) => ({ name, ...nextCelebration(name, this.config.countries, from) }))
      .filter((entry) => entry.date)
      .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  }

  /** Today, tomorrow and the next followed name day after today. */
  snapshot() {
    const date = this.today();
    const tomorrow = addDays(date, 1);
    const upcoming = this.upcoming(tomorrow);
    const first = upcoming[0];
    return {
      date,
      today: this.namesOn(date),
      tomorrow: this.namesOn(tomorrow),
      followedToday: this.followedOn(date),
      followedTomorrow: this.followedOn(tomorrow),
      next: first
        ? {
            date: first.date,
            days: first.days + 1,
            entries: upcoming.filter((entry) => entry.date === first.date),
          }
        : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Gladys side
  // ---------------------------------------------------------------------------

  async publishDevices() {
    await this.gladys.publishDiscoveredDevices(buildDevices(this.gladys, this.config));
  }

  /**
   * Publishes the states of the day: the changed ones, or all of them once a
   * day (`force`). A failure is logged: the next publication sends again
   * what Gladys did not accept.
   */
  async publishDay({ force = false } = {}) {
    if (force) {
      this.gladys.forgetPublishedStates();
    }
    const states = buildStates(this.gladys, this.config, this.snapshot());
    try {
      await this.gladys.publishChangedStates(states);
      this.failures.succeeded('states', 'States published again');
    } catch (err) {
      this.failures.failed('states', `Could not publish the states: ${err.message}`);
    }
  }

  async updateStatus() {
    try {
      await this.gladys.setConnectionStatus(true);
      this.failures.succeeded('status', 'Status reported again');
    } catch (err) {
      this.failures.failed('status', `Could not report the status: ${err.message}`);
    }
  }

  refreshWidget() {
    try {
      // Fire-and-forget, rate-limited by the core: never awaited.
      Promise.resolve(this.gladys.requestWidgetRefresh(WIDGET_KEY)).catch(() => {});
    } catch {
      // Disconnected: the widget refetches on its own TTL.
    }
  }

  /** Fires the scene triggers of an hour, then remembers it was done. */
  async fireSlot(slot) {
    this.lastSlot = slotKey(slot);
    this.store.save(SCHEDULER_FILE, { slot: this.lastSlot });
    for (const event of this.events(slot)) {
      try {
        await this.gladys.publishSceneEvent(event.key, event.data);
        this.failures.succeeded('scene-event', 'Scene triggers fired again');
      } catch (err) {
        this.failures.failed('scene-event', `Could not fire ${event.key}: ${err.message}`);
      }
    }
  }

  /**
   * The scene events of an hour: one per followed name celebrated today, one
   * per followed name celebrated tomorrow. Each carries the hour and the name,
   * the filters the scene author picked.
   */
  events({ date, hour }) {
    const language = this.config.language;
    const event = (key, day) => (entry) => ({
      key,
      data: {
        hour,
        name: entry.name,
        countries: countryList(entry.countries, language),
        date: formatDate(day, language, 'long'),
      },
    });
    const tomorrow = addDays(date, 1);
    return [
      ...this.followedOn(date).map(event(TRIGGERS.TODAY, date)),
      ...this.followedOn(tomorrow).map(event(TRIGGERS.EVE, tomorrow)),
    ];
  }
}

function slotKey({ date, hour }) {
  return `${date}T${String(hour).padStart(2, '0')}`;
}

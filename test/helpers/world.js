// -----------------------------------------------------------------------------
// A running integration against the SDK's fake Gladys, with a clock the test
// moves and /data kept in memory. No network: the calendars are embedded.
// -----------------------------------------------------------------------------

import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';

export function createMemoryStore(files = {}) {
  const content = new Map(Object.entries(files));
  return {
    files: content,
    load: (name) => (content.has(name) ? structuredClone(content.get(name)) : null),
    save: (name, value) => content.set(name, structuredClone(value)),
  };
}

/** A clock the test sets and moves. */
export function createClock(iso) {
  const clock = {
    ms: Date.parse(iso),
    now: () => clock.ms,
    set: (value) => {
      clock.ms = Date.parse(value);
    },
    advance: (ms) => {
      clock.ms += ms;
    },
  };
  return clock;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] the configuration saved in Gladys
 * @param {string} [options.at] the instant of the start (ISO)
 * @param {string} [options.timeZone] Gladys' time zone
 * @param {object} [options.store] createMemoryStore()
 * @param {boolean} [options.connect] false: handlers registered, not started
 * @param {boolean} [options.timers] true: the real clock of the service runs
 */
export async function createWorld({
  config = {},
  at = '2027-07-25T10:00:00Z',
  timeZone = 'Europe/Berlin',
  store = createMemoryStore(),
  devices = [],
  connect = true,
  timers = false,
} = {}) {
  const clock = createClock(at);
  const gladys = createFakeGladys({ config, devices });
  const app = registerHandlers(gladys, {
    store,
    now: timers ? () => Date.now() : clock.now,
    timeZone,
    timers,
  });
  if (connect) {
    await gladys.connect();
  }
  const { service } = app;
  return {
    gladys,
    app,
    service,
    clock,
    store,
    /** The last value Gladys received for a feature of a device (its ids). */
    state(ids, key) {
      return gladys.fake.lastState(ids.feature(key));
    },
    /** Moves the clock minute by minute up to an instant, ticking each minute. */
    async runUntil(iso) {
      const target = Date.parse(iso);
      while (clock.ms < target) {
        clock.advance(Math.min(60_000, target - clock.ms));
        await service.tick();
      }
    },
  };
}

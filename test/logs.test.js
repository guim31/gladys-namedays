// -----------------------------------------------------------------------------
// The integration runs on its own clock (Gladys never polls the devices), and
// its logs stay quiet: nothing at info on a normal tick, a repeated failure
// logged once, its end logged once.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { countryIds, followedIds } from '../src/device.js';
import { createStore } from '../src/store.js';
import { createWorld } from './helpers/world.js';

const CONFIG = { countries: ['de'], names: 'Anna', language: 'fr' };

/** Captures the lines of the SDK logger (console.log / console.error). */
function captureLogs(t) {
  const previous = process.env.LOG_LEVEL;
  delete process.env.LOG_LEVEL; // the default level: info
  t.after(() => {
    if (previous !== undefined) {
      process.env.LOG_LEVEL = previous;
    }
  });
  const lines = [];
  const keep = (prefix, ...args) => lines.push([prefix, ...args].map(String).join(' '));
  t.mock.method(console, 'log', keep);
  t.mock.method(console, 'error', keep);
  return {
    lines,
    at: (level) => lines.filter((line) => line.includes(`[${level}]`)),
    clear: () => lines.splice(0),
  };
}

const flush = async () => {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

test('the devices are never polled: their own timer publishes at local midnight', async (t) => {
  // 25 July 2027, 23:58 in Berlin: Anna (26 July) is tomorrow.
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.parse('2027-07-25T21:58:10Z') });
  const world = await createWorld({ config: CONFIG, timers: true });
  t.after(() => world.app.stop());
  for (const device of world.gladys.fake.discoveredDevices) {
    assert.equal(device.should_poll, false, 'Gladys 5.2.0 polls only should_poll devices');
    assert.equal(device.poll_frequency, undefined);
  }
  const followed = followedIds(world.gladys);
  const germany = countryIds(world.gladys, 'de');
  assert.equal(world.state(followed, 'today'), 'Personne');
  assert.equal(world.state(germany, 'tomorrow'), 'Anna, Joachim, Gloria');
  // Three minutes of timers, without any call from Gladys: 26 July begins.
  for (let minute = 0; minute < 3; minute += 1) {
    t.mock.timers.tick(60_000);
    await flush();
  }
  assert.equal(world.state(followed, 'today'), 'Anna');
  assert.equal(world.state(germany, 'today'), 'Anna, Joachim, Gloria');
  assert.ok(world.gladys.fake.sceneEvents.some((event) => event.key === 'followed_nameday'));
});

test('a normal day writes nothing at info: ticks, midnight, triggers', async (t) => {
  const logs = captureLogs(t);
  const world = await createWorld({ config: CONFIG, at: '2027-07-25T10:00:00Z' });
  t.after(() => world.app.stop());
  logs.clear();
  // A day and a half: every minute, a midnight, scene triggers each hour.
  await world.runUntil('2027-07-26T20:00:00Z');
  assert.ok(world.gladys.fake.sceneEvents.length > 20);
  assert.deepEqual(logs.lines, []);
});

test('repeated failures are logged once, their end once', async (t) => {
  const logs = captureLogs(t);
  const world = await createWorld({ config: CONFIG, at: '2027-07-26T04:00:00Z' });
  t.after(() => world.app.stop());
  logs.clear();

  // Gladys refuses states, statuses and scene events for hours.
  const down = async () => {
    throw new Error('Gladys is restarting');
  };
  const mocks = ['publishChangedStates', 'setConnectionStatus', 'publishSceneEvent'].map((name) =>
    t.mock.method(world.gladys, name, down),
  );
  for (let round = 0; round < 3; round += 1) {
    world.clock.advance(3600_000);
    await world.service.tick();
    await world.service.publishDay({ force: true });
    await world.service.updateStatus();
  }
  const warnings = logs.at('WARN');
  assert.equal(warnings.length, 3, warnings.join('\n'));
  for (const pattern of [
    /Could not publish the states/,
    /Could not report the status/,
    /Could not fire followed_nameday/,
  ]) {
    assert.equal(warnings.filter((line) => pattern.test(line)).length, 1, String(pattern));
  }
  assert.deepEqual(logs.at('INFO'), []);

  // Everything is back: one line per recovery, then silence.
  for (const mock of mocks) {
    mock.mock.restore();
  }
  logs.clear();
  world.clock.advance(3600_000);
  await world.service.tick();
  await world.service.publishDay({ force: true });
  await world.service.updateStatus();
  const recoveries = logs.at('INFO');
  assert.equal(recoveries.length, 3, recoveries.join('\n'));
  for (const pattern of [
    /States published again/,
    /Status reported again/,
    /Scene triggers fired again/,
  ]) {
    assert.equal(recoveries.filter((line) => pattern.test(line)).length, 1, String(pattern));
  }
  assert.equal(world.gladys.fake.connectionStatus.connected, true);
  logs.clear();
  await world.runUntil('2027-07-26T12:30:00Z');
  await world.service.publishDay({ force: true });
  assert.deepEqual(logs.lines, []);
});

test('an unwritable /data warns once, not every hour', (t) => {
  const logs = captureLogs(t);
  const dir = mkdtempSync(path.join(tmpdir(), 'namedays-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  // A file where the folder should be: every write fails.
  const blocked = createStore(path.join(dir, 'blocked'));
  createStore(dir).save('blocked', {});
  for (let hour = 0; hour < 5; hour += 1) {
    blocked.save('scheduler.json', { slot: hour });
  }
  assert.equal(logs.at('WARN').length, 1);
  assert.match(logs.at('WARN')[0], /Could not write scheduler\.json/);
  rmSync(path.join(dir, 'blocked'));
  blocked.save('scheduler.json', { slot: 5 });
  assert.equal(logs.at('INFO').length, 1);
  assert.deepEqual(blocked.load('scheduler.json'), { slot: 5 });
});

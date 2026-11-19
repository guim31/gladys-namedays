// -----------------------------------------------------------------------------
// The service against the SDK's fake Gladys: states, the clock and its scene
// events, restarts, configuration changes, the actions of the Configuration
// screen, the scene actions and the widget.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { DEFAULT_CONFIG, MAX_NAMES, normalizeConfig, parseNames } from '../src/config.js';
import { countryIds, followedIds } from '../src/device.js';
import { createMemoryStore, createWorld } from './helpers/world.js';

const FAMILY = { countries: ['de', 'pl', 'se'], names: 'Anna, Zofia, Jakob', language: 'fr' };

test('the configuration: defaults, known countries, followed names cleaned', () => {
  assert.deepEqual(normalizeConfig({}), { ...DEFAULT_CONFIG, names: [] });
  assert.deepEqual(normalizeConfig(null).countries, ['de']);
  assert.deepEqual(normalizeConfig({ countries: ['xx', 'se', 'de'] }).countries, ['de', 'se']);
  assert.deepEqual(normalizeConfig({ countries: [] }).countries, ['de']);
  assert.equal(normalizeConfig({ language: 'it' }).language, 'fr');
  assert.deepEqual(parseNames(' Anna ,anna; Ánna\nZofia,, Jean  Pierre '), [
    'Anna',
    'Zofia',
    'Jean Pierre',
  ]);
  const many = Array.from({ length: 30 }, (_, i) => `Name${i}`).join(',');
  assert.equal(parseNames(many).length, MAX_NAMES);
  assert.equal(parseNames(42).length, 0);
});

test('states: today and tomorrow per country, the followed names', async (t) => {
  const world = await createWorld({ config: FAMILY, at: '2027-07-25T10:00:00Z' });
  t.after(() => world.app.stop());
  const { gladys } = world;
  assert.equal(world.state(countryIds(gladys, 'de'), 'today'), 'Jakob, Valentina');
  assert.equal(
    world.state(countryIds(gladys, 'pl'), 'tomorrow'),
    'Anna, Baldev, Grażyna, Mirosława',
  );
  assert.equal(world.state(followedIds(gladys), 'today'), 'Jakob');
  assert.equal(
    world.state(followedIds(gladys), 'next'),
    'Anna (Allemagne, Pologne) · lundi 26 juillet 2027, demain',
  );
  assert.deepEqual(gladys.fake.connectionStatus.connected, true);
});

test('a day without a name and a name in no calendar still give a text', async (t) => {
  const world = await createWorld({
    config: { countries: ['cz'], names: 'Kevinator', language: 'en' },
    at: '2027-10-28T10:00:00Z', // a Czech public holiday: no name
  });
  t.after(() => world.app.stop());
  assert.equal(world.state(countryIds(world.gladys, 'cz'), 'today'), 'No name day');
  assert.equal(world.state(followedIds(world.gladys), 'today'), 'Nobody');
  assert.equal(world.state(followedIds(world.gladys), 'next'), 'Not in the calendars');
});

test('scene events: each followed name, the day and the day before, every hour', async (t) => {
  const world = await createWorld({
    config: { countries: ['de', 'pl'], names: 'Anna, Grażyna, Zofia' },
    at: '2027-07-25T21:30:00Z', // 23:30 in Berlin, the eve of 26 July
  });
  t.after(() => world.app.stop());
  await world.runUntil('2027-07-26T06:30:00Z'); // 08:30 in Berlin
  const events = world.gladys.fake.sceneEvents.map(({ key, data }) => ({ key, ...data }));
  // Started 30 minutes into 23:00: that hour is skipped (no catch-up past
  // 10 minutes), then 00:00 to 08:00 of the day fire.
  const today = events.filter((event) => event.key === 'followed_nameday');
  assert.deepEqual([...new Set(today.map((event) => event.hour))], [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(
    today.filter((event) => event.hour === 8),
    [
      {
        key: 'followed_nameday',
        hour: 8,
        name: 'Anna',
        countries: 'Allemagne, Pologne',
        date: 'lundi 26 juillet 2027',
      },
      {
        key: 'followed_nameday',
        hour: 8,
        name: 'Grażyna',
        countries: 'Pologne',
        date: 'lundi 26 juillet 2027',
      },
    ],
  );
  assert.equal(events.filter((event) => event.key === 'followed_nameday_eve').length, 0);
});

test('a restart neither repeats nor loses the hour', async (t) => {
  const store = createMemoryStore();
  const config = { countries: ['de'], names: 'Anna' };
  const first = await createWorld({ config, store, at: '2027-07-26T06:02:00Z' }); // 08:02
  await first.app.stop();
  assert.equal(first.gladys.fake.sceneEvents.length, 1, 'fired within the catch-up minutes');
  // Back at 08:05: the hour was fired, not again.
  const second = await createWorld({ config, store, at: '2027-07-26T06:05:00Z' });
  await second.app.stop();
  assert.equal(second.gladys.fake.sceneEvents.length, 0);
  // Back at 09:30: too late for 09:00, nothing until 10:00.
  const third = await createWorld({ config, store, at: '2027-07-26T07:30:00Z' });
  t.after(() => third.app.stop());
  assert.equal(third.gladys.fake.sceneEvents.length, 0);
  await third.runUntil('2027-07-26T08:01:00Z');
  assert.deepEqual(
    third.gladys.fake.sceneEvents.map((event) => event.data.hour),
    [10],
  );
});

test('the spring-forward night skips 02:00, the clock goes on', async (t) => {
  // Guntram: 28 March in Germany, the night clocks jump from 02:00 to 03:00.
  const world = await createWorld({
    config: { countries: ['de'], names: 'Guntram' },
    at: '2027-03-27T22:30:00Z',
  });
  t.after(() => world.app.stop());
  await world.runUntil('2027-03-28T03:30:00Z');
  const hours = world.gladys.fake.sceneEvents
    .filter((event) => event.key === 'followed_nameday')
    .map((event) => event.data.hour);
  assert.deepEqual(hours, [0, 1, 3, 4, 5]);
  assert.equal(world.service.today(), '2027-03-28');
});

test('midnight republishes every state, unchanged ones included', async (t) => {
  const world = await createWorld({ config: FAMILY, at: '2027-08-20T21:50:00Z' });
  t.after(() => world.app.stop());
  const followedNext = followedIds(world.gladys).feature('next');
  const count = () =>
    world.gladys.fake.states.filter((state) => state.device_feature_external_id === followedNext)
      .length;
  assert.equal(count(), 1);
  await world.runUntil('2027-08-20T22:01:00Z'); // midnight in Berlin
  assert.equal(count(), 2);
});

test('a new configuration republishes the devices; no names, no followed device', async (t) => {
  const world = await createWorld({ config: FAMILY });
  t.after(() => world.app.stop());
  assert.equal(world.gladys.fake.discoveredDevices.length, 4);
  await world.gladys.fake.configUpdated({ countries: ['fi'], names: '' });
  const devices = world.gladys.fake.discoveredDevices;
  assert.deepEqual(
    devices.map((device) => device.external_id),
    [countryIds(world.gladys, 'fi').device],
  );
  assert.ok(world.state(countryIds(world.gladys, 'fi'), 'today'));
  assert.ok(world.gladys.fake.widgetRefreshes.length >= 2);
});

test('a device added in Gladys gets its states again, and the widget a refresh', async (t) => {
  const world = await createWorld({ config: FAMILY });
  t.after(() => world.app.stop());
  const [device] = world.gladys.fake.discoveredDevices;
  const states = world.gladys.fake.states.length;
  const refreshes = world.gladys.fake.widgetRefreshes.length;
  await world.gladys.fake.deviceCreated(device);
  assert.ok(world.gladys.fake.states.length > states);
  assert.ok(world.gladys.fake.widgetRefreshes.length > refreshes);
});

test('"Find a name": its days and the next one, in green; an unknown name in red', async (t) => {
  const world = await createWorld({ config: FAMILY, at: '2027-07-25T10:00:00Z' });
  t.after(() => world.app.stop());
  const found = await world.gladys.fake.action('find_name', { name: 'anna' });
  assert.equal(found.success, true);
  assert.equal(
    found.data.message.fr,
    [
      'Fêtes de anna :',
      '- Allemagne : 9 février, 26 juillet',
      '- Pologne : 26 juillet, 7 août',
      '- Suède : 9 décembre',
      'Prochaine fête : lundi 26 juillet 2027 (demain).',
    ].join('\n'),
  );
  assert.match(found.data.message.en, /^Name days of anna:\n- Germany: February 9, July 26/);

  const unknown = await world.gladys.fake.action('find_name', { name: 'Kevinator' });
  assert.equal(unknown.success, false);
  assert.match(unknown.error.fr, /Kevinator ne figure dans aucun des calendriers/);
  assert.match(unknown.error.de, /Kevinator steht in keinem/);

  const empty = await world.gladys.fake.action('find_name', { name: '  ' });
  assert.equal(empty.success, false);
  assert.equal(empty.error.fr, 'Saisissez un prénom.');
});

test('"Check the followed names": the next of each, the missing ones', async (t) => {
  const world = await createWorld({
    config: { ...FAMILY, names: 'Zofia, Kevinator, Jakob' },
    at: '2027-07-25T10:00:00Z',
  });
  t.after(() => world.app.stop());
  const ack = await world.gladys.fake.action('check_names', {});
  assert.equal(ack.success, true);
  assert.equal(
    ack.data.message.en,
    [
      'Calendars: Germany, Poland, Sweden.',
      '- Jakob: Sunday, July 25, 2027 (today, Germany, Sweden)',
      '- Zofia: Thursday, September 30, 2027 (in 67 days, Poland)',
      '',
      'Absent from the calendars (check the spelling, or try another country):',
      'Kevinator',
    ].join('\n'),
  );

  await world.gladys.fake.configUpdated({ countries: ['de'], names: '' });
  const none = await world.gladys.fake.action('check_names', {});
  assert.equal(none.success, false);
  assert.match(none.error.fr, /Aucun prénom suivi/);
});

test('scene actions: the names of a date, the next name day of a name', async (t) => {
  const world = await createWorld({ config: FAMILY, at: '2027-07-25T10:00:00Z' });
  t.after(() => world.app.stop());
  const tomorrow = await world.gladys.fake.sceneAction('get_namedays', {
    country: 'pl',
    days_ahead: 1,
  });
  assert.deepEqual(tomorrow.data.outputs, {
    date: '2027-07-26',
    names: 'Anna, Baldev, Grażyna, Mirosława',
    followed: 'Anna',
    has_followed: 1,
  });
  const far = await world.gladys.fake.sceneAction('get_namedays', {
    country: 'zz',
    days_ahead: 5000,
  });
  assert.equal(far.data.outputs.date, '2028-07-25'); // 366 days at most, first country
  const quiet = await world.gladys.fake.sceneAction('get_namedays', {
    country: 'cz',
    days_ahead: 95, // 28 October: a Czech holiday, no name
  });
  assert.deepEqual(quiet.data.outputs, {
    date: '2027-10-28',
    names: '',
    followed: '',
    has_followed: 0,
  });

  const next = await world.gladys.fake.sceneAction('next_nameday', { name: 'zofia' });
  assert.deepEqual(next.data.outputs, {
    date: '2027-09-30',
    date_text: 'jeudi 30 septembre 2027',
    days: 67,
    countries: 'Pologne',
  });
  const missing = await world.gladys.fake.sceneAction('next_nameday', { name: 'Kevinator' });
  assert.deepEqual(missing.data.outputs, { date: '', date_text: '', days: -1, countries: '' });
});

test('the widget: valid content in every language, within the core budget', async (t) => {
  const world = await createWorld({
    config: {
      countries: ['at', 'cz', 'de', 'dk', 'ee', 'fi', 'hu', 'lt', 'lv', 'pl', 'se', 'sk'],
      names: 'Anna, Zofia, Jakob, Kevinator, Erik, Mari, Jana, Péter, Lukas',
    },
    at: '2027-07-25T10:00:00Z',
  });
  t.after(() => world.app.stop());
  for (const language of ['en', 'fr', 'de', 'es', 'it']) {
    const ack = await world.gladys.fake.widgetGet('namedays', { language, settings: {} });
    const { content } = ack.data;
    assert.deepEqual(validateWidgetContent(content), [], language);
    assert.ok(content.components.length <= 8);
    assert.ok(content.components.filter((c) => c.type === 'text').length <= 2);
    for (const list of content.components.filter((c) => c.type === 'card-list')) {
      assert.ok(list.items.length <= 8);
      for (const item of list.items) {
        assert.ok(item.title.length <= 60, item.title);
      }
    }
  }
  const de = (await world.gladys.fake.widgetGet('namedays', { language: 'de' })).data.content;
  assert.deepEqual(
    de.components.map((c) => c.type),
    ['status', 'card-list'],
  );
  // Twelve countries: today only, the first ten.
  const rows = de.components[0].items;
  assert.equal(rows.length, 10);
  assert.deepEqual(rows[0], {
    label: 'Österreich · Heute',
    value: 'Jakobus, Thomas, Valentina',
    icon: 'gift',
    color: 'success',
  });
  // Long lists: cut on a whole name.
  const polish = rows.find((row) => row.label.startsWith('Polen'));
  assert.equal(polish.value, 'Jakub, Krzysztof, Sławosz, Walentyna');
  for (const row of rows) {
    assert.ok(row.value.length <= 40 && row.label.length <= 40, row.value);
  }
  const followed = de.components[1].items;
  assert.equal(followed.length, 5);
  assert.deepEqual(followed[0].badge, { text: 'Heute', color: 'success' });
  assert.equal(followed[0].title, 'Jakob');

  const reduced = (
    await world.gladys.fake.widgetGet('namedays', {
      language: 'en',
      settings: { show_tomorrow: false, show_followed: false },
    })
  ).data.content;
  assert.equal(reduced.components.length, 1);
});

test('the widget shows tomorrow while the countries fit, and cuts long lists', async (t) => {
  const world = await createWorld({
    config: { countries: ['de', 'ee', 'lt'] },
    at: '2027-01-19T10:00:00Z', // 13 Estonian names
  });
  t.after(() => world.app.stop());
  const { content } = (await world.gladys.fake.widgetGet('namedays', { language: 'en' })).data;
  const rows = content.components[0].items;
  assert.deepEqual(
    rows.map((row) => row.label),
    [
      'Germany · Today',
      'Germany · Tomorrow',
      'Estonia · Today',
      'Estonia · Tomorrow',
      'Lithuania · Today',
      'Lithuania · Tomorrow',
    ],
  );
  for (const row of rows) {
    assert.ok(row.value.length <= 40, row.value);
    if (row.value.endsWith(' …')) {
      assert.match(row.value, /^[^,]+(, [^,]+)* …$/);
    }
  }
  assert.ok(
    rows.some((row) => row.value.endsWith(' …')),
    'a list of names was cut',
  );
});

test('the widget without followed names says where to add them', async (t) => {
  const world = await createWorld({ config: { countries: ['se'] } });
  t.after(() => world.app.stop());
  const { content } = (await world.gladys.fake.widgetGet('namedays', { language: 'fr' })).data;
  assert.deepEqual(validateWidgetContent(content), []);
  assert.equal(content.components.at(-1).type, 'text');
  assert.match(content.components.at(-1).text, /Aucun prénom suivi/);
});

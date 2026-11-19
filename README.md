# Name Days for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) external integration for the **name days** of twelve
European countries (Namenstag, imieniny, namnsdag, svátek, meniny, névnap, navnedag, nimipäivä,
nimepäev, vārda diena, vardadienis): the names celebrated today and tomorrow, and a reminder on the name
day of your family and friends.

Countries: Germany, Austria, Poland, Sweden, Czechia, Slovakia, Hungary, Denmark, Finland, Estonia,
Latvia and Lithuania. For the French calendar ("fête du jour"), see
[Fête du jour](https://github.com/William-De71/gladys-fete-du-jour), by William-De71: this integration
covers the other countries.

## Features

- **A device per country**: the names celebrated today and tomorrow (text).
- **Followed names** (up to 20): a device with the followed names celebrated today and the next name day
  ("Anna (Germany, Poland) · Monday 26 July 2027, tomorrow").
- **Scene triggers**: name day of a followed name, and the day before, at the hour you choose, optionally
  for one name.
- **Scene actions**: the names of a date in a country (for a morning message), and the next name day of
  a name.
- **Dashboard widget**: today's and tomorrow's names per country, the next name days of the followed
  names with the days left.
- **Configuration actions**: find a name (its days in each country), check the followed names.
- Four languages: English, French, German, Spanish.

## Requirements

- Gladys Assistant 5.3.0 or later.
- Nothing else: the calendars are built into the image, no account and no internet access are needed.

## Installation

1. In Gladys, open **Integrations → Install from GitHub** and enter
   `https://github.com/guim31/gladys-namedays`.
2. In the **Configuration** tab, tick the countries and write the followed names. Save.
3. In the **Discover** tab, add the devices.

The full user documentation is in [English](docs/en.md), [French](docs/fr.md), [German](docs/de.md)
and [Spanish](docs/es.md).

## How it works

- The data (`src/data/namedays.json`) is built by `scripts/build-data.mjs` from the file of
  [nameday-api](https://github.com/xnekv03/nameday-api) (nameday.abalin.net), pinned to a commit. The
  upstream file mixes names with public holidays ("Nový rok", "Nyårsdagen"), saint days and
  abbreviations ("Johannes B.", "u."): the script keeps the names only, with fixes written by hand.
- Names are compared without case nor accents, and a compound entry ("Maria Magdalena") is found by each
  of its words. February 29 names are celebrated in leap years only.
- A day starts at midnight in the time zone Gladys gives the container (`TZ`). A clock ticks every
  minute, republishes every state once a day (Gladys flags a value older than 48 hours as outdated) and
  fires the scene triggers of each new hour; the devices are published with `should_poll: false`.
- Scene triggers carry the hour as a filter (an equality, the only comparison scene filters offer): the
  integration fires each trigger once an hour on the days concerned, one event per followed name.

## Limitations

- The calendars may differ from the one you use on some days; the upstream data has a few gaps (a public
  holiday without a name, a day marked "n/a"). Feedback welcome in the issues or on the forum.
- Croatia, Italy, Spain, Greece, Bulgaria and Russia are not offered: the upstream data for them is a
  list of saints or mostly empty, and Greek name days often depend on Easter. France is covered by
  Fête du jour.
- The widget shows ten rows at most: today and tomorrow up to five countries, today only beyond.

## Development

```bash
npm ci
npm run format:check && npm run lint && npm test
node scripts/build-data.mjs /path/to/namedays.json <commit>   # rebuild the data
```

## Credits

- Name-day data: [nameday-api](https://github.com/xnekv03/nameday-api) by xnekv03
  (nameday.abalin.net), MIT License.
- Started from the official
  [integration template](https://github.com/GladysAssistant/integration-template-js).

## Disclaimer

Not affiliated with nameday.abalin.net nor with the authors of its data.

## License

Apache-2.0, see [LICENSE](LICENSE). The data in `src/data/namedays.json` is derived from nameday-api,
under the MIT License (copyright xnekv03).

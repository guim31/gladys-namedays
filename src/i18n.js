// -----------------------------------------------------------------------------
// Every text the code produces, in the four languages of the Gladys interface.
// German says "du", Spanish "usted". The devices have no user language: their
// names, their values and the scene texts follow the `language` setting; the
// widget gets the language of the person looking at it.
// -----------------------------------------------------------------------------

/** Device and feature names, frozen by Gladys when a device is created. */
export const NAMES = {
  en: {
    country: (country) => `Name days ${country}`,
    followed: 'Followed name days',
    today: 'Today',
    tomorrow: 'Tomorrow',
    followed_today: 'Celebrated today',
    followed_next: 'Next name day',
  },
  fr: {
    country: (country) => `Fêtes des prénoms ${country}`,
    followed: 'Fêtes des prénoms suivis',
    today: "Aujourd'hui",
    tomorrow: 'Demain',
    followed_today: "Fêtés aujourd'hui",
    followed_next: 'Prochaine fête',
  },
  de: {
    country: (country) => `Namenstage ${country}`,
    followed: 'Verfolgte Namenstage',
    today: 'Heute',
    tomorrow: 'Morgen',
    followed_today: 'Heute gefeiert',
    followed_next: 'Nächster Namenstag',
  },
  es: {
    country: (country) => `Onomásticas ${country}`,
    followed: 'Onomásticas seguidas',
    today: 'Hoy',
    tomorrow: 'Mañana',
    followed_today: 'Celebrados hoy',
    followed_next: 'Próxima onomástica',
  },
};

/** The values of the text features and of the scene outputs. */
export const VALUE_TEXT = {
  en: {
    noName: 'No name day',
    nobody: 'Nobody',
    notFound: 'Not in the calendars',
    when: (days) => (days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`),
  },
  fr: {
    noName: 'Aucun prénom fêté',
    nobody: 'Personne',
    notFound: 'Absent des calendriers',
    when: (days) => (days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours`),
  },
  de: {
    noName: 'Kein Namenstag',
    nobody: 'Niemand',
    notFound: 'Nicht in den Kalendern',
    when: (days) => (days === 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} Tagen`),
  },
  es: {
    noName: 'Ninguna onomástica',
    nobody: 'Nadie',
    notFound: 'No está en los calendarios',
    when: (days) => (days === 0 ? 'hoy' : days === 1 ? 'mañana' : `dentro de ${days} días`),
  },
};

/** The dashboard widget. */
export const WIDGET_TEXT = {
  en: {
    today: 'Today',
    tomorrow: 'Tomorrow',
    badgeToday: 'Today',
    badgeTomorrow: 'Tomorrow',
    badgeDays: (days) => `In ${days} days`,
    noFollowed: 'No followed name: add some in the configuration of the integration.',
    moreCountries: (countries) => `Not shown here: ${countries} (see their devices).`,
  },
  fr: {
    today: "Aujourd'hui",
    tomorrow: 'Demain',
    badgeToday: "Aujourd'hui",
    badgeTomorrow: 'Demain',
    badgeDays: (days) => `Dans ${days} j`,
    noFollowed: "Aucun prénom suivi : ajoutez-en dans la configuration de l'intégration.",
    moreCountries: (countries) => `Non affichés ici : ${countries} (voir leurs appareils).`,
  },
  de: {
    today: 'Heute',
    tomorrow: 'Morgen',
    badgeToday: 'Heute',
    badgeTomorrow: 'Morgen',
    badgeDays: (days) => `In ${days} Tagen`,
    noFollowed: 'Kein verfolgter Name: füge welche in der Konfiguration der Integration hinzu.',
    moreCountries: (countries) => `Hier nicht angezeigt: ${countries} (siehe ihre Geräte).`,
  },
  es: {
    today: 'Hoy',
    tomorrow: 'Mañana',
    badgeToday: 'Hoy',
    badgeTomorrow: 'Mañana',
    badgeDays: (days) => `En ${days} días`,
    noFollowed: 'Ningún nombre seguido: añada algunos en la configuración de la integración.',
    moreCountries: (countries) => `No se muestran aquí: ${countries} (vea sus dispositivos).`,
  },
};

/** The answers of the actions of the Configuration screen. */
export const ACTION_TEXT = {
  en: {
    missingName: 'Type a first name.',
    notFound: (name, countries) => `${name} is in none of the calendars selected (${countries}).`,
    found: (name) => `Name days of ${name}:`,
    next: (date, when) => `Next: ${date} (${when}).`,
    noNames: 'No followed name: write some in the "Followed names" field, then save.',
    checkHeader: (countries) => `Calendars: ${countries}.`,
    missing: 'Absent from the calendars (check the spelling, or try another country):',
  },
  fr: {
    missingName: 'Saisissez un prénom.',
    notFound: (name, countries) =>
      `${name} ne figure dans aucun des calendriers choisis (${countries}).`,
    found: (name) => `Fêtes de ${name} :`,
    next: (date, when) => `Prochaine fête : ${date} (${when}).`,
    noNames: 'Aucun prénom suivi : écrivez-en dans le champ « Prénoms suivis », puis enregistrez.',
    checkHeader: (countries) => `Calendriers : ${countries}.`,
    missing: "Absents des calendriers (vérifiez l'orthographe, ou essayez un autre pays) :",
  },
  de: {
    missingName: 'Gib einen Vornamen ein.',
    notFound: (name, countries) => `${name} steht in keinem der gewählten Kalender (${countries}).`,
    found: (name) => `Namenstage von ${name}:`,
    next: (date, when) => `Nächster: ${date} (${when}).`,
    noNames: 'Kein verfolgter Name: trage welche im Feld „Verfolgte Namen“ ein und speichere.',
    checkHeader: (countries) => `Kalender: ${countries}.`,
    missing: 'Nicht in den Kalendern (prüfe die Schreibweise oder versuch ein anderes Land):',
  },
  es: {
    missingName: 'Escriba un nombre.',
    notFound: (name, countries) =>
      `${name} no figura en ninguno de los calendarios elegidos (${countries}).`,
    found: (name) => `Onomásticas de ${name}:`,
    next: (date, when) => `Próxima: ${date} (${when}).`,
    noNames: 'Ningún nombre seguido: escriba algunos en el campo «Nombres seguidos» y guarde.',
    checkHeader: (countries) => `Calendarios: ${countries}.`,
    missing: 'Ausentes de los calendarios (compruebe la ortografía o pruebe otro país):',
  },
};

/** "Label: value", with the space French puts before a colon. */
export function labelled(label, value, language) {
  return `${label}${language === 'fr' ? ' :' : ':'} ${value}`;
}

/** The connection status when the start failed (an object, never a string). */
export const INIT_FAILED = {
  en: 'The integration could not start: see its logs.',
  fr: "L'intégration n'a pas pu démarrer : voir ses journaux.",
  de: 'Die Integration konnte nicht starten: sieh in ihre Protokolle.',
  es: 'La integración no pudo arrancar: consulte sus registros.',
};

/** One text per language, built by a function of the texts of a table. */
export function inEveryLanguage(table, build) {
  return Object.fromEntries(
    Object.entries(table).map(([language, text]) => [language, build(text, language)]),
  );
}

const regionNames = new Map();

/** The name of a country in a language ("Allemagne"), its code when unknown. */
export function countryName(code, language) {
  let names = regionNames.get(language);
  if (!names) {
    names = new Intl.DisplayNames([language], { type: 'region' });
    regionNames.set(language, names);
  }
  try {
    return names.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Country names joined: "Allemagne, Autriche". */
export function countryList(codes, language) {
  return codes.map((code) => countryName(code, language)).join(', ');
}

const dayFormatters = new Map();

/** A day of the year written for people: "26 juillet", "July 26". */
export function formatDayOfYear(day, language) {
  let formatter = dayFormatters.get(language);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(language, {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
    dayFormatters.set(language, formatter);
  }
  // 2000 is a leap year: 02-29 exists.
  return formatter.format(new Date(`2000-${day}T00:00:00Z`));
}

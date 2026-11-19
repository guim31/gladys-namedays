# Namenstage

Die Namenstage von zwölf europäischen Ländern in Gladys: die heute und morgen
gefeierten Namen und eine Erinnerung am Namenstag deiner Familie und deiner
Freunde. Deutschland, Österreich, Polen, Schweden, Tschechien, Slowakei,
Ungarn, Dänemark, Finnland, Estland, Lettland und Litauen. Für die
französischen „fêtes du jour“ gibt es die Integration **Fête du jour**.

## Was du brauchst

Nichts: Die Kalender sind in die Integration eingebaut. Kein Konto, keine
Internetverbindung, nichts verlässt dein Zuhause.

## Konfiguration

### Länder

Hake die zu verfolgenden Kalender an (standardmäßig Deutschland). Jedes Land
ergibt ein Gerät, und die verfolgten Namen werden in allen gesucht.

### Verfolgte Namen

Schreib die Vornamen deiner Familie und deiner Freunde, durch Kommas getrennt
(bis zu 20): `Anna, Lukas, Zofia`. Groß-/Kleinschreibung und Akzente sind
egal (`zofia`, `Žofia`). Ein Name wird auch in einem zusammengesetzten
Eintrag gefunden („Magdalena“ in „Maria Magdalena“). **Verfolgte Namen
prüfen** zeigt den nächsten Namenstag jedes Namens und die Namen, die in
keinem der gewählten Kalender stehen.

### Sprache

Die Sprache der Geräte- und Funktionsnamen, der Daten und der an Szenen
gesendeten Texte (standardmäßig Französisch). Gladys legt die Namen beim
Hinzufügen eines Geräts fest: Um sie nach einer Änderung umzubenennen,
lösche das Gerät und füge es erneut hinzu.

## Geräte

Füge nach dem Speichern die Geräte im Tab **Entdecken** hinzu:

- **Namenstage <Land>**, eins pro Land: **Heute** und **Morgen**, die
  gefeierten Namen (wie im Kalender des Landes geschrieben).
- **Verfolgte Namenstage**, wenn du Namen verfolgst: **Heute gefeiert** (die
  heute gefeierten verfolgten Namen oder „Niemand“) und **Nächster
  Namenstag** (wer, wann, wo: „Anna (Deutschland, Polen) · Montag, 26. Juli
  2027, morgen“).

Die Werte wechseln um Mitternacht, in der Zeitzone von Gladys.

## Dashboard-Widget

Das Widget **Namenstage** zeigt pro Land die Namen von heute und morgen (ab
sechs Ländern nur heute, höchstens zehn Zeilen; eine lange Liste wird bei
einem ganzen Namen gekürzt), dann die nächsten Namenstage der verfolgten
Namen mit den verbleibenden Tagen. Seine Einstellungen blenden morgen oder
die verfolgten Namen aus und legen fest, wie viele verfolgte Namen angezeigt
werden (1 bis 8).

## Szenenauslöser

- **Namenstag eines verfolgten Namens**: löst am Namenstag jedes verfolgten
  Namens zur gewählten Uhrzeit aus (standardmäßig 08:00).
- **Vortag eines verfolgten Namenstags**: löst am Vortag zur gewählten
  Uhrzeit aus (standardmäßig 18:00): Zeit, Blumen zu kaufen.

Beide haben einen optionalen Filter **Vorname**: einer der verfolgten Namen,
geschrieben wie in der Konfiguration; leer, jeder verfolgte Name. Ein Name,
der am selben Tag in zwei Ländern gefeiert wird, löst einmal aus. Die Szene
kann den Vornamen, die Länder und das Datum in ihren Nachrichten verwenden.

## Szenenaktionen

- **Namenstage eines Datums**: die in einem Land heute, morgen oder bis zu
  366 Tage später gefeierten Namen, für eine Nachricht; dazu die an diesem
  Tag gefeierten verfolgten Namen und ein Ja/Nein (1 = ja, 0 = nein) für ein
  „Nur fortsetzen, wenn“.
- **Nächster Namenstag eines Namens**: wann ein Vorname (oder eine
  Szenenvariable) in den gewählten Ländern das nächste Mal gefeiert wird: das
  Datum, das Datum ausgeschrieben, die verbleibenden Tage (-1, wenn der Name
  in keinem Kalender steht) und die Länder.

## Szenenbeispiele

- „Namenstag eines verfolgten Namens“ um 08:00 → Nachricht senden: „Heute hat
  {Vorname} Namenstag ({Länder})“.
- Jeden Morgen um 07:30 → „Namenstage eines Datums“ (Deutschland, 0 Tage) →
  Nachricht senden: „Heute feiern wir {Namen}“.

## Aktionen der Konfigurationsseite

- **Namen suchen**: die Tage, an denen ein Vorname in jedem gewählten Land
  gefeiert wird, und der nächste.
- **Verfolgte Namen prüfen**: der nächste Namenstag jedes verfolgten Namens
  und die Namen, die in den Kalendern fehlen.

## Fehlerbehebung

- Ein verfolgter Name wird nie gefeiert: Starte **Verfolgte Namen prüfen**;
  die Schreibweise kann vom Kalender des Landes abweichen (Jakob, Jakub),
  oder der Name wird nur in einem anderen Land gefeiert.
- Die Szene startet nicht: Prüfe die Uhrzeit des Auslösers und dass der
  Filter **Vorname** wie in der Konfiguration geschrieben ist (oder leer).
- Die Protokolle der Integration zeigen ihren Start und die ausgeführten
  Aktionen; `LOG_LEVEL=debug` für mehr.

## Grenzen

- Die Kalender stammen aus den Daten von nameday.abalin.net und können an
  manchen Tagen von deinem Kalender abweichen; dort aufgeführte Feiertage und
  Heiligentage werden weggelassen. Rückmeldungen sind im Forum oder auf
  GitHub willkommen.
- Die Namen vom 29. Februar werden nur in Schaltjahren gefeiert.
- Kroatien, Italien, Spanien, Griechenland, Bulgarien und Russland werden
  nicht angeboten: Die Daten dieser Länder sind dort eine Heiligenliste oder fast leer,
  und griechische Namenstage hängen oft von Ostern ab.

## Danksagung

Namenstagsdaten: [nameday-api](https://github.com/xnekv03/nameday-api) von
xnekv03 (nameday.abalin.net), MIT-Lizenz.

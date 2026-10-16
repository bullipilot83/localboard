# localboard

**Deutsch** | [English](README.en.md)

local web dashboard, without any hosting or installation

**Version 1.4** · Ein portables Browser-Dashboard für Links, Systeme und Standorte.

## Live-Demo

[**Dashboard im Browser ausprobieren →**](https://bullipilot83.github.io/localboard/)

Die Demo bietet dieselben Funktionen wie die lokale Version. Jeder Besucher
arbeitet mit seinem eigenen Browserspeicher; Änderungen am Dashboard werden
nicht mit anderen Besuchern geteilt oder ins Repository geschrieben.
Die Demo und die heruntergeladene HTML-Datei haben getrennte Speicherstände.
Zum Übernehmen der Daten JSON exportieren und lokal importieren.

### Einmalige Aktivierung durch den Repository-Inhaber

Der Demo-Einstieg ist vorbereitet. Falls die Adresse noch einen Fehler 404 zeigt:
Unter **Settings → Pages → Build and deployment** als Quelle
**Deploy from a branch**, Branch **main** und Ordner **/ (root)** wählen und
**Save** anklicken. Nach erfolgreicher Veröffentlichung ist die Demo erreichbar.
Spätere Änderungen an `startpage.html` werden mit der nächsten Pages-Veröffentlichung
auch online verfügbar. `index.html` leitet auf diese Datei weiter; es gibt keine
separate Kopie des Dashboards zu pflegen.

## Schnellstart

1. Über **Code → Download ZIP** herunterladen und entpacken.
2. `startpage.html` im Browser öffnen.
3. Mit **＋ Link hinzufügen** starten.

Keine Installation, kein Docker, kein Webserver und keine externen Bibliotheken.
Die Anwendung funktioniert offline; verlinkte Systeme benötigen Netzwerkzugriff.

## Sprachen

Deutsch, Englisch, Französisch, Spanisch, Italienisch und Niederländisch sind
vollständig offline enthalten. Beim ersten Start wird die erste unterstützte
Browsersprache gewählt; ohne passenden Eintrag wird Englisch verwendet.
Oben lässt sich die Sprache jederzeit auswählen. Die Auswahl bleibt im
Browserspeicher erhalten und wird mit JSON- und HTML-Exporten übertragen.
Eigene Namen sowie bereits gespeicherte Beispielgruppen werden nicht übersetzt.
Ältere Sicherungen ohne Spracheinstellung übernehmen die aktuell ausgewählte Sprache.

## Dashboard-Titel

In der **Übersicht** den Bearbeitungsmodus aktivieren und neben der Überschrift
**Titel bearbeiten** wählen. Ein eigener Titel bleibt in allen Sprachen gleich.
Das Feld leeren und speichern, um wieder den automatisch übersetzten Standardtitel
zu verwenden. Alte gespeicherte Standardtitel werden automatisch umgestellt;
bereits vorhandene individuelle Titel bleiben erhalten.

## Faltbare Seitenleiste

Mit **▾ / ▸** neben einer Gruppe ihre Untergruppen aus- oder einblenden.
Auch verschachtelte Untergruppen lassen sich einzeln zuklappen. **Alle aufklappen**
und **Alle zuklappen** steuern den gesamten Baum. Dafür ist kein Bearbeitungsmodus
nötig. Der Zustand bleibt nach dem Neuladen erhalten und wird mitexportiert.
Ein Klick auf einen Gruppennamen öffnet weiterhin die Gruppe; das Falten verändert
nur die Seitenleiste. Beim Öffnen einer versteckten Untergruppe über ihre Tabs
werden deren übergeordnete Gruppen automatisch aufgeklappt.

## Design, Hell/Dunkel und automatische Umschaltung

Oben unter **Darstellung** zwischen **Dunkel**, **Hell**, **Betriebssystem**,
**Uhrzeit** und **Sonnenstand** wechseln. Vorhandene Dashboards behalten zunächst
wie bisher das dunkle Design.

Für Firmenfarben **Bearbeiten → Design** öffnen. Hell und Dunkel besitzen jeweils
eine eigene Palette für Seitenhintergrund, Kacheln/Dialoge, Seitenleiste, Text,
sekundären Text, Akzente und Rahmen. Farben können mit dem Farbwähler oder als
HEX-Wert eingegeben werden. Die ausgewählte Palette wird direkt als Vorschau
angezeigt. **Speichern** übernimmt sie; **Abbrechen** oder Escape stellt das
bisherige Design wieder her. Jede Palette lässt sich separat zurücksetzen.
Bei geringem Textkontrast erscheint ein Hinweis.

- **Betriebssystem:** folgt der Hell-/Dunkel-Einstellung des Geräts.
- **Uhrzeit:** zwei Schaltzeiten, bezogen auf die aktuelle Gerätezeitzone.
- **Sonnenstand:** nutzt manuell eingegebene Koordinaten oder die ausdrücklich
  angeforderte Browserposition. Berechnet den Tag-/Nachtzustand näherungsweise
  lokal nach den [NOAA-Sonnenstandsformeln](https://gml.noaa.gov/grad/solcalc/solareqns.PDF).
  Kein Wetterdienst und kein API-Schlüssel nötig. Die Standortabfrage selbst
  hängt von Browserberechtigung und verfügbaren Ortungsdiensten ab. Ohne
  nutzbare Koordinaten in einer importierten Konfiguration gilt der Uhrzeitplan;
  die Statuszeile weist darauf hin.

Automatische Modi werden minütlich sowie bei Rückkehr zum Dashboard neu geprüft.
Farben, Modus, Zeiten und gegebenenfalls Koordinaten werden im Browser gespeichert
und mit JSON/HTML exportiert. CSS-Variablen ändern das Design zur Laufzeit; lokale
Quelldateien werden nicht überschrieben.

## Funktionen

- Links per Dialog oder Drag & Drop einer Webadresse hinzufügen.
- Gruppen und beliebig verschachtelte Untergruppen mit frei wählbaren Namen.
- Gruppen als Tabs öffnen und mit **↑ / ↓** im Bearbeitungsmodus sortieren.
- Kachel-, Listen- und Kartenansicht je Gruppe.
- Eigene Kartenbilder und prozentual positionierte Links.
- Eigene Icons oder optionale Favicons direkt vom Zielserver.
- Bearbeitungsmodus und Bestätigung vor Löschungen.
- Suche nach Linknamen, Adressen und Gruppenpfaden.
- JSON-Import/Export sowie eigenständiger HTML-Export mit eingebetteten Bildern.

## Daten und Netzwerkfreigaben

Änderungen werden im lokalen Browserprofil gespeichert, **nicht in die HTML-Datei
zurückgeschrieben**. Bei `file://` ist das Speicherverhalten browserabhängig.
Regelmäßige JSON-Sicherungen sind deshalb wichtig, insbesondere vor Updates,
Browserwechseln und dem Verschieben der Startdatei.

Ein HTML-Export enthält Anwendung und Dashboard-Daten. Er kann auf einem
Netzlaufwerk bereitgestellt werden. Zum Verteilen neuer Änderungen erneut
exportieren und die Datei manuell ersetzen. Es gibt keine automatische
Synchronisation und keine gleichzeitige Mehrbenutzerbearbeitung.

Der Bearbeitungsmodus schützt vor Fehlbedienung; er ist keine Authentifizierung.
Kamera-Links öffnen deren Weboberfläche, keine eingebetteten Live-Streams.

Eigene Icons und Kartenbilder werden eingebettet. Optionale Favicons werden
über `/favicon.ico` vom jeweiligen Zielserver geladen; ohne erreichbares Icon
erscheint der Anfangsbuchstabe. Keine externen Icon-Dienste oder Telemetrie.

## Dateien

| Pfad | Zweck |
| --- | --- |
| `startpage.html` | Vollständige Einzeldatei zum direkten Öffnen |
| `source/startpage.html` | HTML-Quelle mit separatem JavaScript und CSS |
| `source/app.js` | Anwendungslogik |
| `source/appearance.js` | Farbpaletten, Zeitplan und lokale Sonnenstandsberechnung |
| `source/i18n.js` | Sprachtexte und Spracherkennung für alle sechs Sprachen |
| `source/style.css` | Gestaltung |
| `scripts/build.mjs` | Einzeldatei aus den Quellen erzeugen |
| `tests/*.test.mjs` | Tests für Sprachen, Design, Zeitpläne, Datenmigration und Export |
| `ANLEITUNG.txt` | Ausführliche Bedienung, Grenzen und Update-Hinweise |

## Entwicklung

Quellen in `source/` bearbeiten. Mit Node.js lässt sich anschließend die
Einzeldatei neu erzeugen:

```sh
node scripts/build.mjs
node --check source/app.js
node --test tests/*.test.mjs
```

Node.js wird nur für diesen Entwicklungsschritt benötigt. Die fertige Anwendung
benötigt keine Runtime-Installation. Alternativ `source/startpage.html` direkt
öffnen; der HTML-Export dieser Quellvariante kann durch lokale Dateizugriffsregeln
blockiert werden. Für HTML-Exporte die gebündelte `startpage.html` verwenden.

## Aktualisieren

Vorher **Export → JSON-Sicherung** im bisherigen Dashboard wählen. Danach die
neue `startpage.html` öffnen und bei Bedarf **Bearbeiten → Import** verwenden.
Alte HTML-Exporte enthalten den alten Programmcode; deren Daten per JSON in die
neue Anwendung übernehmen. JSON-Sicherungen aus Version 1.0 und 1.1 bleiben kompatibel.

## Prüfung

JavaScript-Syntax, Datenvalidierung, JSON-Roundtrip und Gruppensortierung wurden
automatisiert geprüft. Zusätzlich prüfen automatisierte Tests die Übersetzungskataloge,
Spracherkennung, Sprachwechsel, Dialogtexte, Datenübernahme und das eingebettete
Sprachpaket. Die Oberflächentests verwenden einen minimalen DOM-Adapter; ein
interaktiver Browser-End-to-End-Test steht noch aus.
Vor produktivem Einsatz lokale Speicherung, Bilder und beide Exportwege mit dem
verwendeten Browser testen.

## Lizenz

[CC0 1.0 Universal](LICENSE), entsprechend der vorhandenen Repository-Lizenz.

Im Bearbeiten-Modus öffnet **Logo & Layout** unter dem Logo die globalen Einstellungen: eigenes Logo (SVG/PNG/JPEG/WebP, lokal eingebettet) hochladen oder das Standardlogo wiederherstellen. **Hinweise in leeren Gruppen anzeigen** kann deaktiviert werden, damit leere Gruppen in Kachel- und Listenansicht nur als Überschrift erscheinen. Logo und Einstellung werden gespeichert und in JSON-/HTML-Exporte übernommen. Suchrückmeldungen bleiben sichtbar.

SVG-Logos bleiben Vektorgrafiken (max. 2 MB). Aktive Inhalte und externe Verweise werden entfernt; DOCTYPE-/Entitätsdeklarationen werden abgelehnt. SVG gilt nur für das eigene Logo.

Links können **Global / ohne Gruppe** zugeordnet werden. In der Übersicht ist dies beim Hinzufügen die Vorauswahl. Globale Links erscheinen oben in der Übersicht, nicht in einzelnen Standorten. Sie funktionieren auch ohne angelegte Gruppen und werden in Sicherungen und Standalone-Exporte übernommen.

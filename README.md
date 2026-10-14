# localboard

local web dashboard, without any hosting or installation

**Version 1.1** · Ein portables Browser-Dashboard für Links, Systeme und Standorte.

## Schnellstart

1. Über **Code → Download ZIP** herunterladen und entpacken.
2. `startpage.html` im Browser öffnen.
3. Mit **＋ Link hinzufügen** starten.

Keine Installation, kein Docker, kein Webserver und keine externen Bibliotheken.
Die Anwendung funktioniert offline; verlinkte Systeme benötigen Netzwerkzugriff.

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
| `source/style.css` | Gestaltung |
| `scripts/build.mjs` | Einzeldatei aus den Quellen erzeugen |
| `ANLEITUNG.txt` | Ausführliche Bedienung, Grenzen und Update-Hinweise |

## Entwicklung

Quellen in `source/` bearbeiten. Mit Node.js lässt sich anschließend die
Einzeldatei neu erzeugen:

```sh
node scripts/build.mjs
node --check source/app.js
```

Node.js wird nur für diesen Entwicklungsschritt benötigt. Die fertige Anwendung
benötigt keine Runtime-Installation. Alternativ `source/startpage.html` direkt
öffnen; der HTML-Export dieser Quellvariante kann durch lokale Dateizugriffsregeln
blockiert werden. Für HTML-Exporte die gebündelte `startpage.html` verwenden.

## Aktualisieren

Vorher **Export → JSON-Sicherung** im bisherigen Dashboard wählen. Danach die
neue `startpage.html` öffnen und bei Bedarf **Bearbeiten → Import** verwenden.
Alte HTML-Exporte enthalten den alten Programmcode; deren Daten per JSON in die
neue Anwendung übernehmen. JSON-Sicherungen aus Version 1.0 bleiben kompatibel.

## Prüfung

JavaScript-Syntax, Datenvalidierung, JSON-Roundtrip und Gruppensortierung wurden
automatisiert geprüft. Ein interaktiver Browser-End-to-End-Test steht noch aus.
Vor produktivem Einsatz lokale Speicherung, Bilder und beide Exportwege mit dem
verwendeten Browser testen.

## Lizenz

[CC0 1.0 Universal](LICENSE), entsprechend der vorhandenen Repository-Lizenz.

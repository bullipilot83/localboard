# localboard

[Deutsch](README.md) | **English**

local web dashboard, without any hosting or installation

**Version 1.2.1** · A portable browser dashboard for links, systems, and locations.

## Quick start

1. Download the project via **Code → Download ZIP** and extract it.
2. Open `startpage.html` in your browser.
3. Click **＋ Add link** to get started.

No installation, Docker, web server, or external libraries required.
The application works offline; linked systems require network access.

## Languages

German, English, French, Spanish, Italian and Dutch are included entirely offline.
On first launch, the first supported browser language is selected; if none
matches, the application defaults to English. Use the language selector at the
top to switch at any time. Your choice is saved in browser storage and included
in both JSON and HTML exports. Custom names and previously saved example groups
are never translated. Older backups without a language setting inherit the
currently selected language.

## Dashboard title

Open **Overview**, enable edit mode and select **Edit title** next to the heading.
A custom title stays the same in every language. Clear the field and save to
restore the automatically translated default. Older saved default titles are
migrated automatically; existing custom titles are preserved.

## Features

- Add links through a dialog or by dragging and dropping a web address.
- Custom group names and nested subgroups.
- Open groups as tabs and reorder them using **↑ / ↓** in edit mode.
- Tile, list, and map views for each group.
- Custom map images with links positioned using percentage coordinates.
- Custom icons or optional favicons loaded directly from the target server.
- Edit mode and confirmation before deleting items.
- Search link names, addresses, and group paths.
- JSON import/export and standalone HTML export with embedded images.

## Data storage and network shares

Changes are saved in your local browser profile, **not written back to the HTML
file**. Storage behavior for `file://` pages varies between browsers.
Export JSON backups regularly, especially before updating, switching browsers,
or moving the start page.

An HTML export contains both the application and your dashboard data. You can
place it on a network share. To distribute changes, export again and manually
replace the shared file. Automatic synchronization and simultaneous multi-user
editing are not supported.

Edit mode protects against accidental changes; it is not authentication.
Camera links open the camera's web interface rather than embedded live streams.

Custom icons and map images are embedded. Optional favicons are loaded from
`/favicon.ico` on each target server. If an icon cannot be loaded, the first
letter of the link name is displayed. No external icon services or telemetry
are used.

## Files

| Path | Purpose |
| --- | --- |
| `startpage.html` | Complete standalone file, ready to open |
| `source/startpage.html` | HTML source using separate JavaScript and CSS |
| `source/app.js` | Application logic |
| `source/i18n.js` | Translation catalogs and language detection for all six languages |
| `source/style.css` | Styling |
| `scripts/build.mjs` | Build the standalone file from the sources |
| `tests/i18n.test.mjs` | Language, migration and export tests |
| `ANLEITUNG.txt` | Detailed instructions, limitations, and update notes (German) |

## Development

Edit the files in `source/`, then use Node.js to rebuild the standalone file:

```sh
node scripts/build.mjs
node --check source/app.js
node --test tests/i18n.test.mjs
```

Node.js is only required for this development step. Running the finished
application requires no runtime installation. You can also open
`source/startpage.html` directly, but local file access restrictions may block
HTML export from this source version. Use the bundled `startpage.html` for
HTML exports.

## Updating

First, select **Export → JSON backup** in your existing
dashboard. Then open the new `startpage.html` and, if necessary, use
**Edit → Import** to restore your data.

Old HTML exports contain the old application code. Transfer their data into the
new application using JSON. JSON backups from versions 1.0 and 1.1 remain compatible.

## Validation

JavaScript syntax, data validation, JSON round-tripping, and group ordering have
been checked automatically. Additional automated tests cover translation catalogs,
language detection and switching, dialog text, data migration and the embedded
language bundle. UI logic tests use a minimal DOM adapter; interactive browser
end-to-end testing is still pending. Before production use, test local storage, images, and both export
formats in your chosen browser.

## License

[CC0 1.0 Universal](LICENSE), as specified in the repository's existing license.

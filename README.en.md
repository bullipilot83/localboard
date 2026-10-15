# localboard

[Deutsch](README.md) | **English**

local web dashboard, without any hosting or installation

**Version 1.4** · A portable browser dashboard for links, systems, and locations.

## Live demo

[**Try the dashboard in your browser →**](https://bullipilot83.github.io/localboard/)

The demo provides the same features as the local version. Each visitor uses
their own browser storage; dashboard changes are not shared with other visitors
or written to the repository. The demo and the downloaded HTML file have
separate storage. To transfer your data, export JSON and import it locally.

### One-time setup by the repository owner

The demo entry point is ready. If the address still returns 404, open
**Settings → Pages → Build and deployment**, select **Deploy from a branch**,
choose branch **main** and folder **/ (root)**, then click **Save**.
The demo becomes available after a successful deployment. Later changes to
`startpage.html` become available online with the next Pages deployment.
`index.html` redirects to that file, so there is no separate dashboard copy
to maintain.

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

## Collapsible sidebar

Use **▾ / ▸** next to a group to hide or show its subgroups. Nested subgroups can
be collapsed independently. **Expand all** and **Collapse all** control the entire
tree, without requiring edit mode. The state survives reloads and is included in
exports. Clicking a group name still opens that group; collapsing only affects
the sidebar. Opening a hidden subgroup through its tabs automatically expands
its ancestors.

## Appearance, light/dark themes and automatic switching

Use **Theme** at the top to choose **Dark**, **Light**, **System**, **Schedule**
or **Sunrise / sunset**. Existing dashboards retain the dark theme by default.

Open **Edit → Appearance** to customize your company colors. Dark and light each
have an independent palette for page background, tiles/dialogs, sidebar, text,
secondary text, accents and borders. Use the color picker or enter HEX values.
The selected palette is previewed immediately. **Save** applies it; **Cancel** or
Escape restores the saved design. Each palette can be reset separately. A warning
appears when text contrast is low.

- **System:** follows the device's light/dark preference.
- **Schedule:** two switch times in the device's current time zone.
- **Sunrise / sunset:** uses manually entered coordinates or explicitly requested
  browser geolocation. Day/night is approximated locally using the
  [NOAA solar position equations](https://gml.noaa.gov/grad/solcalc/solareqns.PDF).
  No weather service or API key is required. The geolocation request itself
  depends on browser permission and available positioning services. Imported
  solar settings without valid coordinates fall back to the time schedule,
  with a note in the status bar.

Automatic modes are checked every minute and when returning to the dashboard.
Colors, mode, times and any coordinates are stored in the browser and included in
JSON/HTML exports. CSS variables apply the design at runtime; local source files
are not overwritten.

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
| `source/appearance.js` | Palettes, schedules and local solar position calculation |
| `source/i18n.js` | Translation catalogs and language detection for all six languages |
| `source/style.css` | Styling |
| `scripts/build.mjs` | Build the standalone file from the sources |
| `tests/*.test.mjs` | Language, appearance, scheduling, migration and export tests |
| `ANLEITUNG.txt` | Detailed instructions, limitations, and update notes (German) |

## Development

Edit the files in `source/`, then use Node.js to rebuild the standalone file:

```sh
node scripts/build.mjs
node --check source/app.js
node --test tests/*.test.mjs
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

# Scripti Writer: developer notes

This folder holds the source code of Scripti Writer, a quiet, distraction-free writing app for
screenwriters and novelists. Writers download the Mac and Windows apps from the
[Releases page](https://github.com/FurosImage/Scripti-Writer/releases/latest); see the [main README](../README.md) for that.

The same code also builds as a web app that runs in any modern browser (PC, Mac, iPhone, iPad,
Android), installs like an app and works offline, if you host it yourself (see below). There is no
official hosted web version yet.

**What's in it**

- **Screenplay editor**: industry formatting, smart line types (Enter and Tab), autocomplete for
  characters, locations and times of day, highlights with comments, scene list, live page count.
- **Novel editor**: chapters and subheadings, scene breaks, chapter list, word count.
- **Drafts**: as many as you like, side by side in split screen. Deleting one shows an Undo button.
- **Page numbers** that follow the printed script, and a two-page **book view** for novels and
  notes (`src/pages.ts`).
- **Characters and locations** that fill in automatically from the script.
- **Corkboard** and a **brainstorm board** with notes, scene and character cards, shapes, pencil,
  arrows, connections, story beats and an act timeline. The tools sit in a floating bar at the
  bottom, undo, redo and zoom in one at the top. Pinch to zoom on touch screens.
- **Export**: "Everything (.zip)" puts the story in every format in one folder (PDF, Word, Final
  Draft, Fountain, text, a story bible and the Scripti Writer project file), ready for Windows or Mac.
  Screenplays also export alone as PDF (industry page format, optional scene numbers), Word,
  Final Draft (.fdx), Fountain and text. Novels export as a standard manuscript PDF, Word (.docx), Markdown or text.
- **Import**: Fountain, Final Draft and Scripti Writer backups. Imported stories are cleaned so a
  crafted file can't run code (`src/io/clean.ts`).
- **Backups**: one file with every story; restoring never overwrites anything.
- **Focus mode**, four looks (Night, Night Warm, Light, Light Warm) with a soft glow you can turn off, keyboard shortcuts (press `?`).
- **Find and replace** on the script and novel pages (`src/find.ts`).
- **Automatic backups** (desktop app): one file per day in Documents/Scripti Writer Backups or a
  folder the writer picks, refreshed every 1 to 60 minutes and 3 to 90 days kept, both chosen in
  the backups dialog (`src/backup.ts`, written by `desktop/main.cjs`, which also remembers the
  folder in `desktop-settings.json` in the app's data folder).
- **Update notice** (desktop app): checks GitHub for a newer release and offers a Download button,
  also on demand from Settings → Check for updates. Nothing installs by itself (`src/update.ts`).
- **Safe saving**: if the saved stories can't be read at start, the app stops and says so instead
  of starting empty, so nothing is overwritten. The desktop app waits for the last save before it
  closes, and files dropped on the window can't replace the app.
- **About** dialog with the version, license and feedback links.

## Run it on your computer

You need [Node.js](https://nodejs.org) 18 or newer (the LTS installer is fine on Windows).

```bash
npm install      # once
npm run dev      # opens Scripti Writer at http://localhost:5173
```

To try it on your phone while it runs on your PC (same Wi-Fi): `npm run dev -- --host`, then open
the "Network" address it prints in Safari or Chrome on the phone.

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run build`     | Typechecks, then builds the finished app into `dist/` |
| `npm run preview`   | Serves the built `dist/` folder to check it         |
| `npm run typecheck` | TypeScript check only                              |
| `npm run format`    | Formats `src/` with Prettier                       |

## Host the web version yourself

The built `dist/` folder is a plain static website. Any of these work, and all are free for
personal use:

- **Netlify**: connect the repository with this folder as the base directory (the included
  `netlify.toml` has the settings), or run `npm run build` and drag the `dist` folder onto
  [app.netlify.com/drop](https://app.netlify.com/drop).
- **Cloudflare Pages** or **Vercel**: build command `npm run build`, output folder `dist`.

The update notice only appears in the desktop app; the web version updates itself when it's
online.

## Install the web version like an app

Open your own Scripti Writer web address, then:

- **iPhone / iPad (Safari)**: Share button → **Add to Home Screen**.
- **Android (Chrome)**: menu → **Install app**.
- **Windows / Mac (Chrome or Edge)**: the install icon in the address bar, or **Install app** in the
  library.

Installed, it opens in its own window and works without an internet connection.

## Mac and Windows apps (.dmg and .exe)

The desktop app (Electron, in `desktop/`) wraps the built `dist/` folder with its own window and
menu bar (File, Edit, View, Window, Help). On a Mac, shortcuts use ⌘; on the brainstorm board,
two-finger scrolling moves the board and pinching zooms (⌘ + scroll also zooms).

**Build them on GitHub (no Mac or Windows PC needed):** in the repository, open **Actions → Build
installers → Run workflow**. The workflow (`.github/workflows/installers.yml`) builds the Mac .dmg
and the Windows setup .exe and publishes them as a Release named after the version in
`package.json`, with SHA-256 checksums.

**Build them on your own computer:** `npm install`, then `npm run mac` on a Mac or `npm run win` on
Windows. The files appear in `release/`. `npm run desktop` opens the app without packaging it.

Releases are named after the version with a "v": version `0.0.7` becomes "Scripti Writer Beta
v0.0.7", tagged `v0.0.7`. Versions before `1.0.0` are betas.

The apps aren't signed with an Apple Developer ID or a Windows code-signing certificate, so macOS
and Windows ask writers to confirm the first time (install steps are in the
[main README](../README.md)). Signing would remove those warnings; electron-builder's
documentation covers the settings.

## Where writing is kept

Stories are saved automatically on each device: in the app's data folder for the Mac and Windows
apps, and in the browser (IndexedDB) for the web version. Each keeps its own stories; use **Back
up all** and **Import…** in the library to move them. Nothing is uploaded.

The desktop app's data folder is named `Scripti` (from before the rename to Scripti Writer), and
`desktop/main.cjs` keeps it that way so existing stories always open. Updating or uninstalling the
app never removes it.

## First launch

Scripti Writer starts with an empty library. Create a story, or import a Fountain, Final Draft or
Scripti Writer backup file.

## Project layout

```
index.html              Page shell, fonts, app manifest
public/                 App icons, manifest, service worker (offline support)
desktop/                Mac and Windows app (Electron): window, menu bar, update download, preload bridge
build/                  App icons: icon.png (Mac, with padding) and icon-win.png (Windows)
src/
  main.ts               Start-up: load data, migrate, render, install support, update check
  state.ts              The single app state (App) and debounced saving
  constants.ts          Fixed lists: tabs, block types, beats, colours, shortcuts
  utils.ts              DOM and text helpers ($, esc, toast, pickFile, …)
  project.ts            Creating, opening, repairing (normalize), duplicating and deleting stories
  events.ts             Global event handlers: clicks (data-a), typing, keyboard, menus
  actions.ts            Export/import, backups, menus, focus mode, side panel, install
  update.ts             Update notice for the desktop app
  find.ts               Find and replace
  backup.ts             Automatic backups for the desktop app
  pages.ts              Page numbers and the two-page book view
  phonebars.ts          Toolbars on phones
  views/                One file per screen, plus dialogs.ts for every dialog and menu
  editor/               Script editor: caret, undo/redo, autocomplete, hover cards, comments, keys
  board/                Brainstorm board: rendering, actions, links, pointer and touch gestures
  io/                   storage (IndexedDB), files (export/import), clean (safe imports),
                        screenplay (pagination, Fountain, FDX), novel (manuscript, Word,
                        Markdown), pdf, zip, pwa
  styles/               themes.css (four looks, soft glow), app.css, board.css, full.css (dialogs, mobile)
docs/SPEC.md            The product specification
```

## Keyboard shortcuts

Press `?` in the app for the full list. The most used: Enter for the next line, Tab to change the
line type, Shift+Enter for a line break, Ctrl/⌘+Z to undo, Ctrl/⌘+E to export,
Ctrl/⌘+Shift+F for focus mode.

## License

GPL-3.0, see [LICENSE](LICENSE). The name and logo are covered by [TRADEMARK.md](../TRADEMARK.md).

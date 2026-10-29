# Changelog

All notable changes. The editions are versioned separately: **Core** (`core/`), the
**WordPress** plugin (repository root) and **Standalone** (`standalone/`).

## Core 2.0.0 — 2026-10-29

First release of the Core edition: the widget rebuilt from production use (a tour-operations
back office, where it runs for every office user) and generalized for any site and backend.

### Added
- One docked panel (report, list, detail) instead of modals over the page.
- Draggable launcher: click opens the tool bar (no hover pop-up), the position is kept per
  browser, double-click resets it, and menus open toward the side with more room. Ctrl+Shift+F toggles the bar.
- Icon-only tool bar showing the page's scope (e.g. a module number).
- Screenshots through the browser's own tab capture (`getDisplayMedia`, current tab), so the
  pixels are the screen; html2canvas only as a stated fallback. Up to 6 images per report,
  plus paste / drop / upload, each can be marked up, and uploads are encoded as WebP.
- Text tool: takes a selection made before the tool is clicked, reads selections inside
  `<input>`/`<textarea>`, handles keyboard (Shift+arrow) selection, and allows selection on pages that disable it.
- Tickets: P1–P4 (ITIL), Jira's default bug workflow, Bugzilla resolutions, Affects / Fix
  version with "live / pending", reporter verification (✓ Fixed / Still broken), withdraw.
- Detail view: a one-line header, with description, AI analysis and timeline on the left and screenshots
  (full-size viewer) and captured context on the right. "Copy for AI" exports Markdown.
- Backend adapters: a REST adapter for `BACKEND-CONTRACT.md`, a browser-only `adapters/local.js`,
  or any object with eight methods.
- Reference server `server/php/index.php` (PDO SQLite, no dependencies): AI Bearer token, transition
  rules, auto-close after 14 days, JSON-only writes (CSRF), image byte validation, per-reporter
  rate limit, opaque reporter ids.
- i18n (English, 简体中文, `messages` overrides), theming through `--efa-accent`, light/dark,
  the `efa-` class prefix, `onEvent` hooks, `meta()` for request ids, `links` to your tracker.
- `demo/index.html` (no server, with a mock AI console) and `demo/server.html`.

### Fixed (all editions)
- The screenshot annotator shrank the canvas pixels to the window size and exported that,
  so every marked-up screenshot lost resolution. It now keeps the source resolution and
  scales annotations onto it (`efa-screenshot.js` in WordPress and Standalone too).

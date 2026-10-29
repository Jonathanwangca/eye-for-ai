# Eye for AI — Core edition (2.0)

**A feedback widget for any website, with tickets an AI agent can work on.**

People click the eye and point at what is wrong: an **element**, a piece of **text**, or a **screenshot** they mark up. The widget records where it happened: URL, CSS selector, viewport, scroll, browser, plus your app's own scope and version. Your backend turns that into a ticket with a priority and a workflow. An AI agent (or a developer) picks the ticket up through the API. The reporter then confirms the fix with one click.

Core is plain JavaScript and CSS. It has no build step, no framework and no dependencies, and it works with any backend.

| | |
|---|---|
| **Try it in 10 seconds** | open [`demo/index.html`](demo/index.html), which keeps everything in your browser |
| **Run it with a real server** | [`server/php/`](server/php/), one PHP file with SQLite |
| **Bring your own backend** | implement [`BACKEND-CONTRACT.md`](BACKEND-CONTRACT.md), or write an [adapter](#custom-backend-adapter) |

---

## What the reporter gets

- **One draggable eye.** Click it to open the tool bar, drag it anywhere (the position is remembered per browser), or double-click it to send it back to the corner. Menus and panels open toward the side with more room. **Ctrl+Shift+F** toggles the bar.
- **Element.** Hover to see what will be picked, then click.
- **Text.** Select words on the page or inside an input. Text that was already selected when the tool is clicked is taken straight away.
- **Screenshot.** The primary path is the browser's own tab capture, so the pixels are exactly what is on screen. Drag an area, or click once for the whole screen. One report can hold up to 6 images. Each one can be marked up with rectangles, arrows, text or a pen, at full resolution. Images can also be pasted with **Ctrl+V**, dropped onto the panel or uploaded. If the person declines tab sharing, the widget falls back to html2canvas and says so.
- **P1–P4 and type in one click.** **Ctrl+Enter** sends the report.
- **Markers on the page** for open tickets, a badge with the open count, and a **✓ badge** when one of your own reports is waiting for your verdict.
- **Detail view:**
  - a single header line with key, priority, title, status, scope, version (affects → fix, live/pending), type, reporter and age;
  - the description, AI analysis, timeline and comment box on the left;
  - screenshots in a viewer (← → keys) and the captured context on the right;
  - buttons for **✓ Fixed** / **Still broken**, **Copy for AI** (Markdown), **Locate** and **Withdraw**.
- **English and 简体中文 built in.** Other languages are one object away.

## What the AI gets

Every ticket carries what is needed to reproduce and fix it without asking the reporter:

```text
# Report #042 · Price font too small on mobile
- Priority: P2 · Type: bug · Status: triaged
- Page: https://example.com/product/aurora/?currency=USD
- Scope: billing Billing · affects v1.4.0
- Selector: `div.price > span.amount`
- Element text: $1,235.00
- Viewport: 375×667, scroll 0,680
- Browser: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 …)
- Screenshot 1: https://example.com/…/42/screenshots/1
```

The workflow follows industry standards:

- **Priority:** ITIL P1–P4.
- **Statuses:** Jira's default bug workflow (New → Triaged → In Progress → Resolved → Closed, with Reopen).
- **Resolutions:** Bugzilla's (Fixed, Won't Fix, Duplicate, Can't Reproduce, As Designed).

An AI agent can therefore triage, resolve and explain tickets in terms the whole team already knows.

---

## Install

Copy the `core/` folder to your site, then:

```html
<link rel="stylesheet" href="/eye-for-ai/eye-for-ai.css">

<script src="/eye-for-ai/vendor/html2canvas.min.js" defer></script>  <!-- fallback capture only -->
<script src="/eye-for-ai/eye-for-ai-annotate.js" defer></script>
<script src="/eye-for-ai/eye-for-ai-capture.js" defer></script>
<script src="/eye-for-ai/eye-for-ai.js" defer></script>
<script>
  window.EyeForAIConfig = {
    endpoint: '/eye-for-ai/server/php/index.php',
    scope: { id: 'billing', label: 'Billing', version: '1.4.0' }
  };
</script>
```

Only render these tags for people who should see the widget, for example signed-in staff. The widget has no login of its own; who may report is decided by your page and your backend.

Screenshots use `getDisplayMedia`, which browsers only allow on **HTTPS** (or `localhost`).

### Configuration

| Option | Default | |
|---|---|---|
| `endpoint` | — | Base URL of a [contract](BACKEND-CONTRACT.md) backend |
| `adapter` | REST adapter | A custom backend object (use this instead of `endpoint`) |
| `headers` | `{}` | Extra request headers, as an object or a function returning one (auth token, CSRF nonce) |
| `credentials` | `'same-origin'` | `fetch` credentials mode |
| `scope` | `null` | `{ id, label, version }`: the part of your app this page belongs to. Reports are grouped by scope (or by page path when there is none), and `version` becomes the ticket's *Affects Version* |
| `user` | from backend | `{ id, name }`; normally the backend's `me` |
| `locale` | `<html lang>`, then browser | `'en'`, `'zh-CN'`, or any locale you add |
| `messages` | — | Override individual strings |
| `theme` | — | `{ accent, barBg, launcherBg, onAccent }` |
| `assetsUrl` | the script's folder | Where `eye.png` is |
| `hotkey` | `'ctrl+shift+f'` | Toggles the tool bar; `null` disables it |
| `maxScreenshots` | `6` | Per report |
| `priorities` / `types` / `defaultPriority` | P1–P4 / bug, improvement, question / P3 | |
| `links` | — | `{ list(scope) → url, item(report) → url }`: adds "All reports ↗" and "Open ↗" to your tracker |
| `meta` | — | `() → object` of extra fields sent with each new report, such as `{ request_id }` from your server logs |
| `storageKey` | `'eye-for-ai.pos'` | localStorage key for the launcher position |
| `onEvent` | — | `(name, detail)` for `sent`, `commented`, `verified`, `withdrawn` and `error`, e.g. to feed analytics or notify Slack |

### JavaScript API

```js
EyeForAI.init(config)         // start (or set window.EyeForAIConfig before the script loads)
EyeForAI.destroy()            // remove the widget, e.g. on logout in a single-page app
EyeForAI.reload()             // re-fetch the tickets for this page
EyeForAI.open('text')         // 'element' | 'text' | 'shot' | 'list'
EyeForAI.messages.fr = {...}  // add a locale before init()
EyeForAI.version              // '2.0.0'
```

A ticket link that ends in `#efa-locate=<css selector>` scrolls to the element and highlights it.

### Theming

Set the colour once and everything follows: the tool bar, buttons, focus rings and highlights.

```css
:root { --efa-accent: #2563eb; }
```

Light and dark follow `prefers-color-scheme`. You can force either with `<html data-efa-theme="light|dark">`. The other tokens (`--efa-bg-card`, `--efa-text`, `--efa-radius-md`, …) are listed at the top of `eye-for-ai.css`. Every class starts with `efa-`, so they never collide with your styles.

### Custom backend (adapter)

When your tracker already exists (Jira, Linear, GitHub Issues, your own app's database), skip the REST contract and hand the widget an object. Each method returns a Promise:

```js
EyeForAI.init({ adapter: {
  page({ path, url, scope }) { /* → { items: [ticket summary], me: userId } */ },
  get(id)                    { /* → ticket with screenshots: [{url}] and events: [...] */ },
  create(report)             { /* → { id, key } */ },
  addScreenshot(id, dataUrl) { /* WebP or PNG data URL */ },
  comment(id, body)          {},
  verify(id, fixed, note)    { /* reporter: fixed → closed, not fixed → reopened */ },
  withdraw(id)               {},
  markdown(id)               { /* → string for "Copy for AI" */ }
}});
```

[`adapters/local.js`](adapters/local.js) is a complete implementation of about 150 lines. The fields are defined in the [contract](BACKEND-CONTRACT.md#ticket).

---

## Files

```
core/
├── eye-for-ai.js            widget: dock, pickers, compose, list, detail, REST adapter, i18n
├── eye-for-ai-capture.js    tab capture → region pick → crop at device resolution; html2canvas fallback
├── eye-for-ai-annotate.js   full-screen markup editor (keeps the source resolution)
├── eye-for-ai.css           themeable styles (efa- prefix, light/dark)
├── eye.png                  launcher logo
├── vendor/html2canvas.min.js
├── adapters/local.js        browser-only backend for demos and prototypes
├── demo/index.html          live demo with a mock "AI console"
├── demo/server.html         the same widget against the PHP server
├── server/php/              reference backend (SQLite) + config.sample.php
└── BACKEND-CONTRACT.md      REST API a backend implements
```

## Security notes

- The widget escapes every server value before rendering it. Reporters see each other's tickets, so this matters.
- The reference server:
  - accepts writes only as `application/json`, which blocks cross-site form posts (CSRF);
  - checks that uploaded bytes really are PNG, WebP or JPEG;
  - stores files under random names and serves them only through the API;
  - rate-limits new reports per reporter;
  - never publishes a reporter's raw id, which for anonymous visitors is their cookie.
- The AI uses its own Bearer token. That token can read the queue and change status, and it cannot create reports or verify them in a reporter's name.
- Screenshots can contain anything on the screen. Tell your users, and keep the widget off pages that show data the reporters' audience should not see.

## Browser support

The current versions of Chrome, Edge, Firefox and Safari all work.

- **Tab capture with no tab picker:** Chromium browsers.
- **Firefox and Safari:** ask which surface to share, or fall back to html2canvas.
- **Mobile:** gets element, text, paste and upload. Tab capture depends on the browser.

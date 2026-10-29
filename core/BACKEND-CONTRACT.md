# Eye for AI — backend contract (v2)

This is what a server implements so that the Core widget (and an AI agent) can use it. [`server/php/index.php`](server/php/index.php) is a complete reference implementation.

- **Base URL:** whatever you pass as `endpoint`. Paths below are relative to it.
- **Requests:** bodies are JSON (`Content-Type: application/json`).
- **Responses:** JSON, either plain or wrapped in the envelope below. The widget accepts both.

```json
{ "success": true,  "data": { … }, "error": null }
{ "success": false, "data": null,  "error": { "code": "VALIDATION_ERROR", "message": "description is required" } }
```

The `message` is shown to the reporter, so write it for people.

## Who is calling

| Caller | How it identifies | May |
|---|---|---|
| **Reporter** (widget) | your app's session cookie, or an anonymous cookie | create, comment, add screenshots; verify / withdraw **their own** reports |
| **AI agent** | `Authorization: Bearer <token>` | read the queue, change status / resolution / priority, write analysis, comment |

Rules for the reporter's id:

- Never send a reporter's raw id to other reporters. For anonymous visitors that id is their cookie, and publishing it lets anyone act in their name.
- Send an opaque one instead (the reference server uses a truncated hash) as both `reporter_id` and `me`.

## Ticket

| Field | Type | |
|---|---|---|
| `id` | int/string | |
| `key` | string | Display key, e.g. `#042` |
| `title` | string | First line of the description |
| `description` | string | |
| `priority` | `P1`–`P4` | ITIL. P1 Critical (down, money/data wrong) · P2 High · P3 Medium (workaround exists) · P4 Low (cosmetic) |
| `issue_type` | `bug` · `improvement` · `question` | |
| `capture_type` | `element` · `text` · `screenshot` | |
| `status` | `new` · `triaged` · `in_progress` · `resolved` · `closed` | Jira's default bug workflow |
| `resolution` | `fixed` · `wont_fix` · `duplicate` · `cannot_reproduce` · `works_as_designed` · null | Bugzilla. Required when resolved |
| `page_url`, `page_path`, `page_title` | string | |
| `selector`, `element_text` | string | element / text captures |
| `selected_text`, `text_context` | string | text captures (context is ±40 characters) |
| `position` | object | `{ rect: {top,left,width,height}, scrollX, scrollY, viewportWidth, viewportHeight, pageWidth, pageHeight }` |
| `user_agent`, `request_id` | string | Feel free to hide these from other reporters |
| `scope_id`, `scope_label` | string | From the widget's `scope` |
| `affects_version` | string | The scope version the reporter was on |
| `fix_version` | string | Set by whoever resolves it |
| `current_version` | string · null | What is deployed now for the scope |
| `fix_deployed` | bool · null | `current_version ≥ fix_version`; drives "live / pending" and "the fix may not be on this server yet" |
| `ai_analysis`, `ai_solution` | string | Shown to the reporter in the detail view |
| `reporter_id`, `reporter_name` | string | Opaque id (see above) |
| `created_at`, `updated_at` | ISO-8601 | With `Z` (UTC) or an offset |
| `screenshot_count` | int | In list responses |
| `screenshots` | `[{ url }]` | In `GET /{id}`; URLs the reporter's browser can load |
| `events` | `[{ kind, from, to, body, actor, actor_type, created_at }]` | In `GET /{id}`; `kind` is `status` or `comment` |

### Workflow

```
new ──→ triaged ──→ in_progress ──→ resolved ──→ closed
 │         ↑  ←──────────┘              │           │
 └─────────┼────────────→───────────────┘           │
           └───────────── reopen ←──────────────────┘
```

- Allowed status moves:
  - `new` → `triaged`, `in_progress` or `resolved`
  - `triaged` → `in_progress` or `resolved`
  - `in_progress` → `triaged` or `resolved`
  - `resolved` → `triaged` (the reporter says "still broken")
  - `closed` → `triaged`
- Reaching `resolved` **requires** a `resolution`. Leaving `resolved` clears it.
- `resolved → closed` happens **only** through the reporter's verify, or through auto-close after N days without an answer (14 in the reference server). The AI cannot close its own fix.

## Endpoints

### Widget

| Method & path | Body | Returns |
|---|---|---|
| `GET /page?path=&scope=` | — | `{ items: [ticket], me }`. Tickets not yet closed for the scope, or for the page path when there is no scope |
| `POST /` | report (below) | `{ id, key }` |
| `GET /{id}` | — | ticket with `screenshots` and `events` |
| `GET /{id}/markdown?envelope=1` | — | `{ markdown }` (without `envelope`: `text/markdown`) |
| `POST /{id}/screenshots` | `{ image: "data:image/webp;base64,…" }` | — (one image per request, so each stays under body limits) |
| `POST /{id}/comments` | `{ body }` | — |
| `POST /{id}/verify` | `{ fixed: true \| false, note }` | Reporter only; ticket must be `resolved`. `fixed` → `closed`; not fixed → `triaged` (a note is required) |
| `DELETE /{id}` | — | Reporter only, status `new` |

A new report contains everything listed under [Ticket](#ticket) that the browser can know: `description`, `priority`, `issue_type`, `capture_type`, the `page_*` fields, `selector`, `element_text`, `selected_text`, `text_context`, `position`, `user_agent`, `scope_id`, `scope_label` and `affects_version`. It also carries `widget_version`, plus whatever `meta()` adds.

### AI agent

| Method & path | Body | Returns |
|---|---|---|
| `GET /?status=new,triaged&scope=&limit=50` | — | `{ items: [ticket with screenshots + events] }`, P1 first |
| `GET /{id}` · `GET /{id}/markdown` | — | as above |
| `PATCH /{id}` | `{ status?, resolution?, priority?, ai_analysis?, ai_solution?, fix_version?, note? }` | the updated ticket. `note` is recorded with the status change, or as a comment |
| `POST /{id}/comments` | `{ body }` | — |

### Errors

| HTTP | `code` | When |
|---|---|---|
| 401 | `AUTH_REQUIRED` / `AUTH_INVALID` | no session (anonymous disabled) / unknown token |
| 403 | `AUTH_FORBIDDEN` | wrong caller for the action |
| 404 | `REPORT_NOT_FOUND`, `ROUTE_NOT_FOUND` | |
| 409 | `INVALID_TRANSITION`, `REPORT_CLOSED`, `TOO_MANY_SCREENSHOTS` | |
| 415 / 422 | `VALIDATION_ERROR` | not JSON / bad field |
| 429 | `RATE_LIMITED` | too many new reports |

## An agent loop in 15 lines

```python
import requests
API, H = "https://example.com/eye-for-ai/server/php/index.php", {"Authorization": "Bearer " + TOKEN}

for t in requests.get(f"{API}/?status=new", headers=H).json()["data"]["items"]:
    md = requests.get(f"{API}/{t['id']}/markdown", headers=H).text      # everything the model needs
    analysis, fix, version = ask_your_model(md)                          # your LLM call
    requests.patch(f"{API}/{t['id']}", headers=H, json={
        "status": "resolved", "resolution": "fixed", "fix_version": version,
        "ai_analysis": analysis, "ai_solution": fix, "note": f"Fixed in v{version}",
    })
# The reporter sees ✓ on the eye, opens the ticket, and confirms with ✓ Fixed or Still broken.
```

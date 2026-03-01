# Eye for AI

**WordPress visual feedback plugin with AI-friendly REST API.**

Visitors and team members annotate page elements, highlight text, and capture marked-up screenshots. All feedback is stored in the WordPress database with full URL, element position, and viewport context — ready for AI agents to consume and triage automatically.

**Author:** Jonathan Wang
**License:** GPLv2+
**Version:** 1.1.0
**Requires:** WordPress 5.8+ / PHP 7.4+

---

## Why Eye for AI?

Traditional feedback tools produce vague bug reports: *"the button looks wrong on the product page."*

Eye for AI captures **exactly what the user sees**:

| Data Captured | Example |
|---------------|---------|
| Full page URL | `https://example.com/product/portugal-vision/?currency=USD` |
| Element selector | `div.price > span.amount` |
| Element text | `$1,235.00` |
| User comment | "Price font too small on mobile" |
| Bounding rect | `top:842px, left:320px, 180×24px` |
| Viewport size | `375×667` (iPhone SE) |
| Scroll position | `scrollX:0, scrollY:680` |
| Screenshot | Annotated PNG with arrows/rectangles/text markup |
| Session context | IP, User-Agent, timestamp |

An AI agent (Claude, GPT, or custom) can read this data via a single API call and produce actionable fix suggestions — or even generate code patches — without any human reformatting.

---

## Quick Start

### Install

```bash
# Option A: Upload to WordPress
# Download the zip from GitHub → Plugins → Add New → Upload Plugin

# Option B: CLI
cd /var/www/yoursite.com/wp-content/plugins/
git clone https://github.com/Jonathanwangca/eye-for-ai.git
wp plugin activate eye-for-ai
```

### Configure

1. **Settings → Eye for AI** — Enable the toolbar, set session expiry, configure max screenshot size
2. **Enable AI API** — Check the box, click "Generate API Key"
3. **Save your API key** — Pass it via `X-VFB-API-Key` header in API calls

### Use

Visit any frontend page. The feedback toolbar appears at bottom-right:

- **Element** — Click any page element to annotate it
- **Text** — Select text to annotate
- **Screenshot** — Draw a region, markup with arrows/rectangles/text, submit
- **List** — View all annotations on the current page
- **Export** — Copy Markdown report to clipboard

### Manage

- **Tools → Eye for AI** — Dashboard with stats, session cards, annotation details
- **Admin panel** — Change status (Pending → In Progress → Resolved → Won't Fix), add developer response, delete annotations

---

## AI API Reference

**Base URL:** `https://yoursite.com/wp-json/eye-for-ai/v1`

### Authentication (choose one)

| Method | Header | Notes |
|--------|--------|-------|
| API Key | `X-VFB-API-Key: <your-key>` | Generated in Settings → Eye for AI |
| WP Application Password | `Authorization: Basic base64(user:app-password)` | Any user with `manage_options` |

### GET /ai/pending

Retrieve pending annotations with full context.

**Parameters:**
- `status` — Filter by status: `pending` (default), `in_progress`, `resolved`, `wontfix`
- `limit` — Max results: 1–200 (default: 50)

**Example:**

```bash
curl -H "X-VFB-API-Key: YOUR_KEY" \
  "https://yoursite.com/wp-json/eye-for-ai/v1/ai/pending?status=pending&limit=20"
```

**Response:**

```json
{
  "annotations": [
    {
      "id": 42,
      "type": "element",
      "page_url": "https://example.com/product/portugal-vision/",
      "page_title": "Portugal Vision",
      "comment": "Price font too small on mobile",
      "selector": "div.price > span.amount",
      "element_text": "$1,235.00",
      "element_position": {
        "rect": { "top": 842, "left": 320, "width": 180, "height": 24 },
        "scrollX": 0,
        "scrollY": 680,
        "viewportWidth": 375,
        "viewportHeight": 667,
        "pageWidth": 375,
        "pageHeight": 3200
      },
      "status": "pending",
      "developer_response": null,
      "created_at": "2026-02-28T10:30:00",
      "updated_at": "2026-02-28T10:30:00",
      "session": {
        "ip": "203.0.113.42",
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)..."
      }
    },
    {
      "id": 43,
      "type": "text",
      "page_url": "https://example.com/about/",
      "page_title": "About Us",
      "comment": "Typo in company description",
      "selector": "div.about-content > p:nth-child(2)",
      "selected_text": "teh company",
      "context": "...founded in 2020, teh company has grown...",
      "element_position": {
        "rect": { "top": 450, "left": 100, "width": 120, "height": 18 },
        "scrollX": 0,
        "scrollY": 300,
        "viewportWidth": 1920,
        "viewportHeight": 1080,
        "pageWidth": 1920,
        "pageHeight": 2400
      },
      "status": "pending",
      "developer_response": null,
      "created_at": "2026-02-28T11:15:00",
      "updated_at": "2026-02-28T11:15:00",
      "session": {
        "ip": "198.51.100.7",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
      }
    },
    {
      "id": 44,
      "type": "screenshot",
      "page_url": "https://example.com/checkout/",
      "page_title": "Checkout",
      "comment": "Payment form layout broken on tablet",
      "screenshot_url": "https://example.com/wp-content/uploads/eye-for-ai/abc123/ann_1709124600000.png",
      "element_position": {
        "rect": { "top": 0, "left": 0, "width": 800, "height": 600 },
        "scrollX": 0,
        "scrollY": 200,
        "viewportWidth": 768,
        "viewportHeight": 1024,
        "pageWidth": 768,
        "pageHeight": 1800
      },
      "status": "pending",
      "developer_response": null,
      "created_at": "2026-02-28T14:00:00",
      "updated_at": "2026-02-28T14:00:00",
      "session": {
        "ip": "192.0.2.15",
        "user_agent": "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)..."
      }
    }
  ],
  "total": 3,
  "status": "pending",
  "site_url": "https://example.com"
}
```

### PATCH /ai/batch

Bulk update annotation status and developer response (max 100 per request).

**Example:**

```bash
curl -X PATCH \
  -H "X-VFB-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {
        "id": 42,
        "status": "resolved",
        "developer_response": "Fixed font-size to 16px in mobile CSS. Commit: abc123"
      },
      {
        "id": 43,
        "status": "resolved",
        "developer_response": "Fixed typo: teh → the"
      },
      {
        "id": 44,
        "status": "in_progress",
        "developer_response": "Investigating flexbox layout issue on iPad viewports"
      }
    ]
  }' \
  "https://yoursite.com/wp-json/eye-for-ai/v1/ai/batch"
```

**Response:**

```json
{
  "success": true,
  "results": [
    { "id": 42, "success": true },
    { "id": 43, "success": true },
    { "id": 44, "success": true }
  ],
  "updated": 3,
  "failed": 0
}
```

---

## Frontend REST API

For the frontend toolbar and admin panel. All requests require `X-WP-Nonce` header.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/session` | POST | Public | Create session, returns token + nonce |
| `/annotations` | GET | Nonce | Load annotations for current page |
| `/annotations` | POST | Nonce | Create/update annotation |
| `/annotations/{id}` | DELETE | Nonce | Delete annotation (owner or admin) |
| `/annotations/{id}` | PATCH | Admin | Update status / developer response |
| `/screenshots` | POST | Nonce | Upload base64 screenshot |
| `/export` | GET | Nonce | Export Markdown report |

---

## Annotation Types

### Element Annotation

User clicks a page element. Captured data:
- `selector` — CSS selector path (e.g., `#main > div.product > h1`)
- `element_text` — Visible text content of the element
- `element_position` — Absolute position on page + viewport context

### Text Annotation

User selects text on the page. Captured data:
- `selected_text` — The exact selected string
- `context` — Surrounding text (±20 characters) for disambiguation
- `selector` — CSS selector of the parent element
- `element_position` — Position of the selection range

### Screenshot Annotation

User draws a region, captures it via html2canvas, then annotates with:
- Rectangles, arrows, text overlays, freehand drawing
- The edited screenshot is uploaded as PNG
- `screenshot_url` — Direct URL to the annotated image
- `element_position` — Viewport and scroll context at capture time

---

## Database Schema

Two custom tables are created on activation:

### wp_vfb_sessions

| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | Auto-increment |
| session_token | varchar(64) UNIQUE | UUID cookie token |
| user_id | bigint nullable | WP user ID if logged in |
| user_agent | text | Browser user agent |
| ip_address | varchar(45) | IPv4 or IPv6 |
| created_at | datetime | Session creation |
| last_active | datetime | Last API call |
| expires_at | datetime | Auto-cleanup threshold |

### wp_vfb_annotations

| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | Auto-increment |
| session_id | bigint FK | References sessions.id |
| annotation_key | varchar(64) | Frontend-generated ID |
| page_url | text | **Full URL** with protocol + domain + path + query |
| page_title | varchar(255) | Document title |
| type | varchar(20) | `element`, `text`, or `screenshot` |
| comment | text | User's feedback comment |
| selector | text | CSS selector path |
| element_text | text | Element's visible text |
| selected_text | text | User-selected text |
| context | text | Surrounding text context |
| screenshot_path | varchar(512) | Relative path in uploads |
| element_position | text | JSON: `{rect, scrollX, scrollY, viewportWidth, viewportHeight, pageWidth, pageHeight}` |
| status | varchar(20) | `pending`, `in_progress`, `resolved`, `wontfix` |
| developer_response | text | Developer's reply |
| created_at | datetime | Annotation creation |
| updated_at | datetime | Last modification |

---

## AI Integration Example

### Claude Code / MCP Integration

```bash
# Poll for new feedback every hour
PENDING=$(curl -s -H "X-VFB-API-Key: $EFA_KEY" \
  "https://yoursite.com/wp-json/eye-for-ai/v1/ai/pending")

# Parse and generate fix suggestions
echo "$PENDING" | jq -r '.annotations[] |
  "Issue #\(.id): \(.type) on \(.page_url)\n  Comment: \(.comment)\n  Selector: \(.selector // "N/A")\n  Viewport: \(.element_position.viewportWidth // "?")x\(.element_position.viewportHeight // "?")\n"'
```

### Automated Triage Script

```python
import requests
import json

API = "https://yoursite.com/wp-json/eye-for-ai/v1"
HEADERS = {"X-VFB-API-Key": "your-api-key"}

# Fetch pending
resp = requests.get(f"{API}/ai/pending", headers=HEADERS)
annotations = resp.json()["annotations"]

# Auto-classify and respond
updates = []
for ann in annotations:
    if ann["type"] == "text" and "typo" in ann["comment"].lower():
        updates.append({
            "id": ann["id"],
            "status": "resolved",
            "developer_response": f"Auto-fix: '{ann.get('selected_text', '')}' corrected"
        })

# Batch update
if updates:
    requests.patch(f"{API}/ai/batch", headers=HEADERS,
                   json={"updates": updates})
```

---

## File Structure

```
eye-for-ai/
├── eye-for-ai.php              # Main plugin file (hooks, constants, requires)
├── uninstall.php                # Clean removal (drop tables, delete uploads/options)
├── readme.txt                   # WordPress.org listing
├── includes/
│   ├── class-vfb-activator.php  # DB table creation via dbDelta()
│   ├── class-vfb-deactivator.php# Clear cron on deactivation
│   ├── class-vfb-session.php    # Cookie + DB session management
│   ├── class-vfb-rest-api.php   # Frontend REST endpoints (7 routes)
│   ├── class-vfb-ai-api.php     # AI REST endpoints (/ai/pending, /ai/batch)
│   ├── class-vfb-admin.php      # WP admin pages (dashboard + settings)
│   ├── class-vfb-frontend.php   # Asset enqueue + config injection
│   └── class-vfb-export.php     # Markdown report generator
├── assets/
│   ├── js/
│   │   ├── vfb.js               # Main frontend (toolbar, annotations, API calls)
│   │   ├── vfb-screenshot.js    # Screenshot editor (canvas drawing tools)
│   │   └── vfb-admin.js         # Admin panel interactions
│   ├── css/
│   │   ├── vfb.css              # Frontend styles (toolbar, modal, markers)
│   │   └── vfb-admin.css        # Admin panel styles
│   └── vendor/
│       └── html2canvas.min.js   # Bundled v1.4.1 (no CDN dependency)
└── languages/
    └── (translation files)
```

---

## Two Editions

Eye for AI exists in two editions for different environments:

| | WordPress Edition | Standalone Edition |
|---|---|---|
| **Location** | `eye-for-ai/` plugin | `euro/assets/vfb/` |
| **Storage** | WordPress database | File system (`/data/`) |
| **API** | WP REST API (`/wp-json/eye-for-ai/v1/`) | Plain PHP (`/api/feedback.php`) |
| **Auth** | WP nonce + capabilities | Session-based / password |
| **AI API** | Built-in (`/ai/pending`, `/ai/batch`) | Not available |
| **Position tracking** | Full URL + viewport + scroll + rect | Page path only |
| **Use case** | WordPress sites | Any PHP site (ScriptCase, Laravel, etc.) |

Both editions share the same frontend JS core (`vfb.js`, `vfb-screenshot.js`, `vfb.css`).

---

## License

GPLv2 or later. See [LICENSE](https://www.gnu.org/licenses/gpl-2.0.html).

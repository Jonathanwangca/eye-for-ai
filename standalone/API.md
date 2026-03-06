# EFA (Eye for AI) API Documentation

**Version**: 3.0-db
**Base URL**: `{site}/assets/plugins/efa/api/feedback.php`
**Production**: `https://eos.maplefun.com/_lib/libraries/grp/aiquotation/assets/plugins/efa/api/feedback.php`

## Authentication

### User API (frontend widget)
- Session identified by `efa_token` cookie (auto-generated, 30-day expiry)
- User identified by `X-EFA-User` header (maps to `usr_login` in EOS)
- All requests use `credentials: 'same-origin'`

### AI API
- Requires `X-EFA-API-Key` header
- Key generated via `?action=ai_generate_key` (dev mode required)
- Current key: stored in `efa_config` table

---

## User Endpoints (Frontend Widget)

### Check API Status
```
GET ?action=check
```
Response: `{ success, message, version, storage }`

### Init Session
```
POST ?action=init_session
Headers: X-EFA-User: {usr_login}
```
Returns session token, sets `efa_token` cookie.

### Load Annotations
```
GET ?action=load&page_url={url}
Headers: X-EFA-User: {usr_login}
```
Returns ALL annotations for the page (not just current user's).
Each annotation includes `is_mine` (boolean) and `author` (usr_login).

Response:
```json
{
  "success": true,
  "annotations": [{
    "id": "ann_xxx",
    "type": "element|text|screenshot",
    "comment": "...",
    "selector": "...",
    "element_text": "...",
    "status": "pending|ai_analyzed|dev_approved|in_progress|resolved|wontfix",
    "priority": "low|medium|high|critical|null",
    "developer_response": "...",
    "ai_analysis": "...",
    "ai_solution": "...",
    "is_mine": true,
    "author": "jonathan"
  }],
  "usr_login": "jonathan"
}
```

### Save Single Annotation
```
POST ?action=save_one
Headers: X-EFA-User: {usr_login}
Body: {
  "page_url": "...",
  "id": "ann_xxx",
  "page_title": "...",
  "type": "element",
  "comment": "...",
  "selector": "...",
  "element_text": "...",
  "element_position": { rect, scrollX, scrollY, ... }
}
```

### Save Batch
```
POST ?action=save
Headers: X-EFA-User: {usr_login}
Body: { "page_url": "...", "annotations": [...] }
```

### Delete Annotation
```
DELETE ?action=delete&id={ann_id}
Headers: X-EFA-User: {usr_login}
```
Only the author (matched by `usr_login` or `session_token`) can delete.

### Upload Screenshot
```
POST ?action=upload_screenshot
Body: { "image_data": "data:image/png;base64,...", "annotation_id": "ann_xxx" }
```

### Export Markdown
```
GET ?action=export_md&page_url={url}
```

---

## Developer Endpoints (requires dev mode cookie)

### Dev Auth
```
POST ?action=dev_auth
Body: { "password": "dev" }
```

### Load All Annotations (cross-session)
```
GET ?action=dev_load_all&page_url={url}
```

### Dev Update
```
POST ?action=dev_update
Body: {
  "annotation_id": "ann_xxx",
  "update_type": "status|response",
  "value": "resolved|Your response text"
}
```

### Dev Delete (any annotation)
```
POST ?action=dev_delete
Body: { "annotation_id": "ann_xxx" }
```

---

## AI API Endpoints (requires X-EFA-API-Key)

### Get Pending Annotations
```
GET ?action=ai_pending&status={status}&limit={n}
Headers: X-EFA-API-Key: {key}
```
- `status`: pending (default), ai_analyzed, dev_approved, in_progress, resolved, wontfix
- `limit`: 1-200 (default 50)

Response:
```json
{
  "annotations": [{
    "id": "ann_xxx",
    "type": "element",
    "page_url": "...",
    "comment": "...",
    "selector": "...",
    "element_text": "...",
    "status": "pending",
    "priority": null,
    "ai_analysis": null,
    "ai_solution": null,
    "session": { "ip": "...", "user_agent": "..." }
  }],
  "total": 1,
  "site_url": "https://eos.maplefun.com"
}
```

### Get Single Annotation Detail
```
GET ?action=ai_detail&id={ann_id}
Headers: X-EFA-API-Key: {key}
```
Returns full annotation with all fields including screenshot_url (absolute).

### Submit AI Analysis
```
POST ?action=ai_analyze
Headers: X-EFA-API-Key: {key}
Body: {
  "id": "ann_xxx",
  "analysis": "Problem description and root cause...",
  "solution": "Proposed fix with steps...",
  "priority": "medium"  // optional: low|medium|high|critical
}
```
Moves status: pending -> ai_analyzed.

### Resolve Annotation
```
POST ?action=ai_resolve
Headers: X-EFA-API-Key: {key}
Body: {
  "id": "ann_xxx",
  "response": "Resolution report visible to user...",
  "status": "resolved"  // or "wontfix"
}
```
Sets `resolved_at` timestamp.

### Batch Update
```
POST ?action=ai_batch
Headers: X-EFA-API-Key: {key}
Body: {
  "updates": [
    { "id": "ann_xxx", "status": "in_progress", "developer_response": "Working on it" }
  ]
}
```

### Summary Statistics
```
GET ?action=ai_summary
Headers: X-EFA-API-Key: {key}
```
Response:
```json
{
  "summary": {
    "total": 10,
    "last_24h": 3,
    "last_7d": 8,
    "by_status": { "pending": 2, "ai_analyzed": 1, "resolved": 7 },
    "by_priority": { "medium": 5, "high": 2, "unset": 3 },
    "by_page": [{ "page_url": "...", "count": 10 }]
  }
}
```

### Get Screenshot Image
```
GET ?action=ai_screenshot&id={ann_id}
Headers: X-EFA-API-Key: {key}
```
Returns binary image (Content-Type: image/png etc.)

### Generate API Key (dev mode required)
```
GET ?action=ai_generate_key
```
Requires `efa_dev` cookie. Returns new API key and enables AI API.

---

## Status Workflow

```
pending -> ai_analyzed -> dev_approved -> in_progress -> resolved
                |                                    |-> wontfix
                +-> pending (rejected)
```

1. User submits feedback (status: pending)
2. AI reads and analyzes (ai_analyze -> status: ai_analyzed)
3. Developer reviews AI proposal (approve -> dev_approved, reject -> pending)
4. Developer implements fix (status: in_progress)
5. Developer resolves with report (ai_resolve -> status: resolved)
6. User sees resolution report in EFA widget

## Database Tables

- `efa_session`: session_token, usr_login, user_agent, ip_address, created_at, last_active
- `efa_annotation`: session_token, usr_login, annotation_key, page_url, type, comment, selector, status, priority, developer_response, ai_analysis, ai_solution, ai_analyzed_at, resolved_at, ...
- `efa_config`: config_key, config_value (ai_api_key, ai_api_enabled, etc.)

## User Identity

- Frontend passes `usr_login` via URL param: `index.php?usr_login=jonathan`
- JS sends as `X-EFA-User` header on every API call
- Ownership determined by `usr_login` match (primary) or `session_token` match (fallback)
- All users see all annotations on the same page; only author can delete/edit

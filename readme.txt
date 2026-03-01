=== Eye for AI ===
Contributors: jonathanwang
Tags: feedback, annotation, screenshot, visual, bug-report, ai
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Collect visual feedback from users — annotate elements, select text, and capture screenshots with markup. AI-friendly API included.

== Description ==

Eye for AI adds a floating toolbar to your WordPress site that lets visitors and team members annotate page elements, highlight text, and take marked-up screenshots. All feedback is stored in your WordPress database and managed through the WP admin panel. An AI-friendly REST API allows external agents to read and triage feedback automatically.

**Features:**

* Element annotation — click any element on the page to annotate it
* Text annotation — select text and add comments
* Screenshot annotation — capture a region, draw rectangles/arrows/text, and submit
* Full URL + position tracking — records the complete page URL, element bounding rect, viewport size, and scroll position
* Developer admin panel — view, triage, and respond to all feedback from wp-admin
* AI-friendly REST API — let AI agents read pending feedback and update status
* Per-session tracking — anonymous visitors get a cookie-based session
* Export to Markdown — copy feedback reports to clipboard
* Fully translatable — i18n ready with text domain

**For Developers:**

* WP REST API endpoints under `eye-for-ai/v1`
* AI endpoints at `/ai/pending` and `/ai/batch` with API Key or Application Password auth
* Annotations stored in custom DB tables (`wp_vfb_sessions`, `wp_vfb_annotations`)
* Screenshots stored in `wp-content/uploads/eye-for-ai/`
* Clean uninstall — drops tables, removes options and uploads

== Installation ==

1. Upload the `eye-for-ai` folder to `/wp-content/plugins/`
2. Activate the plugin through the Plugins menu
3. Visit any frontend page — the feedback toolbar appears in the bottom-right corner
4. Manage feedback at Tools > Eye for AI
5. Configure settings at Settings > Eye for AI

== Frequently Asked Questions ==

= Who can see the feedback toolbar? =
All visitors see the toolbar by default. You can disable it in Settings > Eye for AI.

= Who can manage feedback? =
Users with the `manage_options` capability (Administrators) can access the admin panel and developer mode.

= How does the AI API work? =
Enable it in Settings, generate an API key, and use `GET /wp-json/eye-for-ai/v1/ai/pending` with the `X-VFB-API-Key` header. See the plugin documentation for full details.

== Changelog ==

= 1.1.0 =
* Renamed plugin to Eye for AI
* Full URL tracking (records complete URL with protocol and domain)
* Element position tracking (bounding rect, viewport, scroll offset)
* Clickable URLs in admin panel
* Position data in AI API responses and Markdown export

= 1.0.0 =
* Initial release
* Element, text, and screenshot annotations
* WP REST API with nonce authentication
* AI-friendly API endpoints with dual auth (API Key + Application Passwords)
* Admin dashboard with stats and session management
* Settings page with AI API configuration
* Markdown export
* Automatic session cleanup via WP Cron

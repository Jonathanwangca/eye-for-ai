/**
 * Eye for AI Core 2.0 — visual feedback widget for any website, any backend.
 * https://github.com/Jonathanwangca/eye-for-ai
 *
 * People point at what is wrong (an element, a piece of text, a screenshot they mark
 * up), the widget records exactly where it happened — URL, selector, viewport, scroll,
 * browser, the app's own scope + version — and your backend stores it as a ticket an
 * AI agent can read and act on.
 *
 *   EyeForAI.init({
 *       endpoint: '/api/feedback',                         // REST backend (see BACKEND-CONTRACT.md)
 *       scope:    { id: 'billing', label: 'Billing', version: '1.4.0' },   // optional
 *       locale:   'en',                                    // 'en' | 'zh-CN' | your own messages
 *       theme:    { accent: '#f97316' }
 *   });
 *
 * Or set window.EyeForAIConfig = {...} before this script loads and it starts by itself.
 * A custom backend is an object with the methods listed in ADAPTER (below); see
 * adapters/local.js for a complete one that keeps everything in the browser.
 *
 * Load order (all can be `defer`): vendor/html2canvas.min.js (fallback capture only),
 * eye-for-ai-annotate.js, eye-for-ai-capture.js, eye-for-ai.js. Styles: eye-for-ai.css.
 *
 * Every server value is escaped before it touches innerHTML: reporters see each
 * other's tickets, so raw interpolation would be stored XSS.
 */
(function () {
    'use strict';

    var VERSION = '2.0.0';

    /** What a backend adapter implements. Every method returns a Promise. */
    var ADAPTER = ['page', 'get', 'create', 'addScreenshot', 'comment', 'verify', 'withdraw', 'markdown'];

    // ── i18n ────────────────────────────────────────────────────────────

    var MESSAGES = {
        en: {
            report: 'Report a problem', toolElement: 'Element — click the thing that is wrong',
            toolText: 'Text — select the words that are wrong', toolShot: 'Screenshot — drag an area, or click for the whole screen',
            toolList: 'Reports on this page', launcher: 'Report a problem ({hotkey}) · drag to move · double-click to reset',
            pickElement: 'Click the element that is wrong · Esc to cancel', pickText: 'Select the text that is wrong · Esc to cancel',
            regionHint: 'Drag an area · click = whole screen · Esc = cancel',
            describe: 'What is wrong? What did you expect?', send: 'Send', sending: 'Sending…', imageN: 'Image {n}/{total}…',
            sendHint: 'Ctrl+Enter to send · Ctrl+V adds an image', sayWhat: 'Say what is wrong',
            sent: '{key} sent — thank you', sentPartial: '{key} sent, but {n} image(s) failed — add them from the report',
            addShot: '+ Screenshot', upload: 'Upload', markUp: 'Click to mark up', remove: 'Remove', maxImages: 'At most {n} images',
            selected: 'Selected', element: 'Element', selector: 'Selector', page: 'Page', viewport: 'Viewport',
            request: 'Request', browser: 'Browser', noDescription: 'No description',
            listEmpty: 'No open reports here', listOpen: '{n} open', allReports: 'All reports ↗', open: 'Open ↗', me: 'me',
            shots: '{n} screenshot(s) — click to view', shotN: 'Screenshot {n} — click to view',
            aiAnalysis: 'AI analysis', proposedFix: 'Proposed fix', isFixed: 'Is it fixed for you?',
            notLive: 'The fix may not be on this server yet.', fixLive: 'Fix is live', fixPending: 'Not deployed yet — page is v{v}',
            live: 'live', pending: 'pending', versionTitle: 'Affects → fix version',
            stillWrong: 'What is still wrong? (needed for “Still broken”)', addComment: 'Add a comment · Ctrl+Enter',
            locate: 'Locate', copyAi: 'Copy for AI', copyAiTitle: 'Copy the Markdown an AI agent reads',
            copied: 'Copied — paste it to the AI', clipboardBlocked: 'Clipboard blocked by the browser',
            withdraw: 'Withdraw', withdrawAsk: 'Withdraw {key}?', withdrawn: '{key} withdrawn',
            stillBroken: 'Still broken', fixed: '✓ Fixed', comment: 'Comment', commentAdded: 'Comment added',
            closed: '{key} closed', reopened: '{key} reopened', sayStillWrong: 'Say what is still wrong',
            shotAdded: 'Screenshot added to {key}', shotFailed: 'Screenshot upload failed', shotModule: 'Screenshot module not loaded',
            shotError: 'Screenshot failed: {e}',
            shotFallback: 'Tab sharing declined — used compatibility capture (less exact). Ctrl+V a system screenshot for a perfect image.',
            gone: 'That element is not on the page any more', back: 'Back', close: 'Close (Esc)',
            prev: 'Previous (←)', next: 'Next (→)', original: 'Open the original',
            badgeOpen: '{n} open here', badgeVerify: 'A fix is waiting for your verification', loadFailed: 'Feedback: {e}',
            P1: 'Critical — system down, money/data wrong, no workaround', P2: 'High — major feature broken, workaround is hard',
            P3: 'Medium — wrong, but it can be worked around', P4: 'Low — cosmetic, wording, suggestion',
            bug: 'Bug', improvement: 'Idea', question: 'Question',
            new: 'New', triaged: 'Triaged', in_progress: 'In Progress', resolved: 'Resolved', closedSt: 'Closed',
            res_fixed: 'Fixed', res_wont_fix: "Won't Fix", res_duplicate: 'Duplicate',
            res_cannot_reproduce: "Can't Reproduce", res_works_as_designed: 'As Designed'
        },
        'zh-CN': {
            report: '报告问题', toolElement: '元素 —— 点一下出问题的东西', toolText: '文字 —— 选中有问题的文字',
            toolShot: '截图 —— 拖出一块区域，或单击截整屏', toolList: '本页的报告',
            launcher: '报告问题（{hotkey}）· 可拖动 · 双击复位',
            pickElement: '点一下出问题的元素 · Esc 取消', pickText: '选中有问题的文字 · Esc 取消',
            regionHint: '拖出区域 · 单击 = 整屏 · Esc = 取消',
            describe: '哪里不对？你期望是什么样？', send: '发送', sending: '发送中…', imageN: '图片 {n}/{total}…',
            sendHint: 'Ctrl+Enter 发送 · Ctrl+V 粘贴图片', sayWhat: '请写一下哪里不对',
            sent: '{key} 已发送，谢谢', sentPartial: '{key} 已发送，但有 {n} 张图失败 —— 请在报告里补传',
            addShot: '+ 截图', upload: '上传', markUp: '点击标注', remove: '移除', maxImages: '最多 {n} 张图',
            selected: '选中', element: '元素', selector: '选择器', page: '页面', viewport: '视口',
            request: '请求', browser: '浏览器', noDescription: '无描述',
            listEmpty: '这里没有未关闭的报告', listOpen: '{n} 个未关闭', allReports: '全部报告 ↗', open: '打开 ↗', me: '我',
            shots: '{n} 张截图 —— 点击查看', shotN: '截图 {n} —— 点击查看',
            aiAnalysis: 'AI 分析', proposedFix: '修复方案', isFixed: '你那边修好了吗？',
            notLive: '修复可能还没部署到这台服务器。', fixLive: '修复已上线', fixPending: '尚未部署 —— 当前页面是 v{v}',
            live: '已上线', pending: '待部署', versionTitle: '受影响版本 → 修复版本',
            stillWrong: '还有什么不对？（选“没修好”时必填）', addComment: '添加评论 · Ctrl+Enter',
            locate: '定位', copyAi: '复制给 AI', copyAiTitle: '复制 AI 读取用的 Markdown',
            copied: '已复制 —— 粘贴给 AI 即可', clipboardBlocked: '浏览器禁止了剪贴板',
            withdraw: '撤回', withdrawAsk: '撤回 {key}？', withdrawn: '{key} 已撤回',
            stillBroken: '没修好', fixed: '✓ 修好了', comment: '评论', commentAdded: '评论已添加',
            closed: '{key} 已关闭', reopened: '{key} 已重开', sayStillWrong: '请写一下还有什么不对',
            shotAdded: '截图已加到 {key}', shotFailed: '截图上传失败', shotModule: '截图模块没有加载',
            shotError: '截图失败：{e}',
            shotFallback: '未允许共享标签页 —— 已改用兼容截图（不够精确）。按 Ctrl+V 粘贴系统截图可得到原样画面。',
            gone: '页面上已经找不到这个元素了', back: '返回', close: '关闭（Esc）',
            prev: '上一张（←）', next: '下一张（→）', original: '打开原图',
            badgeOpen: '这里有 {n} 个未关闭', badgeVerify: '有修复等你验证', loadFailed: '反馈：{e}',
            P1: '紧急 —— 系统不可用、钱或数据算错、无法绕过', P2: '高 —— 主要功能坏了，难以绕过',
            P3: '中 —— 有问题，但能绕过', P4: '低 —— 外观、文案、建议',
            bug: '缺陷', improvement: '建议', question: '疑问',
            new: '新建', triaged: '已分诊', in_progress: '处理中', resolved: '已解决', closedSt: '已关闭',
            res_fixed: '已修复', res_wont_fix: '不修', res_duplicate: '重复',
            res_cannot_reproduce: '无法复现', res_works_as_designed: '设计如此'
        }
    };

    // ── defaults (each can be overridden in init()) ─────────────────────

    var DEFAULTS = {
        endpoint: null,            // REST backend base URL — or pass `adapter`
        adapter: null,
        headers: {},               // extra request headers for the REST adapter (auth token, CSRF nonce…)
        assetsUrl: null,           // where eye.png lives; default = this script's folder
        scope: null,               // { id, label, version } — the part of your app the page belongs to
        user: null,                // { id, name } — else the backend's `me`
        locale: null,              // default: <html lang>, then the browser
        messages: null,            // { key: text } overrides on top of the locale
        theme: null,               // { accent, barBg, launcherBg }
        hotkey: 'ctrl+shift+f',
        maxScreenshots: 6,
        defaultPriority: 'P3',
        priorities: ['P1', 'P2', 'P3', 'P4'],
        types: ['bug', 'improvement', 'question'],
        storageKey: 'eye-for-ai.pos',
        links: null,               // { list(scope) → url|null, item(report) → url|null }
        meta: null,                // () → { extra fields sent with every new report }
        onEvent: null              // (name, detail) — 'sent' | 'commented' | 'verified' | 'withdrawn' | 'error'
    };

    var ICON = {
        element: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>',
        text: '<svg viewBox="0 0 24 24"><path d="M5 4v3h5.5v12h3V7H19V4H5z"/></svg>',
        shot: '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
        list: '<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>'
    };

    var C = null;                  // resolved config
    var MSG = MESSAGES.en;
    var S = { items: [], me: null, tool: null, panel: null, el: {} };
    var SCRIPT_BASE = (function () {
        var s = document.currentScript;
        return s && s.src ? s.src.replace(/[^/]*$/, '') : '';
    })();

    // ── utilities ───────────────────────────────────────────────────────

    function t(key, vars) {
        var s = MSG[key] != null ? MSG[key] : (MESSAGES.en[key] != null ? MESSAGES.en[key] : key);
        return vars ? String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : s;
    }
    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function escLines(v) { return esc(v).replace(/\n/g, '<br>'); }
    function short(v, n) { v = String(v || ''); return v.length > n ? v.substr(0, n - 1) + '…' : v; }
    function capture() { return typeof EyeForAICapture !== 'undefined' ? EyeForAICapture : null; }
    function emit(name, detail) { if (C.onEvent) { try { C.onEvent(name, detail); } catch (e) { /* host bug — not ours to surface */ } } }
    function isMine(b) { return S.me != null && b.reporter_id != null && String(b.reporter_id) === String(S.me); }
    function statusLabel(st) { return st ? t(st === 'closed' ? 'closedSt' : st) : ''; }
    /** Numeric ids read as a number (#3040); named scopes read as their label. */
    function scopeTag(id, label) { return /^\d+$/.test(String(id)) ? '#' + id : (label || id); }

    function toast(msg, type) {
        var old = document.querySelector('.efa-toast');
        if (old) old.remove();
        var el = document.createElement('div');
        el.className = 'efa-toast ' + (type || '');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, type === 'warning' || type === 'error' ? 6000 : 3000);
    }

    /** Adapter result → value, or a toast + null. */
    async function call(method) {
        var args = Array.prototype.slice.call(arguments, 1);
        try {
            return { ok: true, data: await C.adapter[method].apply(C.adapter, args) };
        } catch (e) {
            var msg = (e && e.message) || String(e);
            emit('error', { method: method, message: msg });
            return { ok: false, error: msg };
        }
    }

    // Selector: id short-circuits, two classes max, nth-of-type for twins.
    function getSelector(el) {
        if (!el || el === document.body) return 'body';
        var parts = [];
        while (el && el !== document.body) {
            var sel = el.tagName.toLowerCase();
            var id = el.getAttribute && el.getAttribute('id');
            if (id && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(id)) { parts.unshift(sel + '#' + id); break; }
            var cls = el.getAttribute && el.getAttribute('class');
            if (cls) {
                var keep = cls.trim().split(/\s+/).filter(function (c) {
                    return c.indexOf('efa-') !== 0 && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(c);
                });
                if (keep.length) sel += '.' + keep.slice(0, 2).join('.');
            }
            var parent = el.parentElement;
            if (parent) {
                var twins = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === el.tagName; });
                if (twins.length > 1) sel += ':nth-of-type(' + (twins.indexOf(el) + 1) + ')';
            }
            parts.unshift(sel);
            el = parent;
        }
        return parts.join(' > ');
    }

    function elementText(el) { return short((el.innerText || el.textContent || '').trim().replace(/\s+/g, ' '), 80); }

    function position(rect) {
        return {
            rect: { top: Math.round(rect.top + scrollY), left: Math.round(rect.left + scrollX),
                width: Math.round(rect.width), height: Math.round(rect.height) },
            scrollX: Math.round(scrollX), scrollY: Math.round(scrollY),
            viewportWidth: innerWidth, viewportHeight: innerHeight,
            pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight
        };
    }

    function findTarget(selector) {
        if (!selector) return null;
        try { return document.querySelector(selector); } catch (e) { return null; }
    }

    function isVisible(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        for (var c = el; c && c !== document.body; c = c.parentElement) {
            var s = getComputedStyle(c);
            if (s.display === 'none' || s.visibility === 'hidden') return false;
        }
        return true;
    }

    function pTag(p) { return '<span class="efa-p efa-p-' + esc(p) + '">' + esc(p) + '</span>'; }
    function stTag(b) {
        return '<span class="efa-st s-' + esc(b.status) + '">' + esc(statusLabel(b.status)) +
            (b.resolution ? ' · ' + esc(t('res_' + b.resolution)) : '') + '</span>';
    }

    /** "7m" / "3h" / "2d" / "5w". */
    function age(datetime) {
        var s = Math.max(0, (Date.now() - new Date(String(datetime).replace(' ', 'T')).getTime()) / 1000);
        return s < 3600 ? Math.max(1, Math.floor(s / 60)) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h'
            : s < 86400 * 14 ? Math.floor(s / 86400) + 'd' : Math.floor(s / 604800) + 'w';
    }

    /** "10-29 14:05" in the viewer's timezone (ISO-8601 with Z, or a local "Y-m-d H:i:s"). */
    function stamp(v) {
        var d = new Date(String(v || '').replace(' ', 'T'));
        if (isNaN(d)) return String(v || '');
        var two = function (n) { return (n < 10 ? '0' : '') + n; };
        return two(d.getMonth() + 1) + '-' + two(d.getDate()) + ' ' + two(d.getHours()) + ':' + two(d.getMinutes());
    }

    function link(kind, arg) {
        var fn = C.links && C.links[kind];
        var url = fn ? fn(arg) : null;
        return url ? String(url) : null;
    }

    function shotIcon(b) {
        return '<button type="button" class="efa-shot-ico" title="' + esc(t('shots', { n: b.screenshot_count })) + '">' + ICON.shot +
            (b.screenshot_count > 1 ? b.screenshot_count : '') + '</button>';
    }

    async function viewShots(id) {
        var r = await call('get', id);
        if (!r.ok) { toast(r.error, 'error'); return; }
        var urls = (r.data.screenshots || []).map(function (sh) { return sh.url; });
        if (urls.length) viewer(urls, 0, r.data.key);
    }

    /** Full-size image viewer over the page: ← → to step, Esc / click outside to close. */
    function viewer(urls, start, label) {
        var i = start || 0;
        var ov = document.createElement('div');
        ov.className = 'efa-viewer';
        ov.innerHTML = '<img alt=""><div class="efa-viewer-bar"><span></span>' +
            (urls.length > 1 ? '<button type="button" data-d="-1" title="' + esc(t('prev')) + '">‹</button>' +
                '<button type="button" data-d="1" title="' + esc(t('next')) + '">›</button>' : '') +
            '<a target="_blank" rel="noopener" title="' + esc(t('original')) + '">↗</a>' +
            '<button type="button" data-d="x" title="' + esc(t('close')) + '">&times;</button></div>';
        var img = ov.querySelector('img');
        var show = function () {
            img.src = urls[i];
            ov.querySelector('a').href = urls[i];
            ov.querySelector('.efa-viewer-bar span').textContent = (label ? label + ' · ' : '') + (i + 1) + ' / ' + urls.length;
        };
        var step = function (d) { i = (i + d + urls.length) % urls.length; show(); };
        var close = function () { ov.remove(); document.removeEventListener('keydown', onKey, true); };
        var onKey = function (e) {
            if (e.key === 'Escape') { e.stopPropagation(); close(); }
            else if (e.key === 'ArrowLeft') step(-1);
            else if (e.key === 'ArrowRight') step(1);
        };
        ov.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-d]');
            if (b) { if (b.dataset.d === 'x') close(); else step(+b.dataset.d); return; }
            if (e.target === ov) close();
        });
        document.addEventListener('keydown', onKey, true);
        document.body.appendChild(ov);
        show();
    }

    // ── data ────────────────────────────────────────────────────────────

    async function load() {
        var r = await call('page', { path: location.pathname, url: location.href, scope: C.scope ? C.scope.id : null });
        if (!r.ok) { toast(t('loadFailed', { e: r.error }), 'error'); return; }
        S.items = (r.data.items || []).map(normalize);
        S.me = C.user && C.user.id != null ? C.user.id : r.data.me;
        renderMarkers();
        renderBadge();
        if (S.panel === 'list') showList();
    }

    /** Tolerate the field names of older backends; the contract names win. */
    function normalize(b) {
        var pick = function (a, z) { return b[a] != null ? b[a] : b[z]; };
        return Object.assign({}, b, {
            key: b.key || ('#' + b.id),
            reporter_id: pick('reporter_id', 'reporter_user_id'),
            reporter_name: pick('reporter_name', 'reporter'),
            scope_id: pick('scope_id', 'module_no'),
            scope_label: pick('scope_label', 'module_name'),
            current_version: pick('current_version', 'module_current_version'),
            screenshot_count: b.screenshot_count != null ? b.screenshot_count : (b.screenshots || []).length
        });
    }

    // ── dock: launcher + tool bar ───────────────────────────────────────

    function createDock() {
        var sc = C.scope;
        var root = document.createElement('div');
        root.className = 'efa-root';
        root.setAttribute('data-efa-version', VERSION);
        root.innerHTML =
            '<div class="efa-panel" hidden></div>' +
            '<div class="efa-dock">' +
            '  <div class="efa-bar" role="toolbar" aria-label="' + esc(t('report')) + '">' +
            (sc && sc.id != null ? '<span class="efa-scope" title="' + esc(sc.label || '') + '">' + esc(scopeTag(sc.id, sc.label)) + '</span>' : '') +
            tool('element', 'toolElement') + tool('text', 'toolText') + tool('shot', 'toolShot') +
            '    <button type="button" class="efa-tool" data-tool="list" title="' + esc(t('toolList')) + '">' + ICON.list + '<span class="efa-n"></span></button>' +
            '  </div>' +
            '  <button type="button" class="efa-launch" title="' + esc(t('launcher', { hotkey: hotkeyLabel() })) + '" aria-label="' + esc(t('report')) + '">' +
            '<img src="' + esc((C.assetsUrl || SCRIPT_BASE) + 'eye.png') + '" alt="" draggable="false"></button>' +
            '</div>';
        document.body.appendChild(root);
        S.el.root = root;
        S.el.panel = root.querySelector('.efa-panel');

        var launch = root.querySelector('.efa-launch');
        makeDraggable(launch);
        // Click opens the menu (hover-open popped it up whenever the mouse passed by).
        launch.addEventListener('click', function () {
            if (S.dragged) { S.dragged = false; return; }
            if (S.panel) { closePanel(); root.classList.remove('open'); return; }
            root.classList.toggle('open');
        });
        root.querySelectorAll('.efa-tool').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var name = btn.dataset.tool;
                if (name === 'list') { S.panel === 'list' ? closePanel() : showList(); return; }
                S.tool === name ? deactivate() : activate(name);
            });
        });
    }

    function tool(name, label) {
        return '<button type="button" class="efa-tool" data-tool="' + name + '" title="' + esc(t(label)) +
            '" aria-label="' + esc(t(label).split(' — ')[0]) + '">' + ICON[name] + '</button>';
    }

    // ── drag the launcher anywhere (pinned, it covers page content) ──────

    var DRAG_SLOP = 4;           // px of movement before a press counts as a drag, not a click
    var LAUNCH_HALF = 22;        // half the launcher's size

    function savedPos() {
        try { var p = JSON.parse(localStorage.getItem(C.storageKey) || 'null'); return p && isFinite(p.x) && isFinite(p.y) ? p : null; }
        catch (e) { return null; }
    }

    /**
     * Anchor the dock at the launcher's centre (x, y). The menu and panel open toward
     * the roomier side, so a launcher dragged to a top or left edge never pushes the
     * panel off-screen.
     */
    function place(pos) {
        var root = S.el.root;
        if (!pos) { root.removeAttribute('style'); root.classList.remove('efa-left', 'efa-top'); applyTheme(); return; }
        var x = Math.min(Math.max(pos.x, LAUNCH_HALF + 4), innerWidth - LAUNCH_HALF - 4);
        var y = Math.min(Math.max(pos.y, LAUNCH_HALF + 4), innerHeight - LAUNCH_HALF - 4);
        var left = x < innerWidth / 2;
        var top = y < innerHeight / 2;
        root.classList.toggle('efa-left', left);
        root.classList.toggle('efa-top', top);
        root.style.left = left ? (x - LAUNCH_HALF) + 'px' : 'auto';
        root.style.right = left ? 'auto' : (innerWidth - x - LAUNCH_HALF) + 'px';
        root.style.top = top ? (y - LAUNCH_HALF) + 'px' : 'auto';
        root.style.bottom = top ? 'auto' : (innerHeight - y - LAUNCH_HALF) + 'px';
        // Room left for the panel on its side of the launcher.
        root.style.setProperty('--efa-room', Math.max(200, (top ? innerHeight - y : y) - LAUNCH_HALF - 24) + 'px');
    }

    function makeDraggable(launch) {
        var start = null;
        launch.addEventListener('pointerdown', function (e) {
            if (e.button !== 0) return;
            var r = launch.getBoundingClientRect();
            start = { px: e.clientX, py: e.clientY, dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2), moved: false };
            launch.setPointerCapture(e.pointerId);
        });
        launch.addEventListener('pointermove', function (e) {
            if (!start) return;
            if (!start.moved && Math.abs(e.clientX - start.px) + Math.abs(e.clientY - start.py) < DRAG_SLOP) return;
            start.moved = true;
            S.el.root.classList.add('efa-dragging');
            S.pos = { x: e.clientX - start.dx, y: e.clientY - start.dy };
            place(S.pos);
        });
        var end = function () {
            if (!start) return;
            if (start.moved) {
                S.dragged = true;          // swallow the click that follows the drop
                S.el.root.classList.remove('efa-dragging');
                try { localStorage.setItem(C.storageKey, JSON.stringify(S.pos)); } catch (err) { /* private mode: lasts this page only */ }
            }
            start = null;
        };
        launch.addEventListener('pointerup', end);
        launch.addEventListener('pointercancel', end);
        // Double-click puts it back in the corner.
        launch.addEventListener('dblclick', function () {
            S.pos = null;
            try { localStorage.removeItem(C.storageKey); } catch (err) { /* ignore */ }
            place(null);
        });
        S.pos = savedPos();
        place(S.pos);
    }

    function markTool(name) {
        S.el.root.querySelectorAll('.efa-tool').forEach(function (b) { b.classList.toggle('on', b.dataset.tool === name); });
    }

    function renderBadge() {
        var launch = S.el.root.querySelector('.efa-launch');
        var open = S.items.filter(function (b) { return b.status !== 'resolved'; }).length;
        var waiting = S.items.some(function (b) { return b.status === 'resolved' && isMine(b); });
        var badge = launch.querySelector('.efa-badge');
        if (open > 0 || waiting) {
            if (!badge) { badge = document.createElement('span'); badge.className = 'efa-badge'; launch.appendChild(badge); }
            badge.textContent = open > 0 ? open : '✓';
            badge.title = waiting ? t('badgeVerify') : t('badgeOpen', { n: open });
            badge.classList.toggle('verify', waiting && open === 0);
        } else if (badge) {
            badge.remove();
        }
        S.el.root.querySelector('.efa-tool[data-tool=list] .efa-n').textContent = S.items.length || '';
    }

    // ── panel ───────────────────────────────────────────────────────────

    /** @return {HTMLElement} the panel, filled */
    function openPanel(mode, headHtml, bodyHtml, footHtml, onBack) {
        var p = S.el.panel;
        if (S.onPanelClose) { S.onPanelClose(); S.onPanelClose = null; }
        S.panel = mode;
        p.className = 'efa-panel efa-panel-' + mode;
        p.innerHTML = '<div class="efa-head">' + (onBack ? '<button type="button" class="efa-back" title="' + esc(t('back')) + '">‹</button>' : '') +
            '<div class="efa-head-title">' + headHtml + '</div><button type="button" class="efa-x" title="' + esc(t('close')) + '">&times;</button></div>' +
            '<div class="efa-body">' + bodyHtml + '</div>' + (footHtml ? '<div class="efa-foot">' + footHtml + '</div>' : '');
        p.hidden = false;
        p.querySelector('.efa-x').addEventListener('click', closePanel);
        if (onBack) p.querySelector('.efa-back').addEventListener('click', onBack);
        S.el.root.classList.add('open');
        markTool(mode === 'list' || mode === 'detail' ? 'list' : null);
        return p;
    }

    function closePanel() {
        if (S.onPanelClose) { S.onPanelClose(); S.onPanelClose = null; }
        S.panel = null;
        S.el.panel.hidden = true;
        S.el.panel.innerHTML = '';
        markTool(null);
    }

    // ── markers ─────────────────────────────────────────────────────────

    function renderMarkers() {
        var seen = {};
        document.querySelectorAll('.efa-marker').forEach(function (m) { seen[m.dataset.id] = m; });
        var used = {};
        S.items.forEach(function (b) {
            var target = b.capture_type === 'screenshot' ? null : findTarget(b.selector);
            if (!isVisible(target)) return;
            var r = target.getBoundingClientRect();
            var m = seen[b.id];
            if (!m) {
                m = document.createElement('div');
                m.className = 'efa-marker efa-p-' + b.priority + (b.status === 'resolved' ? ' done' : '');
                m.dataset.id = b.id;
                m.title = b.key + ' · ' + b.title;
                m.addEventListener('click', function (e) { e.stopPropagation(); showDetail(b.id); });
                document.body.appendChild(m);
            }
            m.textContent = b.id;
            m.style.left = (r.right + scrollX - 10) + 'px';
            m.style.top = (r.top + scrollY - 10) + 'px';
            used[b.id] = true;
        });
        Object.keys(seen).forEach(function (id) { if (!used[id]) seen[id].remove(); });
    }

    // ── pickers ─────────────────────────────────────────────────────────

    function activate(name) {
        deactivate();
        if (name === 'shot') { startShotReport(); return; }
        S.tool = name;
        markTool(name);
        if (name === 'element') {
            var pick = document.createElement('div');
            pick.className = 'efa-pick';
            var hl = document.createElement('div');
            hl.className = 'efa-hl';
            hl.innerHTML = '<span></span>';
            document.body.appendChild(pick);
            document.body.appendChild(hl);
            S.el.pick = pick;
            S.el.hl = hl;
            pick.addEventListener('mousemove', onHover);
            pick.addEventListener('click', onPick);
            S.hint = toastHint(t('pickElement'));
        } else if (name === 'text') {
            // Already highlighted something before clicking Text? Take it right away.
            if (pickSelection()) return;
            document.addEventListener('mouseup', onSelectText);
            document.addEventListener('keyup', onSelectText);      // Shift+arrow selections
            document.documentElement.classList.add('efa-picking-text');
            S.hint = toastHint(t('pickText'));
        }
    }

    function toastHint(msg) { toast(msg); return document.querySelector('.efa-toast'); }

    function deactivate() {
        if (S.hint) { S.hint.remove(); S.hint = null; }
        S.tool = null;
        markTool(S.panel === 'list' || S.panel === 'detail' ? 'list' : null);
        if (S.el.pick) { S.el.pick.remove(); S.el.pick = null; }
        if (S.el.hl) { S.el.hl.remove(); S.el.hl = null; }
        document.removeEventListener('mouseup', onSelectText);
        document.removeEventListener('keyup', onSelectText);
        document.documentElement.classList.remove('efa-picking-text');
    }

    function elementUnder(e) {
        S.el.pick.style.pointerEvents = 'none';
        var el = document.elementFromPoint(e.clientX, e.clientY);
        S.el.pick.style.pointerEvents = '';
        return el && !el.closest('.efa-root, .efa-marker, .efa-toast') ? el : null;
    }

    function onHover(e) {
        var el = elementUnder(e);
        var hl = S.el.hl;
        if (!el) { hl.style.display = 'none'; return; }
        var r = el.getBoundingClientRect();
        hl.style.cssText = 'display:block;left:' + (r.left + scrollX) + 'px;top:' + (r.top + scrollY) + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
        hl.firstChild.textContent = el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : '');
    }

    function onPick(e) {
        var el = elementUnder(e);
        if (!el) return;
        e.preventDefault();
        var selector = getSelector(el);
        var text = elementText(el);
        deactivate();
        compose({ capture_type: 'element', selector: selector, element_text: text, position: position(el.getBoundingClientRect()),
            ctx: (text ? '“' + esc(text) + '” · ' : '') + '<code>' + esc(short(selector, 90)) + '</code>' });
    }

    function onSelectText(e) {
        if (e.target && e.target.closest && e.target.closest('.efa-root')) return;
        // mouseup fires before a double-click word selection settles — read it a tick later.
        setTimeout(pickSelection, 0);
    }

    /** The current page selection → compose. @return {boolean} whether there was one */
    function pickSelection() {
        var got = selectionInField() || selectionInPage();
        if (!got) return false;
        deactivate();
        compose({ capture_type: 'text', selected_text: got.text, text_context: got.context, selector: getSelector(got.host),
            position: position(got.rect), ctx: esc(t('selected')) + ' “<b>' + esc(short(got.text, 80)) + '</b>”' });
        return true;
    }

    function around(full, picked) {
        var at = Math.max(0, full.indexOf(picked));
        return '…' + full.substring(Math.max(0, at - 40), Math.min(full.length, at + picked.length + 40)).replace(/\s+/g, ' ') + '…';
    }

    /** getSelection() does not see text selected inside an <input>/<textarea> — read those directly. */
    function selectionInField() {
        var f = document.activeElement;
        if (!f || f.closest('.efa-root') || !/^(INPUT|TEXTAREA)$/.test(f.tagName)) return null;
        var text;
        try { text = f.value.substring(f.selectionStart, f.selectionEnd).trim(); } catch (err) { return null; }   // type=number etc.
        return text ? { text: text, context: around(f.value, text), host: f, rect: f.getBoundingClientRect() } : null;
    }

    function selectionInPage() {
        var sel = getSelection();
        var picked = sel && sel.rangeCount ? sel.toString().trim() : '';
        if (!picked) return null;
        var range = sel.getRangeAt(0);
        var box = range.commonAncestorContainer;
        var host = box.nodeType === 1 ? box : box.parentElement;
        if (host && host.closest('.efa-root')) return null;
        return { text: picked, context: around(box.textContent || '', picked), host: host, rect: range.getBoundingClientRect() };
    }

    // ── screenshots ─────────────────────────────────────────────────────

    /** @return {Promise<string|null>} data URL (not annotated — click the thumbnail for that) */
    async function grabShot() {
        var cap = capture();
        if (!cap) { toast(t('shotModule'), 'error'); return null; }
        var wasNative = cap.isNativeAvailable();
        var shot;
        try { shot = await cap.grab({ hint: t('regionHint') }); } catch (e) { toast(t('shotError', { e: e.message || e }), 'error'); return null; }
        if (!shot) return null;
        if (!shot.native && wasNative) toast(t('shotFallback'), 'warning');
        return shot.canvas.toDataURL('image/png');
    }

    async function startShotReport() {
        markTool('shot');
        var img = await grabShot();
        markTool(null);
        if (!img) { if (capture()) capture().release(); return; }
        compose({ capture_type: 'screenshot', images: [img],
            position: position({ top: 0, left: 0, width: innerWidth, height: innerHeight }), ctx: '' });
    }

    /** Thumbnails + capture / paste / drop / upload / remove / click to mark up. */
    function imageStrip(panel, images) {
        var max = C.maxScreenshots;
        var strip = panel.querySelector('.efa-shots');
        var file = panel.querySelector('.efa-file');
        var render = function () {
            strip.innerHTML = images.map(function (src, i) {
                return '<div class="efa-thumb" data-i="' + i + '" title="' + esc(t('markUp')) + '"><img src="' + esc(src) + '" alt="">' +
                    '<button type="button" class="efa-thumb-x" data-i="' + i + '" title="' + esc(t('remove')) + '">&times;</button></div>';
            }).join('') + (images.length < max
                ? '<button type="button" class="efa-add" data-add="shot" title="' + esc(t('toolShot')) + '">' + esc(t('addShot')) + '</button>' +
                  '<button type="button" class="efa-add" data-add="file">' + esc(t('upload')) + '</button>' : '');
        };
        var add = function (src) {
            if (images.length >= max) { toast(t('maxImages', { n: max }), 'warning'); return; }
            images.push(src);
            render();
        };
        var addBlobs = function (blobs) {
            blobs.forEach(function (b) { capture().fromBlob(b).then(add).catch(function (e) { toast(e.message, 'warning'); }); });
        };
        strip.addEventListener('click', async function (e) {
            var x = e.target.closest('.efa-thumb-x');
            if (x) { images.splice(+x.dataset.i, 1); render(); return; }
            var a = e.target.closest('.efa-add');
            if (a && a.dataset.add === 'file') { file.click(); return; }
            if (a) { var img = await grabShot(); if (img) add(img); return; }
            var th = e.target.closest('.efa-thumb');
            if (th) {
                var i = +th.dataset.i;
                var marked = await capture().annotate(await capture().toCanvas(images[i]));
                if (marked) { images[i] = marked; render(); }
            }
        });
        file.addEventListener('change', function () { addBlobs(Array.prototype.slice.call(file.files || [])); file.value = ''; });
        // Paste works anywhere on the page while the report is open — not just in the panel.
        var onPaste = function (e) {
            var blobs = Array.prototype.slice.call((e.clipboardData && e.clipboardData.items) || [])
                .filter(function (it) { return it.kind === 'file' && it.type.indexOf('image/') === 0; })
                .map(function (it) { return it.getAsFile(); });
            if (blobs.length) { e.preventDefault(); addBlobs(blobs); }
        };
        document.addEventListener('paste', onPaste);
        panel.addEventListener('dragover', function (e) { e.preventDefault(); });
        panel.addEventListener('drop', function (e) {
            var blobs = Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || []);
            if (blobs.length) { e.preventDefault(); addBlobs(blobs); }
        });
        render();
        return function () { document.removeEventListener('paste', onPaste); };
    }

    /** One image per request (each stays under the server's body limit), in order. @return {Promise<number>} failures */
    async function uploadImages(id, images, progress) {
        var failed = 0;
        for (var i = 0; i < images.length; i++) {
            if (progress) progress(i + 1, images.length);
            var r;
            try { r = await call('addScreenshot', id, await capture().encode(images[i])); }
            catch (e) { r = { ok: false }; }
            if (!r.ok) failed++;
        }
        return failed;
    }

    function seg(cls, values, current, isPrio) {
        return '<div class="efa-seg ' + cls + '" role="radiogroup">' + values.map(function (v) {
            return '<button type="button" data-v="' + esc(v) + '" class="' + (isPrio ? 'efa-p-' + esc(v) : '') +
                (v === current ? ' on' : '') + '"' + (isPrio ? ' title="' + esc(v + ' · ' + t(v)) + '"' : '') + '>' +
                esc(isPrio ? v : t(v)) + '</button>';
        }).join('') + '</div>';
    }

    function bindSeg(root, cls) {
        var box = root.querySelector('.' + cls);
        box.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b) return;
            box.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
        });
        return function () { return box.querySelector('button.on').dataset.v; };
    }

    // ── compose ─────────────────────────────────────────────────────────

    function scopeHtml() {
        var sc = C.scope;
        if (!sc || sc.id == null) return esc(location.pathname);
        var tag = scopeTag(sc.id, sc.label);
        return esc(tag) + (sc.label && tag !== sc.label ? ' ' + esc(sc.label) : '');
    }

    function compose(cap) {
        var images = (cap.images || []).slice();
        var p = openPanel('compose', esc(t('report')) + ' <small>' + scopeHtml() + '</small>',
            (cap.ctx ? '<div class="efa-ctx">' + cap.ctx + '</div>' : '') +
            '<textarea placeholder="' + esc(t('describe')) + '"></textarea>' +
            '<div class="efa-row">' + seg('efa-prio', C.priorities, C.defaultPriority, true) + seg('efa-type', C.types, C.types[0], false) + '</div>' +
            '<div class="efa-shots"></div><input type="file" class="efa-file" accept="image/*" multiple hidden>',
            '<span class="efa-hint">' + esc(t('sendHint')) + '</span><button type="button" class="efa-btn primary efa-send">' + esc(t('send')) + '</button>');
        var stopPaste = imageStrip(p, images);
        S.onPanelClose = function () { stopPaste(); if (capture()) capture().release(); };
        var prio = bindSeg(p, 'efa-prio');
        var type = bindSeg(p, 'efa-type');
        var ta = p.querySelector('textarea');
        var send = p.querySelector('.efa-send');
        ta.focus();
        var submit = async function () {
            var desc = ta.value.trim();
            if (!desc) { toast(t('sayWhat'), 'warning'); ta.focus(); return; }
            if (send.disabled) return;
            send.disabled = true;
            send.textContent = t('sending');
            var report = Object.assign({
                capture_type: cap.capture_type, description: desc, priority: prio(), issue_type: type(),
                page_url: location.href, page_path: location.pathname, page_title: document.title,
                selector: cap.selector || '', element_text: cap.element_text || '',
                selected_text: cap.selected_text || '', text_context: cap.text_context || '',
                position: cap.position, user_agent: navigator.userAgent,
                scope_id: C.scope ? C.scope.id : null, scope_label: C.scope ? C.scope.label || null : null, affects_version: C.scope ? C.scope.version || null : null,
                widget_version: VERSION
            }, C.meta ? C.meta() : {});
            var r = await call('create', report);
            if (!r.ok) { send.disabled = false; send.textContent = t('send'); toast(r.error, 'error'); return; }
            var key = r.data.key || ('#' + r.data.id);
            var failed = await uploadImages(r.data.id, images, function (n, total) { send.textContent = t('imageN', { n: n, total: total }); });
            closePanel();
            toast(failed ? t('sentPartial', { key: key, n: failed }) : t('sent', { key: key }), failed ? 'warning' : 'success');
            emit('sent', { id: r.data.id, key: key, report: report, failedImages: failed });
            load();
        };
        send.addEventListener('click', submit);
        p.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } });
    }

    // ── list ────────────────────────────────────────────────────────────

    function showList() {
        var body = S.items.length ? '<div class="efa-list">' + S.items.map(function (b) {
            return '<div class="efa-item' + (b.status === 'resolved' ? ' done' : '') + '" data-id="' + esc(b.id) + '" title="' + esc(b.key + ' · ' + b.title) + '">' +
                '<span class="efa-key">' + esc(b.key) + '</span>' + pTag(b.priority) +
                '<span class="efa-item-title">' + esc(b.title) + '</span>' +
                (b.screenshot_count ? shotIcon(b) : '') +
                stTag(b) + (isMine(b) ? '<span class="efa-hint">' + esc(t('me')) + '</span>' : '') + '</div>';
        }).join('') + '</div>' : '<div class="efa-empty">' + esc(t('listEmpty')) + '</div>';
        var all = link('list', C.scope);
        var p = openPanel('list', scopeHtml() + ' <small>' + esc(t('listOpen', { n: S.items.length })) + '</small>', body,
            all ? '<a class="efa-btn" href="' + esc(all) + '" target="_blank" rel="noopener">' + esc(t('allReports')) + '</a>' : '');
        p.querySelectorAll('.efa-item').forEach(function (row) {
            row.addEventListener('click', function (e) {
                if (e.target.closest('.efa-shot-ico')) { viewShots(row.dataset.id); return; }
                var b = byId(row.dataset.id);
                if (b && b.capture_type !== 'screenshot') locate(b.selector, true);
                showDetail(row.dataset.id, true);
            });
        });
    }

    function byId(id) { return S.items.filter(function (b) { return String(b.id) === String(id); })[0] || null; }

    // ── detail ──────────────────────────────────────────────────────────

    async function showDetail(id, fromList) {
        var r = await call('get', id);
        if (!r.ok) { toast(r.error, 'error'); return; }
        var b = normalize(r.data);
        var mine = isMine(b);
        var p = openPanel('detail', detailHead(b), detailBody(b, mine), detailFoot(b, mine), fromList ? showList : null);
        bindDetail(p, b, mine);
    }

    /** One line: #009 [P2] title · status · scope · version · type · reporter · age. */
    function detailHead(b) {
        var ver = b.affects_version ? 'v' + esc(b.affects_version) : '';
        if (b.fix_version) {
            ver += ' → <span class="' + (b.fix_deployed ? 'efa-ok' : 'efa-warn') + '" title="' +
                esc(b.fix_deployed ? t('fixLive') : t('fixPending', { v: b.current_version || '?' })) + '">v' +
                esc(b.fix_version) + ' ' + esc(b.fix_deployed ? t('live') : t('pending')) + '</span>';
        }
        return '<span class="efa-key">' + esc(b.key) + '</span>' + pTag(b.priority) +
            '<span class="efa-head-name" title="' + esc(b.title) + '">' + esc(b.title) + '</span>' +
            '<span class="efa-head-meta">' + stTag(b) +
            (b.scope_id != null ? '<span title="' + esc(b.scope_label || b.scope_id) + '"><b>' + esc(scopeTag(b.scope_id, b.scope_label)) + '</b>' +
                (/^\d+$/.test(String(b.scope_id)) && b.scope_label ? ' ' + esc(short(b.scope_label, 28)) : '') + '</span>' : '') +
            (ver ? '<span class="efa-mono" title="' + esc(t('versionTitle')) + '">' + ver + '</span>' : '') +
            '<span>' + esc(t(b.issue_type)) + '</span>' +
            '<span>' + esc(b.reporter_name || '—') + '</span>' +
            '<span title="' + esc(b.created_at) + '">' + esc(age(b.created_at)) + '</span></span>';
    }

    /** Left = what is wrong and what happened since; right = pictures and the captured log. */
    function detailBody(b, mine) {
        var shots = (b.screenshots || []).map(function (sh, i) {
            return '<button type="button" class="efa-shot" data-i="' + i + '" title="' + esc(t('shotN', { n: i + 1 })) + '">' +
                '<img src="' + esc(sh.url) + '" alt="" loading="lazy"></button>';
        }).join('');
        var log = contextRows(b);
        var events = (b.events || []).filter(function (e) { return e.kind === 'comment' || e.kind === 'status'; });

        var left = '<div class="efa-desc">' + (b.description ? escLines(b.description) : '<span class="efa-hint">' + esc(t('noDescription')) + '</span>') + '</div>';
        if (b.ai_analysis || b.ai_solution) {
            left += '<div class="efa-box"><b>' + esc(t('aiAnalysis')) + '</b>' + escLines(b.ai_analysis || '') +
                (b.ai_solution ? '<b>' + esc(t('proposedFix')) + '</b>' + escLines(b.ai_solution) : '') + '</div>';
        }
        if (events.length) {
            left += '<div class="efa-tl">' + events.map(function (e) {
                var what = e.kind === 'status' ? '<span class="efa-tl-what">' + esc((e.from ? statusLabel(e.from) + ' → ' : '') + statusLabel(e.to)) + '</span>' : '';
                return '<div><span class="efa-meta">' + esc(stamp(e.created_at)) + ' · ' + esc(e.actor || e.actor_type || '') + '</span>' +
                    what + (e.body ? ' ' + escLines(e.body) : '') + '</div>';
            }).join('') + '</div>';
        }
        if (mine && b.status === 'resolved') {
            left += '<div class="efa-box verify"><b>' + esc(t('isFixed')) + '</b>' +
                (b.fix_deployed === false ? '<div class="efa-warn">' + esc(t('notLive')) + '</div>' : '') + '</div>';
        }
        if (b.status !== 'closed') {
            left += '<textarea class="efa-note" rows="4" placeholder="' + esc(mine && b.status === 'resolved' ? t('stillWrong') : t('addComment')) + '"></textarea>';
        }
        if (!shots && !log) return '<div class="efa-cols one"><div class="efa-col">' + left + '</div></div>';
        return '<div class="efa-cols"><div class="efa-col">' + left + '</div><div class="efa-col efa-side">' +
            (shots ? '<div class="efa-gallery">' + shots + '</div>' : '') +
            (log ? '<dl class="efa-log">' + log + '</dl>' : '') + '</div></div>';
    }

    /** The captured "log": what was picked, where, on which screen and browser. */
    function contextRows(b) {
        var pos = b.position || {};
        var rows = [];
        var add = function (k, v) { if (v) rows.push('<dt>' + esc(t(k)) + '</dt><dd>' + v + '</dd>'); };
        add('selected', b.selected_text ? '“' + esc(b.selected_text) + '”' : '');
        add('element', b.element_text ? esc(b.element_text) : '');
        add('selector', b.selector && b.capture_type !== 'screenshot' ? '<code>' + esc(b.selector) + '</code>' : '');
        add('page', b.page_path ? '<code>' + esc(b.page_path) + '</code>' : '');
        add('viewport', pos.viewportWidth ? esc(pos.viewportWidth + '×' + pos.viewportHeight + ' · scrollY ' + (pos.scrollY || 0)) : '');
        add('request', b.request_id ? '<code>' + esc(b.request_id) + '</code>' : '');
        add('browser', b.user_agent ? '<span class="efa-hint">' + esc(b.user_agent) + '</span>' : '');
        return rows.join('');
    }

    function detailFoot(b, mine) {
        var out = '';
        if (b.selector && b.capture_type !== 'screenshot') out += btn('locate', t('locate'));
        if (b.status !== 'closed' && (b.screenshots || []).length < C.maxScreenshots) out += btn('shot', t('addShot'));
        out += '<button type="button" class="efa-btn" data-do="copy" title="' + esc(t('copyAiTitle')) + '">' + esc(t('copyAi')) + '</button>';
        var page = link('item', b);
        if (page) out += '<a class="efa-btn" href="' + esc(page) + '" target="_blank" rel="noopener">' + esc(t('open')) + '</a>';
        out += '<span style="margin-left:auto"></span>';
        if (mine && b.status === 'new') out += btn('withdraw', t('withdraw'), 'danger');
        if (mine && b.status === 'resolved') {
            out += btn('reopen', t('stillBroken'), 'danger') + btn('fixed', t('fixed'), 'primary');
        } else if (b.status !== 'closed') {
            out += btn('comment', t('comment'), 'primary');
        }
        return out;
    }

    function btn(action, label, kind) {
        return '<button type="button" class="efa-btn' + (kind ? ' ' + kind : '') + '" data-do="' + action + '">' + esc(label) + '</button>';
    }

    function bindDetail(p, b, mine) {
        var note = p.querySelector('.efa-note');
        var done = function (r, msg, event) {
            if (!r.ok) { toast(r.error, 'error'); return; }
            toast(msg, 'success');
            if (event) emit(event, { id: b.id, key: b.key });
            load();
            showDetail(b.id);
        };
        var actions = {
            locate: function () { locate(b.selector); },
            copy: async function () {
                var r = await call('markdown', b.id);
                if (!r.ok) { toast(r.error, 'error'); return; }
                try { await navigator.clipboard.writeText(r.data); toast(t('copied'), 'success'); }
                catch (e) { toast(t('clipboardBlocked'), 'error'); }
            },
            shot: async function () {
                var img = await grabShot();
                if (capture()) capture().release();
                if (!img) return;
                var failed = await uploadImages(b.id, [img]);
                done(failed ? { ok: false, error: t('shotFailed') } : { ok: true }, t('shotAdded', { key: b.key }));
            },
            withdraw: async function () {
                if (!confirm(t('withdrawAsk', { key: b.key }))) return;
                var r = await call('withdraw', b.id);
                if (!r.ok) { toast(r.error, 'error'); return; }
                closePanel();
                toast(t('withdrawn', { key: b.key }), 'success');
                emit('withdrawn', { id: b.id, key: b.key });
                load();
            },
            comment: async function () {
                var body = note.value.trim();
                if (!body) { note.focus(); return; }
                done(await call('comment', b.id, body), t('commentAdded'), 'commented');
            },
            fixed: async function () {
                done(await call('verify', b.id, true, note.value.trim()), t('closed', { key: b.key }), 'verified');
            },
            reopen: async function () {
                if (!note.value.trim()) { toast(t('sayStillWrong'), 'warning'); note.focus(); return; }
                done(await call('verify', b.id, false, note.value.trim()), t('reopened', { key: b.key }), 'verified');
            }
        };
        var gallery = p.querySelector('.efa-gallery');
        if (gallery) gallery.addEventListener('click', function (e) {
            var th = e.target.closest('.efa-shot');
            if (th) viewer(b.screenshots.map(function (sh) { return sh.url; }), +th.dataset.i, b.key);
        });
        p.querySelector('.efa-foot').addEventListener('click', function (e) {
            var el = e.target.closest('[data-do]');
            if (el && actions[el.dataset.do]) actions[el.dataset.do]();
        });
        if (note) note.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); (mine && b.status === 'resolved' ? actions.reopen : actions.comment)(); }
        });
    }

    function locate(selector, quiet) {
        var el = findTarget(selector);
        if (!el) { if (!quiet) toast(t('gone'), 'warning'); return; }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('efa-locate');
        setTimeout(function () { el.classList.remove('efa-locate'); }, 2200);
    }

    // ── REST adapter (the default backend) ──────────────────────────────

    /**
     * Talks to a server implementing BACKEND-CONTRACT.md. Accepts plain JSON or an
     * envelope { success, data, error: { message } }.
     */
    function rest(opts) {
        var base = String(opts.endpoint).replace(/\/+$/, '');
        var headers = opts.headers || {};
        async function req(path, method, body) {
            var h = Object.assign({ Accept: 'application/json' }, typeof headers === 'function' ? headers() : headers);
            var init = { method: method || 'GET', credentials: opts.credentials || 'same-origin', headers: h };
            if (body !== undefined) { h['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
            var res = await fetch(base + path, init);
            var data = null;
            try { data = await res.json(); } catch (e) { /* empty / non-JSON body */ }
            if (data && typeof data === 'object' && 'success' in data) {
                if (!data.success) throw new Error((data.error && data.error.message) || ('HTTP ' + res.status));
                return data.data;
            }
            if (!res.ok) throw new Error((data && (data.message || (data.error && (data.error.message || data.error)))) || ('HTTP ' + res.status));
            return data;
        }
        var id = function (v) { return '/' + encodeURIComponent(v); };
        return {
            page: async function (q) {
                var d = await req('/page?path=' + encodeURIComponent(q.path) + (q.scope != null ? '&scope=' + encodeURIComponent(q.scope) : ''));
                return { items: d.items || d.bugs || [], me: d.me };
            },
            get: function (v) { return req(id(v)); },
            create: function (report) { return req('', 'POST', report); },
            addScreenshot: function (v, image) { return req(id(v) + '/screenshots', 'POST', { image: image }); },
            comment: function (v, body) { return req(id(v) + '/comments', 'POST', { body: body }); },
            verify: function (v, fixed, note) { return req(id(v) + '/verify', 'POST', { fixed: fixed, note: note }); },
            withdraw: function (v) { return req(id(v), 'DELETE'); },
            markdown: async function (v) { var d = await req(id(v) + '/markdown?envelope=1'); return typeof d === 'string' ? d : d.markdown; }
        };
    }

    // ── init ────────────────────────────────────────────────────────────

    function resolveLocale(want) {
        var tags = [want, document.documentElement.lang, navigator.language].filter(Boolean);
        for (var i = 0; i < tags.length; i++) {
            if (MESSAGES[tags[i]]) return tags[i];
            var lang = String(tags[i]).split('-')[0];
            for (var k in MESSAGES) if (k.split('-')[0] === lang) return k;
        }
        return 'en';
    }

    function hotkeyLabel() {
        return String(C.hotkey || '').split('+').map(function (k) { return k.charAt(0).toUpperCase() + k.slice(1); }).join('+');
    }

    function matchesHotkey(e) {
        if (!C.hotkey) return false;
        var keys = String(C.hotkey).toLowerCase().split('+');
        var main = keys[keys.length - 1];
        return e.key.toLowerCase() === main && e.ctrlKey === (keys.indexOf('ctrl') >= 0) &&
            e.shiftKey === (keys.indexOf('shift') >= 0) && e.altKey === (keys.indexOf('alt') >= 0);
    }

    /** theme → CSS custom properties on the widget root (eye-for-ai.css reads them). */
    function applyTheme() {
        var th = C.theme || {};
        var map = { accent: '--efa-accent', barBg: '--efa-bar-bg', launcherBg: '--efa-launch-bg', onAccent: '--efa-on-accent' };
        Object.keys(map).forEach(function (k) {
            if (th[k]) document.documentElement.style.setProperty(map[k], th[k]);
        });
    }

    function init(options) {
        if (C) return api;                          // already running
        if (document.querySelector('.efa-root')) return api;
        C = Object.assign({}, DEFAULTS, options || {});
        if (!C.adapter) {
            if (!C.endpoint) throw new Error('Eye for AI: pass `endpoint` (REST backend) or `adapter`');
            C.adapter = rest({ endpoint: C.endpoint, headers: C.headers, credentials: C.credentials });
        }
        var missing = ADAPTER.filter(function (m) { return typeof C.adapter[m] !== 'function'; });
        if (missing.length) throw new Error('Eye for AI: adapter is missing ' + missing.join(', '));
        MSG = Object.assign({}, MESSAGES.en, MESSAGES[resolveLocale(C.locale)], C.messages || {});

        var start = function () {
            if (!C) return;                         // destroyed before the DOM was ready
            applyTheme();
            createDock();
            bindGlobal();
            load();
            // #efa-locate=<selector> — a ticket's "open page" link lands here and highlights the element.
            var m = location.hash.match(/^#efa-locate=(.+)$/);
            if (m) setTimeout(function () { locate(decodeURIComponent(m[1])); }, 600);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
        return api;
    }

    /** Document-level listeners: bound once, they read the live state (destroy + init must not stack them). */
    var globalBound = false;
    function bindGlobal() {
        if (globalBound) return;
        globalBound = true;
        // A click anywhere else folds the bare menu away; an open panel or picker keeps it.
        document.addEventListener('mousedown', function (e) {
            var root = C && S.el.root;
            if (root && !S.panel && !S.tool && !root.contains(e.target)) root.classList.remove('open');
        }, true);
        document.addEventListener('keydown', function (e) {
            if (!C || !S.el.root) return;
            if (matchesHotkey(e)) { e.preventDefault(); S.el.root.classList.toggle('open'); }
            if (e.key === 'Escape' && !document.getElementById('efa-screenshot-overlay') && !document.querySelector('.efa-region, .efa-viewer')) {
                if (S.tool) deactivate(); else if (S.panel) closePanel();
            }
        });
        var timer = null;
        var rerender = function () { if (!timer) timer = setTimeout(function () { timer = null; if (C && S.el.root) renderMarkers(); }, 120); };
        addEventListener('scroll', rerender, { passive: true });
        addEventListener('resize', rerender);
        document.addEventListener('htmx:afterSwap', rerender);
        addEventListener('resize', function () { if (C && S.pos) place(S.pos); });
    }

    function destroy() {
        if (!C) return;
        if (S.el.root) { deactivate(); if (S.panel) closePanel(); }
        document.querySelectorAll('.efa-root, .efa-marker, .efa-toast').forEach(function (el) { el.remove(); });
        C = null;
        S = { items: [], me: null, tool: null, panel: null, el: {} };
    }

    var api = {
        version: VERSION,
        init: init,
        destroy: destroy,
        reload: function () { return C ? load() : Promise.resolve(); },
        open: function (tool) { if (!C) return; S.el.root.classList.add('open'); if (tool === 'list') showList(); else if (tool) activate(tool); },
        rest: rest,
        messages: MESSAGES,                 // add a locale: EyeForAI.messages.fr = {...} before init()
        state: function () { return S; }
    };
    window.EyeForAI = api;

    if (window.EyeForAIConfig) init(window.EyeForAIConfig);
})();

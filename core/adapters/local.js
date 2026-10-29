/**
 * Eye for AI Core — browser-only adapter (localStorage). For demos, prototypes and
 * trying the widget without a server; also the reference for writing your own adapter.
 *
 *   EyeForAI.init({ adapter: EyeForAILocal.adapter({ user: { id: 'u1', name: 'Ann' } }) });
 *
 * EyeForAILocal.act(id, { status, resolution, ai_analysis, ai_solution, fix_version })
 * plays the AI / developer side, so the whole workflow can be shown on one page.
 * Screenshots are stored as data URLs — fine for a demo, not for production
 * (localStorage holds ~5 MB).
 */
(function () {
    'use strict';

    var KEY = 'eye-for-ai.local';

    function read() {
        try { return JSON.parse(localStorage.getItem(KEY) || 'null') || { seq: 0, items: [] }; }
        catch (e) { return { seq: 0, items: [] }; }
    }
    function write(db) {
        try { localStorage.setItem(KEY, JSON.stringify(db)); }
        catch (e) { throw new Error('Browser storage is full — clear the demo data'); }
    }
    function now() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }
    function find(db, id) {
        var b = db.items.filter(function (x) { return String(x.id) === String(id); })[0];
        if (!b) throw new Error('Report not found');
        return b;
    }
    function key(id) { return '#' + String(id).padStart(3, '0'); }
    function title(text) { var line = String(text).split('\n')[0].trim(); return line.length > 80 ? line.slice(0, 79) + '…' : line; }
    function copy(v) { return JSON.parse(JSON.stringify(v)); }

    function summary(b) {
        var out = copy(b);
        out.screenshot_count = b.screenshots.length;
        delete out.screenshots;
        delete out.events;
        return out;
    }

    function event(b, kind, actor, extra) {
        b.events.push(Object.assign({ kind: kind, actor: actor, created_at: now() }, extra || {}));
        b.updated_at = now();
    }

    function adapter(opts) {
        var user = (opts && opts.user) || { id: 'me', name: 'You' };
        return {
            page: async function (q) {
                var items = read().items.filter(function (b) {
                    return b.status !== 'closed' && (q.scope != null ? String(b.scope_id) === String(q.scope) : b.page_path === q.path);
                });
                return { items: items.map(summary), me: user.id };
            },
            get: async function (id) { return copy(find(read(), id)); },
            create: async function (r) {
                var db = read();
                var id = ++db.seq;
                db.items.push(Object.assign({}, r, {
                    id: id, key: key(id), title: title(r.description), status: 'new', resolution: null,
                    reporter_id: user.id, reporter_name: user.name, created_at: now(), updated_at: now(),
                    screenshots: [], events: [{ kind: 'status', from: null, to: 'new', actor: user.name, created_at: now() }]
                }));
                write(db);
                return { id: id, key: key(id) };
            },
            addScreenshot: async function (id, image) {
                var db = read();
                find(db, id).screenshots.push({ url: image });
                write(db);
                return { ok: true };
            },
            comment: async function (id, body) {
                var db = read();
                event(find(db, id), 'comment', user.name, { body: body });
                write(db);
                return { ok: true };
            },
            verify: async function (id, fixed, note) {
                var db = read();
                var b = find(db, id);
                if (b.status !== 'resolved') throw new Error('Only a resolved report can be verified');
                var to = fixed ? 'closed' : 'triaged';
                event(b, 'status', user.name, { from: b.status, to: to, body: note || '' });
                b.status = to;
                if (!fixed) b.resolution = null;
                write(db);
                return { ok: true };
            },
            withdraw: async function (id) {
                var db = read();
                var b = find(db, id);
                if (b.status !== 'new') throw new Error('Only a new report can be withdrawn');
                db.items = db.items.filter(function (x) { return x !== b; });
                write(db);
                return { ok: true };
            },
            markdown: async function (id) { return toMarkdown(find(read(), id)); }
        };
    }

    function toMarkdown(b) {
        var p = b.position || {};
        var lines = [
            '# Report ' + b.key + ' · ' + b.title, '',
            '- Priority: ' + b.priority + ' · Type: ' + b.issue_type + ' · Status: ' + b.status,
            '- Page: ' + b.page_url,
            b.scope_id != null ? '- Scope: ' + b.scope_id + (b.affects_version ? ' v' + b.affects_version : '') : '',
            b.selector ? '- Selector: `' + b.selector + '`' : '',
            b.selected_text ? '- Selected text: "' + b.selected_text + '"' : '',
            b.element_text ? '- Element text: ' + b.element_text : '',
            p.viewportWidth ? '- Viewport: ' + p.viewportWidth + '×' + p.viewportHeight + ', scrollY ' + p.scrollY : '',
            '- Browser: ' + b.user_agent, '',
            '## Description', '', b.description, ''
        ];
        return lines.filter(function (l, i) { return l !== '' || lines[i - 1] !== ''; }).join('\n');
    }

    /** Developer / AI side of the demo: change status, attach an analysis. */
    function act(id, patch) {
        var db = read();
        var b = find(db, id);
        if (patch.status && patch.status !== b.status) {
            event(b, 'status', patch.actor || 'AI agent', { from: b.status, to: patch.status, body: patch.note || '' });
        }
        ['status', 'resolution', 'priority', 'ai_analysis', 'ai_solution', 'fix_version'].forEach(function (k) {
            if (patch[k] !== undefined) b[k] = patch[k];
        });
        if (patch.fix_version) b.fix_deployed = true;
        write(db);
        return copy(b);
    }

    window.EyeForAILocal = {
        adapter: adapter,
        act: act,
        all: function () { return read().items.map(summary); },
        clear: function () { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
    };
})();

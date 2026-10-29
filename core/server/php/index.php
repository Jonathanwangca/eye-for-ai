<?php
declare(strict_types=1);
/**
 * Eye for AI Core — reference backend (PHP 8.0+, PDO SQLite, no dependencies).
 * Implements core/BACKEND-CONTRACT.md. Drop this folder on any PHP host:
 *
 *   EyeForAI.init({ endpoint: '/eye-for-ai/server/php/index.php' })
 *
 * Widget routes act as the current reporter (see config.php → current_user).
 * AI routes need `Authorization: Bearer <ai_token>`.
 *
 *   GET    /page?path=&scope=        reports on a page / scope           widget
 *   POST   /                         new report                          widget
 *   GET    /{id}                     one report (+ screenshots, events)  widget · AI
 *   GET    /{id}/markdown            the report as Markdown              widget · AI
 *   POST   /{id}/screenshots         { image: data-URL }                 widget
 *   GET    /{id}/screenshots/{n}     the image                           widget · AI
 *   POST   /{id}/comments            { body }                            widget · AI
 *   POST   /{id}/verify              { fixed, note } — reporter only     widget
 *   DELETE /{id}                     withdraw — reporter, status new     widget
 *   GET    /?status=&scope=&limit=   queue                               AI
 *   PATCH  /{id}                     { status, resolution, priority, ai_analysis, ai_solution, fix_version, note }  AI
 *
 * Every response is the envelope { success, data, error: { code, message } }.
 */

const EFA_SERVER_VERSION = '2.0.0';
const EFA_PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const EFA_TYPES = ['bug', 'improvement', 'question'];
const EFA_CAPTURES = ['element', 'text', 'screenshot'];
const EFA_RESOLUTIONS = ['fixed', 'wont_fix', 'duplicate', 'cannot_reproduce', 'works_as_designed'];
/** Jira's default bug workflow; Resolved → Closed only through the reporter's verify (or auto-close). */
const EFA_TRANSITIONS = [
    'new'         => ['triaged', 'in_progress', 'resolved'],
    'triaged'     => ['in_progress', 'resolved'],
    'in_progress' => ['triaged', 'resolved'],
    'resolved'    => ['triaged'],
    'closed'      => ['triaged'],
];
const EFA_IMAGE_TYPES = ['image/png' => 'png', 'image/webp' => 'webp', 'image/jpeg' => 'jpg'];

final class EfaError extends Exception
{
    public function __construct(public readonly int $status, public readonly string $codeName, string $message)
    {
        parent::__construct($message);
    }
}

function efa_config(): array
{
    static $config = null;
    if ($config === null) {
        $defaults = [
            'db_path'             => __DIR__ . '/data/eye-for-ai.sqlite',
            'storage_dir'         => __DIR__ . '/data/screenshots',
            'ai_token'            => '',
            'current_user'        => null,
            'current_version'     => null,
            'allow_anonymous'     => true,
            'max_screenshots'     => 6,
            'max_image_bytes'     => 8 * 1024 * 1024,
            'reports_per_10min'   => 20,
            'auto_close_days'     => 14,
        ];
        $file = __DIR__ . '/config.php';
        $config = array_merge($defaults, is_file($file) ? (array)require $file : []);
    }
    return $config;
}

function efa_db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $path = efa_config()['db_path'];
    if (!is_dir(dirname($path))) mkdir(dirname($path), 0750, true);
    $pdo = new PDO('sqlite:' . $path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec(<<<SQL
        CREATE TABLE IF NOT EXISTS efa_report (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL, description TEXT NOT NULL,
            priority TEXT NOT NULL, issue_type TEXT NOT NULL, capture_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new', resolution TEXT,
            page_url TEXT, page_path TEXT, page_title TEXT,
            selector TEXT, element_text TEXT, selected_text TEXT, text_context TEXT,
            position TEXT, user_agent TEXT, request_id TEXT,
            scope_id TEXT, scope_label TEXT, affects_version TEXT, fix_version TEXT,
            ai_analysis TEXT, ai_solution TEXT,
            reporter_id TEXT NOT NULL, reporter_name TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL, resolved_at TEXT
        );
        CREATE INDEX IF NOT EXISTS efa_report_page ON efa_report (page_path, status);
        CREATE INDEX IF NOT EXISTS efa_report_scope ON efa_report (scope_id, status);
        CREATE TABLE IF NOT EXISTS efa_screenshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL REFERENCES efa_report(id) ON DELETE CASCADE,
            file TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS efa_event (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL REFERENCES efa_report(id) ON DELETE CASCADE,
            kind TEXT NOT NULL, from_status TEXT, to_status TEXT, body TEXT,
            actor TEXT, actor_type TEXT NOT NULL, created_at TEXT NOT NULL
        );
    SQL);
    return $pdo;
}

/** ISO-8601 UTC — sorts as text, and browsers read it in their own timezone. */
function efa_now(int $offset = 0): string { return gmdate('Y-m-d\TH:i:s\Z', time() + $offset); }

function efa_send(int $status, array $envelope): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($envelope, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function efa_ok(mixed $data, int $status = 200): never
{
    efa_send($status, ['success' => true, 'data' => $data, 'error' => null]);
}

// ── identity ─────────────────────────────────────────────────────────────

/** @return array{type: 'ai'|'user', id: string, name: string} */
function efa_actor(): array
{
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (str_starts_with($auth, 'Bearer ')) {
        $token = efa_config()['ai_token'];
        if ($token === '' || !hash_equals($token, substr($auth, 7))) {
            throw new EfaError(401, 'AUTH_INVALID', 'Unknown API token');
        }
        return ['type' => 'ai', 'id' => 'ai', 'name' => 'AI agent'];
    }
    $hook = efa_config()['current_user'];
    if (is_callable($hook)) {
        $u = $hook();
        if (is_array($u) && isset($u['id'])) {
            return ['type' => 'user', 'id' => (string)$u['id'], 'name' => (string)($u['name'] ?? $u['id'])];
        }
    }
    if (!efa_config()['allow_anonymous']) throw new EfaError(401, 'AUTH_REQUIRED', 'Sign in to report problems');
    // Anonymous reporter: a random id in a long-lived, HttpOnly cookie.
    $uid = $_COOKIE['efa_uid'] ?? '';
    if (!preg_match('/^[a-f0-9]{32}$/', $uid)) {
        $uid = bin2hex(random_bytes(16));
        setcookie('efa_uid', $uid, ['expires' => time() + 86400 * 365, 'path' => '/', 'httponly' => true,
            'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
    }
    return ['type' => 'user', 'id' => 'anon:' . $uid, 'name' => 'Guest ' . substr($uid, 0, 4)];
}

function efa_require_ai(array $actor): void
{
    if ($actor['type'] !== 'ai') throw new EfaError(403, 'AUTH_FORBIDDEN', 'This endpoint needs the AI token');
}

// ── input ────────────────────────────────────────────────────────────────

function efa_body(): array
{
    // JSON only: a cross-site form cannot send it without a CORS preflight, which is the CSRF guard.
    $type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (!str_starts_with(strtolower($type), 'application/json')) {
        throw new EfaError(415, 'VALIDATION_ERROR', 'Send application/json');
    }
    $raw = file_get_contents('php://input', false, null, 0, 16 * 1024 * 1024);
    $data = json_decode((string)$raw, true);
    if (!is_array($data)) throw new EfaError(422, 'VALIDATION_ERROR', 'Body is not a JSON object');
    return $data;
}

function efa_str(array $in, string $key, int $max, bool $required = false): ?string
{
    $v = $in[$key] ?? null;
    if ($v === null || $v === '') {
        if ($required) throw new EfaError(422, 'VALIDATION_ERROR', "{$key} is required");
        return null;
    }
    if (!is_scalar($v)) throw new EfaError(422, 'VALIDATION_ERROR', "{$key} must be text");
    $v = trim((string)$v);
    return mb_substr($v, 0, $max);
}

function efa_enum(array $in, string $key, array $allowed, ?string $default = null): ?string
{
    $v = $in[$key] ?? $default;
    if ($v === null) return null;
    if (!in_array($v, $allowed, true)) {
        throw new EfaError(422, 'VALIDATION_ERROR', "{$key} must be one of " . implode(', ', $allowed));
    }
    return $v;
}

// ── reports ──────────────────────────────────────────────────────────────

function efa_find(int $id): array
{
    $row = efa_db()->prepare('SELECT * FROM efa_report WHERE id = :id');
    $row->execute([':id' => $id]);
    $r = $row->fetch();
    if (!$r) throw new EfaError(404, 'REPORT_NOT_FOUND', 'Report not found');
    return $r;
}

function efa_key(int $id): string { return '#' . str_pad((string)$id, 3, '0', STR_PAD_LEFT); }

/**
 * The id the widget sees. Never the raw one: an anonymous reporter's id IS their cookie,
 * so publishing it would let anyone verify or withdraw in their name.
 */
function efa_public_id(string $id): string { return substr(hash('sha256', 'efa|' . $id), 0, 16); }

function efa_present(array $r, bool $full, array $actor): array
{
    $id = (int)$r['id'];
    $out = $r;
    $out['id'] = $id;
    $out['reporter_id'] = efa_public_id($r['reporter_id']);
    // Anonymous visitors see each other's reports, not each other's browser fingerprint.
    $trusted = $actor['type'] === 'ai' || $r['reporter_id'] === $actor['id'] || !str_starts_with($actor['id'], 'anon:');
    if (!$trusted) { $out['user_agent'] = null; $out['request_id'] = null; }
    $out['key'] = efa_key($id);
    $out['position'] = $r['position'] ? json_decode($r['position'], true) : null;
    $out['current_version'] = efa_current_version($r['scope_id']);
    $out['fix_deployed'] = $r['fix_version'] && $out['current_version']
        ? version_compare($out['current_version'], $r['fix_version'], '>=') : null;
    $shots = efa_db()->prepare('SELECT id FROM efa_screenshot WHERE report_id = :id ORDER BY id');
    $shots->execute([':id' => $id]);
    $ids = array_column($shots->fetchAll(), 'id');
    $out['screenshot_count'] = count($ids);
    if ($full) {
        $base = efa_self_url();
        $out['screenshots'] = array_map(fn ($n, $i) => ['url' => "{$base}/{$id}/screenshots/" . ($i + 1)], $ids, array_keys($ids));
        $ev = efa_db()->prepare('SELECT kind, from_status AS "from", to_status AS "to", body, actor, actor_type, created_at
            FROM efa_event WHERE report_id = :id ORDER BY id');
        $ev->execute([':id' => $id]);
        $out['events'] = $ev->fetchAll();
    }
    return $out;
}

function efa_current_version(?string $scope): ?string
{
    $hook = efa_config()['current_version'];
    return is_callable($hook) ? ($hook($scope) ?: null) : null;
}

/** This script's URL path — screenshot links point back through it (the files themselves are not public). */
function efa_self_url(): string { return (string)($_SERVER['SCRIPT_NAME'] ?? ''); }

function efa_event(int $id, string $kind, array $actor, ?string $from = null, ?string $to = null, ?string $body = null): void
{
    efa_db()->prepare('INSERT INTO efa_event (report_id, kind, from_status, to_status, body, actor, actor_type, created_at)
        VALUES (:r, :k, :f, :t, :b, :a, :at, :c)')->execute([
        ':r' => $id, ':k' => $kind, ':f' => $from, ':t' => $to, ':b' => $body,
        ':a' => $actor['name'], ':at' => $actor['type'], ':c' => efa_now(),
    ]);
    efa_db()->prepare('UPDATE efa_report SET updated_at = :n WHERE id = :id')->execute([':n' => efa_now(), ':id' => $id]);
}

/** Resolved and not verified for N days → Closed, so the queue does not fill with limbo tickets. */
function efa_auto_close(): void
{
    $days = (int)efa_config()['auto_close_days'];
    if ($days <= 0) return;
    $cut = efa_now(-$days * 86400);
    $stale = efa_db()->prepare("SELECT id FROM efa_report WHERE status = 'resolved' AND resolved_at < :cut");
    $stale->execute([':cut' => $cut]);
    foreach (array_column($stale->fetchAll(), 'id') as $id) {
        efa_db()->prepare("UPDATE efa_report SET status = 'closed' WHERE id = :id")->execute([':id' => $id]);
        efa_event((int)$id, 'status', ['name' => 'system', 'type' => 'system'], 'resolved', 'closed', "Not verified within {$days} days");
    }
}

function efa_page(array $actor): never
{
    $scope = efa_str($_GET, 'scope', 64);
    $path = efa_str($_GET, 'path', 500);
    $sql = "SELECT * FROM efa_report WHERE status != 'closed' AND " . ($scope !== null ? 'scope_id = :v' : 'page_path = :v') .
        " ORDER BY CASE priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END, id DESC LIMIT 200";
    $st = efa_db()->prepare($sql);
    $st->execute([':v' => $scope ?? $path ?? '/']);
    efa_ok(['items' => array_map(fn ($r) => efa_present($r, false, $actor), $st->fetchAll()), 'me' => efa_public_id($actor['id'])]);
}

function efa_queue(array $actor): never
{
    efa_require_ai($actor);
    $statuses = array_values(array_intersect(explode(',', (string)($_GET['status'] ?? 'new,triaged,in_progress')), array_keys(EFA_TRANSITIONS)));
    if (!$statuses) $statuses = ['new'];
    $limit = max(1, min(200, (int)($_GET['limit'] ?? 50)));
    $params = [];
    $in = [];
    foreach ($statuses as $i => $s) { $in[] = ":s{$i}"; $params[":s{$i}"] = $s; }
    $sql = 'SELECT * FROM efa_report WHERE status IN (' . implode(',', $in) . ')';
    if (($scope = efa_str($_GET, 'scope', 64)) !== null) { $sql .= ' AND scope_id = :scope'; $params[':scope'] = $scope; }
    $sql .= " ORDER BY CASE priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END, id LIMIT {$limit}";
    $st = efa_db()->prepare($sql);
    $st->execute($params);
    efa_ok(['items' => array_map(fn ($r) => efa_present($r, true, $actor), $st->fetchAll())]);
}

function efa_create(array $actor): never
{
    if ($actor['type'] === 'ai') throw new EfaError(403, 'AUTH_FORBIDDEN', 'Reports come from people, not the AI token');
    $limit = (int)efa_config()['reports_per_10min'];
    if ($limit > 0) {
        $n = efa_db()->prepare('SELECT COUNT(*) FROM efa_report WHERE reporter_id = :u AND created_at > :t');
        $n->execute([':u' => $actor['id'], ':t' => efa_now(-600)]);
        if ((int)$n->fetchColumn() >= $limit) throw new EfaError(429, 'RATE_LIMITED', 'Too many reports — try again in a few minutes');
    }
    $in = efa_body();
    $desc = efa_str($in, 'description', 10000, true);
    $title = mb_substr(trim(strtok($desc, "\n") ?: $desc), 0, 120);
    $position = is_array($in['position'] ?? null) ? json_encode($in['position']) : null;
    $now = efa_now();
    efa_db()->prepare('INSERT INTO efa_report (title, description, priority, issue_type, capture_type, page_url, page_path,
        page_title, selector, element_text, selected_text, text_context, position, user_agent, request_id, scope_id,
        scope_label, affects_version, reporter_id, reporter_name, created_at, updated_at)
        VALUES (:title, :desc, :prio, :type, :cap, :url, :path, :ptitle, :sel, :etext, :stext, :tctx, :pos, :ua, :req,
        :scope, :slabel, :ver, :rid, :rname, :now, :now)')->execute([
        ':title' => $title, ':desc' => $desc,
        ':prio' => efa_enum($in, 'priority', EFA_PRIORITIES, 'P3'),
        ':type' => efa_enum($in, 'issue_type', EFA_TYPES, 'bug'),
        ':cap' => efa_enum($in, 'capture_type', EFA_CAPTURES, 'element'),
        ':url' => efa_str($in, 'page_url', 2000), ':path' => efa_str($in, 'page_path', 500),
        ':ptitle' => efa_str($in, 'page_title', 255), ':sel' => efa_str($in, 'selector', 2000),
        ':etext' => efa_str($in, 'element_text', 500), ':stext' => efa_str($in, 'selected_text', 2000),
        ':tctx' => efa_str($in, 'text_context', 2000), ':pos' => $position,
        ':ua' => efa_str($in, 'user_agent', 500), ':req' => efa_str($in, 'request_id', 100),
        ':scope' => efa_str($in, 'scope_id', 64), ':slabel' => efa_str($in, 'scope_label', 120),
        ':ver' => efa_str($in, 'affects_version', 40),
        ':rid' => $actor['id'], ':rname' => $actor['name'], ':now' => $now,
    ]);
    $id = (int)efa_db()->lastInsertId();
    efa_event($id, 'status', $actor, null, 'new');
    efa_ok(['id' => $id, 'key' => efa_key($id)], 201);
}

function efa_add_screenshot(int $id, array $actor): never
{
    $r = efa_find($id);
    if ($r['status'] === 'closed') throw new EfaError(409, 'REPORT_CLOSED', 'The report is closed');
    $count = efa_db()->prepare('SELECT COUNT(*) FROM efa_screenshot WHERE report_id = :id');
    $count->execute([':id' => $id]);
    if ((int)$count->fetchColumn() >= (int)efa_config()['max_screenshots']) {
        throw new EfaError(409, 'TOO_MANY_SCREENSHOTS', 'At most ' . efa_config()['max_screenshots'] . ' screenshots');
    }
    $in = efa_body();
    if (!preg_match('#^data:(image/(?:png|webp|jpeg));base64,([A-Za-z0-9+/=]+)$#', (string)($in['image'] ?? ''), $m)) {
        throw new EfaError(422, 'VALIDATION_ERROR', 'image must be a PNG, WebP or JPEG data URL');
    }
    $bytes = base64_decode($m[2], true);
    if ($bytes === false || strlen($bytes) > (int)efa_config()['max_image_bytes']) {
        throw new EfaError(422, 'VALIDATION_ERROR', 'Image is unreadable or too large');
    }
    // The bytes must really be that image type — the data-URL prefix is the client's claim.
    $info = @getimagesizefromstring($bytes);
    if (!$info || ($info['mime'] ?? '') !== $m[1]) throw new EfaError(422, 'VALIDATION_ERROR', 'Not a valid image');
    $dir = efa_config()['storage_dir'];
    if (!is_dir($dir)) mkdir($dir, 0750, true);
    $file = bin2hex(random_bytes(16)) . '.' . EFA_IMAGE_TYPES[$m[1]];
    file_put_contents($dir . '/' . $file, $bytes);
    efa_db()->prepare('INSERT INTO efa_screenshot (report_id, file, mime, bytes, created_at) VALUES (:r, :f, :m, :b, :c)')
        ->execute([':r' => $id, ':f' => $file, ':m' => $m[1], ':b' => strlen($bytes), ':c' => efa_now()]);
    efa_ok(['ok' => true], 201);
}

function efa_screenshot(int $id, int $n): never
{
    efa_find($id);
    $st = efa_db()->prepare('SELECT file, mime FROM efa_screenshot WHERE report_id = :id ORDER BY id LIMIT 1 OFFSET :o');
    $st->bindValue(':id', $id, PDO::PARAM_INT);
    $st->bindValue(':o', max(0, $n - 1), PDO::PARAM_INT);
    $st->execute();
    $s = $st->fetch();
    $path = $s ? efa_config()['storage_dir'] . '/' . basename($s['file']) : '';
    if (!$s || !is_file($path)) throw new EfaError(404, 'SCREENSHOT_NOT_FOUND', 'Screenshot not found');
    header('Content-Type: ' . $s['mime']);
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: private, max-age=86400');
    header('X-Content-Type-Options: nosniff');
    readfile($path);
    exit;
}

function efa_comment(int $id, array $actor): never
{
    $r = efa_find($id);
    if ($r['status'] === 'closed') throw new EfaError(409, 'REPORT_CLOSED', 'The report is closed');
    efa_event($id, 'comment', $actor, null, null, efa_str(efa_body(), 'body', 5000, true));
    efa_ok(['ok' => true], 201);
}

function efa_verify(int $id, array $actor): never
{
    $r = efa_find($id);
    if ($actor['type'] !== 'user' || $r['reporter_id'] !== $actor['id']) {
        throw new EfaError(403, 'AUTH_FORBIDDEN', 'Only the reporter can verify the fix');
    }
    if ($r['status'] !== 'resolved') throw new EfaError(409, 'INVALID_TRANSITION', 'Only a resolved report can be verified');
    $in = efa_body();
    $fixed = ($in['fixed'] ?? null) === true;
    $note = efa_str($in, 'note', 5000);
    if (!$fixed && $note === null) throw new EfaError(422, 'VALIDATION_ERROR', 'Say what is still wrong');
    $to = $fixed ? 'closed' : 'triaged';
    efa_db()->prepare('UPDATE efa_report SET status = :s, resolution = CASE WHEN :s = \'triaged\' THEN NULL ELSE resolution END WHERE id = :id')
        ->execute([':s' => $to, ':id' => $id]);
    efa_event($id, 'status', $actor, 'resolved', $to, $note);
    efa_ok(['ok' => true, 'status' => $to]);
}

function efa_withdraw(int $id, array $actor): never
{
    $r = efa_find($id);
    if ($actor['type'] !== 'user' || $r['reporter_id'] !== $actor['id']) {
        throw new EfaError(403, 'AUTH_FORBIDDEN', 'Only the reporter can withdraw a report');
    }
    if ($r['status'] !== 'new') throw new EfaError(409, 'INVALID_TRANSITION', 'Only a new report can be withdrawn');
    $files = efa_db()->prepare('SELECT file FROM efa_screenshot WHERE report_id = :id');
    $files->execute([':id' => $id]);
    foreach (array_column($files->fetchAll(), 'file') as $f) @unlink(efa_config()['storage_dir'] . '/' . basename($f));
    efa_db()->prepare('DELETE FROM efa_report WHERE id = :id')->execute([':id' => $id]);
    efa_ok(['ok' => true]);
}

function efa_update(int $id, array $actor): never
{
    efa_require_ai($actor);
    $r = efa_find($id);
    $in = efa_body();
    $set = [];
    $params = [':id' => $id];
    $to = efa_enum($in, 'status', array_keys(EFA_TRANSITIONS));
    $resolution = efa_enum($in, 'resolution', EFA_RESOLUTIONS);
    if ($to !== null && $to !== $r['status']) {
        if (!in_array($to, EFA_TRANSITIONS[$r['status']], true)) {
            throw new EfaError(409, 'INVALID_TRANSITION', "{$r['status']} → {$to} is not allowed");
        }
        if ($to === 'resolved' && $resolution === null) throw new EfaError(422, 'VALIDATION_ERROR', 'Resolved needs a resolution');
        $set[] = 'status = :status';
        $params[':status'] = $to;
        $set[] = 'resolved_at = :ra';
        $params[':ra'] = $to === 'resolved' ? efa_now() : null;
        if ($to !== 'resolved') { $set[] = 'resolution = NULL'; $resolution = null; }
    }
    if ($resolution !== null) { $set[] = 'resolution = :res'; $params[':res'] = $resolution; }
    foreach (['priority' => [EFA_PRIORITIES, null], 'ai_analysis' => [null, 20000], 'ai_solution' => [null, 20000], 'fix_version' => [null, 40]] as $k => [$enum, $max]) {
        if (!array_key_exists($k, $in)) continue;
        $set[] = "{$k} = :{$k}";
        $params[":{$k}"] = $enum ? efa_enum($in, $k, $enum) : efa_str($in, $k, $max);
    }
    if ($set) efa_db()->prepare('UPDATE efa_report SET ' . implode(', ', $set) . ' WHERE id = :id')->execute($params);
    $note = efa_str($in, 'note', 5000);
    if ($to !== null && $to !== $r['status']) efa_event($id, 'status', $actor, $r['status'], $to, $note);
    elseif ($note !== null) efa_event($id, 'comment', $actor, null, null, $note);
    efa_ok(efa_present(efa_find($id), true, $actor));
}

function efa_markdown(int $id, array $actor): string
{
    $b = efa_present(efa_find($id), true, $actor);
    $p = $b['position'] ?? [];
    $lines = [
        "# Report {$b['key']} · {$b['title']}", '',
        "- Priority: {$b['priority']} · Type: {$b['issue_type']} · Status: {$b['status']}" . ($b['resolution'] ? " ({$b['resolution']})" : ''),
    ];
    if ($b['page_url'] || $b['page_path']) $lines[] = '- Page: ' . ($b['page_url'] ?: $b['page_path']);
    if ($b['scope_id'] !== null) $lines[] = "- Scope: {$b['scope_id']}" . ($b['scope_label'] ? " {$b['scope_label']}" : '') .
        ($b['affects_version'] ? " · affects v{$b['affects_version']}" : '') . ($b['fix_version'] ? " · fix v{$b['fix_version']}" : '');
    if ($b['selector']) $lines[] = "- Selector: `{$b['selector']}`";
    if ($b['selected_text']) $lines[] = "- Selected text: \"{$b['selected_text']}\"" . ($b['text_context'] ? " — context: {$b['text_context']}" : '');
    if ($b['element_text']) $lines[] = "- Element text: {$b['element_text']}";
    if ($p) $lines[] = "- Viewport: {$p['viewportWidth']}×{$p['viewportHeight']}, scroll {$p['scrollX']},{$p['scrollY']}";
    if ($b['user_agent']) $lines[] = "- Browser: {$b['user_agent']}";
    if ($b['request_id']) $lines[] = "- Request id: {$b['request_id']}";
    foreach ($b['screenshots'] as $i => $s) $lines[] = '- Screenshot ' . ($i + 1) . ": {$s['url']}";
    array_push($lines, '', '## Description', '', $b['description']);
    $comments = array_filter($b['events'], fn ($e) => $e['body']);
    if ($comments) {
        array_push($lines, '', '## History', '');
        foreach ($comments as $e) $lines[] = "- {$e['created_at']} {$e['actor']}: {$e['body']}";
    }
    return implode("\n", $lines) . "\n";
}

// ── router ───────────────────────────────────────────────────────────────

function efa_route(): never
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = '/' . trim((string)($_SERVER['PATH_INFO'] ?? ''), '/');
    $actor = efa_actor();
    efa_auto_close();

    if ($path === '/') {
        if ($method === 'GET') efa_queue($actor);
        if ($method === 'POST') efa_create($actor);
    } elseif ($path === '/page' && $method === 'GET') {
        efa_page($actor);
    } elseif ($path === '/version' && $method === 'GET') {
        efa_ok(['server' => EFA_SERVER_VERSION]);
    } elseif (preg_match('#^/(\d+)(?:/([a-z]+)(?:/(\d+))?)?$#', $path, $m)) {
        $id = (int)$m[1];
        $sub = $m[2] ?? '';
        if ($sub === '' && $method === 'GET') efa_ok(efa_present(efa_find($id), true, $actor));
        if ($sub === '' && $method === 'PATCH') efa_update($id, $actor);
        if ($sub === '' && $method === 'DELETE') efa_withdraw($id, $actor);
        if ($sub === 'markdown' && $method === 'GET') {
            $md = efa_markdown($id, $actor);
            if (isset($_GET['envelope'])) efa_ok(['markdown' => $md]);
            header('Content-Type: text/markdown; charset=utf-8');
            echo $md;
            exit;
        }
        if ($sub === 'screenshots' && $method === 'POST' && !isset($m[3])) efa_add_screenshot($id, $actor);
        if ($sub === 'screenshots' && $method === 'GET' && isset($m[3])) efa_screenshot($id, (int)$m[3]);
        if ($sub === 'comments' && $method === 'POST') efa_comment($id, $actor);
        if ($sub === 'verify' && $method === 'POST') efa_verify($id, $actor);
    }
    throw new EfaError(404, 'ROUTE_NOT_FOUND', "No route for {$method} {$path}");
}

try {
    efa_route();
} catch (EfaError $e) {
    efa_send($e->status, ['success' => false, 'data' => null, 'error' => ['code' => $e->codeName, 'message' => $e->getMessage()]]);
} catch (Throwable $e) {
    error_log('[eye-for-ai] ' . $e);
    efa_send(500, ['success' => false, 'data' => null, 'error' => ['code' => 'SERVER_ERROR', 'message' => 'Server error']]);
}

<?php
/**
 * Eye for AI - Database-backed API
 * Version: 3.0
 *
 * Storage: MySQL database (efa_session, efa_annotation, efa_config tables)
 * Session identification: client-generated token via cookie or header
 */

// ========================================
// DATABASE CONNECTION
// ========================================

// Load bootstrap from main app if available, otherwise use fallback
$bootstrapFile = __DIR__ . '/../../../../bootstrap.php';
if (file_exists($bootstrapFile)) {
    require_once $bootstrapFile;
} else {
    // Fallback: define constants directly
    if (!defined('DB_HOST'))     define('DB_HOST',     '127.0.0.1');
    if (!defined('DB_PORT'))     define('DB_PORT',     3306);
    if (!defined('DB_NAME'))     define('DB_NAME',     'aieos');
    if (!defined('DB_USER'))     define('DB_USER',     'root');
    if (!defined('DB_PASSWORD')) define('DB_PASSWORD',  '');
}

// Screenshot storage (still filesystem-based for binary data)
$EFA_DATA_PATH = __DIR__ . '/../data';
$EFA_SCREENSHOT_URL_BASE = (function() {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $base = preg_replace('#/api/feedback\.php.*$#', '', parse_url($uri, PHP_URL_PATH));
    return $base . '/data';
})();

define('EFA_DATA_PATH', rtrim($EFA_DATA_PATH, '/'));
define('EFA_SCREENSHOT_URL', rtrim($EFA_SCREENSHOT_URL_BASE, '/'));

// ========================================
// HEADERS
// ========================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-EFA-API-Key, X-EFA-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ========================================
// DB CONNECTION
// ========================================

function efa_getDb() {
    static $db = null;
    if ($db === null) {
        $db = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT);
        if ($db->connect_error) {
            error_log('[EFA] DB connection failed: ' . $db->connect_error);
            efa_jsonResponse(false, 'Database connection failed');
        }
        $db->set_charset('utf8mb4');
    }
    return $db;
}

// ========================================
// SESSION TOKEN
// ========================================

function efa_getSessionToken() {
    // Priority: header > cookie > generate new
    $token = $_SERVER['HTTP_X_EFA_TOKEN'] ?? '';
    if (empty($token)) {
        $token = $_COOKIE['efa_token'] ?? '';
    }
    if (empty($token)) {
        $token = bin2hex(random_bytes(16));
    }

    // Set cookie for 30 days
    setcookie('efa_token', $token, time() + 30 * 86400, '/', '', false, false);

    // usr_login from header (set by JS) or GET param
    $usrLogin = $_SERVER['HTTP_X_EFA_USER'] ?? $_GET['usr_login'] ?? '';
    $usrLogin = substr(trim($usrLogin), 0, 100);

    // Upsert session record
    $db = efa_getDb();
    if (!empty($usrLogin)) {
        $stmt = $db->prepare("INSERT INTO efa_session (session_token, usr_login, user_agent, ip_address) VALUES (?, ?, ?, ?)
                              ON DUPLICATE KEY UPDATE last_active = NOW(), usr_login = COALESCE(VALUES(usr_login), usr_login), user_agent = VALUES(user_agent)");
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 512);
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $stmt->bind_param('ssss', $token, $usrLogin, $ua, $ip);
    } else {
        $stmt = $db->prepare("INSERT INTO efa_session (session_token, user_agent, ip_address) VALUES (?, ?, ?)
                              ON DUPLICATE KEY UPDATE last_active = NOW(), user_agent = VALUES(user_agent)");
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 512);
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $stmt->bind_param('sss', $token, $ua, $ip);
    }
    $stmt->execute();
    $stmt->close();

    return $token;
}

/**
 * Get current usr_login: from header > GET param > session record
 */
function efa_getUsrLogin($token = null) {
    $usrLogin = $_SERVER['HTTP_X_EFA_USER'] ?? $_GET['usr_login'] ?? '';
    if (!empty($usrLogin)) return substr(trim($usrLogin), 0, 100);

    // Fallback: look up from session record
    if ($token) {
        $db = efa_getDb();
        $stmt = $db->prepare("SELECT usr_login FROM efa_session WHERE session_token = ?");
        $stmt->bind_param('s', $token);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($row && !empty($row['usr_login'])) return $row['usr_login'];
    }
    return '';
}

// ========================================
// ROUTING
// ========================================

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'init_session':
        efa_handleInitSession();
        break;
    case 'save':
        efa_handleSave();
        break;
    case 'save_one':
        efa_handleSaveOne();
        break;
    case 'load':
        efa_handleLoad();
        break;
    case 'delete':
        efa_handleDelete();
        break;
    case 'upload_screenshot':
        efa_handleUploadScreenshot();
        break;
    case 'get_config':
        efa_handleGetConfig();
        break;
    case 'save_config':
        efa_handleSaveConfig();
        break;
    case 'export_md':
        efa_handleExportMd();
        break;
    case 'dev_load_all':
        efa_handleDevLoadAll();
        break;
    case 'dev_update':
        efa_handleDevUpdate();
        break;
    case 'dev_delete':
        efa_handleDevDelete();
        break;
    case 'dev_auth':
        efa_handleDevAuth();
        break;
    case 'check':
        efa_jsonResponse(true, 'EFA API is working', [
            'version' => '3.0-db',
            'storage' => 'database'
        ]);
        break;
    case 'ai_pending':
        efa_handleAiPending();
        break;
    case 'ai_detail':
        efa_handleAiDetail();
        break;
    case 'ai_analyze':
        efa_handleAiAnalyze();
        break;
    case 'ai_batch':
        efa_handleAiBatch();
        break;
    case 'ai_resolve':
        efa_handleAiResolve();
        break;
    case 'ai_summary':
        efa_handleAiSummary();
        break;
    case 'ai_screenshot':
        efa_handleAiScreenshot();
        break;
    case 'ai_generate_key':
        efa_handleAiGenerateKey();
        break;
    default:
        efa_jsonResponse(false, 'Invalid action');
}

// ========================================
// HANDLERS
// ========================================

function efa_handleInitSession() {
    $token = efa_getSessionToken();
    efa_jsonResponse(true, 'Session initialized', [
        'success' => true,
        'token' => $token,
        'nonce' => ''
    ]);
}

function efa_handleSaveOne() {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) { efa_jsonResponse(false, 'Invalid input'); return; }

    $pageUrl = $input['page_url'] ?? '';
    $annotationKey = $input['id'] ?? '';
    if (empty($pageUrl) || empty($annotationKey)) {
        efa_jsonResponse(false, 'page_url and id are required');
        return;
    }

    $token = efa_getSessionToken();
    $usrLogin = efa_getUsrLogin($token);
    $db = efa_getDb();

    $stmt = $db->prepare("INSERT INTO efa_annotation
        (session_token, usr_login, annotation_key, page_url, page_title, type, comment, selector, element_text, selected_text, context, screenshot_path, element_position, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            usr_login = COALESCE(VALUES(usr_login), usr_login),
            page_title = VALUES(page_title),
            type = VALUES(type),
            comment = VALUES(comment),
            selector = VALUES(selector),
            element_text = VALUES(element_text),
            selected_text = VALUES(selected_text),
            context = VALUES(context),
            screenshot_path = VALUES(screenshot_path),
            element_position = VALUES(element_position),
            status = VALUES(status)");

    $pageTitle = $input['page_title'] ?? '';
    $type = $input['type'] ?? 'element';
    $comment = $input['comment'] ?? '';
    $selector = $input['selector'] ?? '';
    $elementText = $input['element_text'] ?? '';
    $selectedText = $input['selected_text'] ?? '';
    $context = $input['context'] ?? '';
    $screenshotPath = $input['screenshot_path'] ?? '';
    $elementPosition = !empty($input['element_position']) ? json_encode($input['element_position']) : null;
    $status = $input['status'] ?? 'pending';
    $usrLoginVal = !empty($usrLogin) ? $usrLogin : null;

    $stmt->bind_param('ssssssssssssss',
        $token, $usrLoginVal, $annotationKey, $pageUrl, $pageTitle, $type, $comment,
        $selector, $elementText, $selectedText, $context, $screenshotPath,
        $elementPosition, $status);
    $stmt->execute();

    $isNew = $stmt->affected_rows === 1;
    $stmt->close();

    efa_jsonResponse(true, 'Saved', [
        'success' => true,
        'id' => $annotationKey,
        'message' => $isNew ? 'Created' : 'Updated'
    ]);
}

function efa_handleSave() {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) { efa_jsonResponse(false, 'Invalid input'); return; }

    $pageUrl = $input['page_url'] ?? '';
    if (empty($pageUrl)) { efa_jsonResponse(false, 'Page URL required'); return; }

    $token = efa_getSessionToken();
    $usrLogin = efa_getUsrLogin($token);
    $usrLoginVal = !empty($usrLogin) ? $usrLogin : null;
    $db = efa_getDb();
    $annotations = $input['annotations'] ?? [];
    $pageTitle = $input['page_title'] ?? '';

    foreach ($annotations as $ann) {
        $annKey = $ann['id'] ?? '';
        if (empty($annKey)) continue;

        $type = $ann['type'] ?? 'element';
        $comment = $ann['comment'] ?? '';
        $selector = $ann['selector'] ?? '';
        $elementText = $ann['element_text'] ?? '';
        $selectedText = $ann['selected_text'] ?? '';
        $context = $ann['context'] ?? '';
        $screenshotPath = $ann['screenshot_path'] ?? '';
        $elementPosition = !empty($ann['element_position']) ? json_encode($ann['element_position']) : null;
        $status = $ann['status'] ?? 'pending';

        $stmt = $db->prepare("INSERT INTO efa_annotation
            (session_token, usr_login, annotation_key, page_url, page_title, type, comment, selector, element_text, selected_text, context, screenshot_path, element_position, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                usr_login = COALESCE(VALUES(usr_login), usr_login),
                comment = VALUES(comment), status = VALUES(status),
                selector = VALUES(selector), element_text = VALUES(element_text)");
        $stmt->bind_param('ssssssssssssss',
            $token, $usrLoginVal, $annKey, $pageUrl, $pageTitle, $type, $comment,
            $selector, $elementText, $selectedText, $context, $screenshotPath,
            $elementPosition, $status);
        $stmt->execute();
        $stmt->close();
    }

    efa_jsonResponse(true, 'Saved', ['page_url' => $pageUrl]);
}

function efa_handleLoad() {
    $pageUrl = $_GET['page_url'] ?? '';
    if (empty($pageUrl)) { efa_jsonResponse(false, 'Page URL required'); return; }

    $token = efa_getSessionToken();
    $usrLogin = efa_getUsrLogin($token);
    $db = efa_getDb();

    // Load ALL annotations for this page (not just current user's)
    $stmt = $db->prepare("SELECT annotation_key, session_token, usr_login, type, comment,
        selector, element_text, selected_text, context, screenshot_path, element_position,
        status, priority, developer_response, ai_analysis, ai_solution, ai_analyzed_at, resolved_at,
        created_at, updated_at
        FROM efa_annotation WHERE page_url = ?
        ORDER BY created_at ASC");
    $stmt->bind_param('s', $pageUrl);
    $stmt->execute();
    $result = $stmt->get_result();

    $annotations = [];
    while ($row = $result->fetch_assoc()) {
        // Determine ownership: match by usr_login first, fallback to session_token
        $isMine = false;
        if (!empty($usrLogin) && !empty($row['usr_login'])) {
            $isMine = ($row['usr_login'] === $usrLogin);
        } elseif ($row['session_token'] === $token) {
            $isMine = true;
        }

        $annotations[] = [
            'id' => $row['annotation_key'],
            'annotation_key' => $row['annotation_key'],
            'type' => $row['type'],
            'comment' => $row['comment'] ?? '',
            'selector' => $row['selector'] ?? '',
            'element_text' => $row['element_text'] ?? '',
            'selected_text' => $row['selected_text'] ?? '',
            'context' => $row['context'] ?? '',
            'screenshot_path' => $row['screenshot_path'] ?? '',
            'element_position' => $row['element_position'] ? json_decode($row['element_position'], true) : '',
            'status' => $row['status'],
            'priority' => $row['priority'] ?? null,
            'developer_response' => $row['developer_response'] ?? '',
            'ai_analysis' => $row['ai_analysis'] ?? null,
            'ai_solution' => $row['ai_solution'] ?? null,
            'ai_analyzed_at' => $row['ai_analyzed_at'] ?? null,
            'resolved_at' => $row['resolved_at'] ?? null,
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'timestamp' => $row['created_at'],
            'is_mine' => $isMine,
            'author' => $row['usr_login'] ?? ''
        ];
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'annotations' => $annotations,
        'page_url' => $pageUrl,
        'usr_login' => $usrLogin
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function efa_handleDelete() {
    $annotationId = $_GET['id'] ?? '';
    if (empty($annotationId)) {
        $input = json_decode(file_get_contents('php://input'), true);
        $annotationId = $input['annotation_id'] ?? $input['id'] ?? '';
    }
    if (empty($annotationId)) { efa_jsonResponse(false, 'Missing annotation ID'); return; }

    $token = efa_getSessionToken();
    $usrLogin = efa_getUsrLogin($token);
    $db = efa_getDb();

    // Verify ownership: find the annotation and check if current user owns it
    $stmt = $db->prepare("SELECT session_token, usr_login FROM efa_annotation WHERE annotation_key = ?");
    $stmt->bind_param('s', $annotationId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) { efa_jsonResponse(false, 'Annotation not found'); return; }

    $isOwner = ($row['session_token'] === $token)
        || (!empty($usrLogin) && !empty($row['usr_login']) && $row['usr_login'] === $usrLogin);

    if (!$isOwner) { efa_jsonResponse(false, 'Permission denied: not your annotation'); return; }

    // Delete screenshot file before removing DB record
    efa_deleteScreenshotFile($row['session_token'], $annotationId);

    $stmt = $db->prepare("DELETE FROM efa_annotation WHERE annotation_key = ?");
    $stmt->bind_param('s', $annotationId);
    $stmt->execute();
    $deleted = $stmt->affected_rows > 0;
    $stmt->close();

    efa_jsonResponse(true, 'Deleted', ['success' => true, 'message' => 'Deleted']);
}

function efa_handleUploadScreenshot() {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input === null) {
        efa_jsonResponse(false, 'JSON decode error: ' . json_last_error_msg());
        return;
    }

    $imageData = $input['image_data'] ?? '';
    $annotationId = $input['annotation_id'] ?? '';
    if (empty($imageData) || empty($annotationId)) {
        efa_jsonResponse(false, 'Missing parameters');
        return;
    }

    if (preg_match('/^data:image\/(\w+);base64,/', $imageData, $matches)) {
        $imageType = $matches[1];
        $imageData = base64_decode(substr($imageData, strpos($imageData, ',') + 1));
        if ($imageData === false) { efa_jsonResponse(false, 'Invalid image data'); return; }

        $token = efa_getSessionToken();
        $screenshotDir = EFA_DATA_PATH . '/screenshots/' . substr($token, 0, 16);
        if (!is_dir($screenshotDir)) { mkdir($screenshotDir, 0755, true); }

        $filename = $annotationId . '.' . $imageType;
        $fullPath = $screenshotDir . '/' . $filename;

        if (file_put_contents($fullPath, $imageData)) {
            $tokenPrefix = substr($token, 0, 16);
            $accessUrl = EFA_SCREENSHOT_URL . '/screenshots/' . $tokenPrefix . '/' . $filename;

            // Update screenshot_path in DB
            $db = efa_getDb();
            $stmt = $db->prepare("UPDATE efa_annotation SET screenshot_path = ? WHERE session_token = ? AND annotation_key = ?");
            $stmt->bind_param('sss', $accessUrl, $token, $annotationId);
            $stmt->execute();
            $stmt->close();

            efa_jsonResponse(true, 'Screenshot saved', [
                'success' => true,
                'relative_path' => './screenshots/' . $filename,
                'access_url' => $accessUrl,
                'filename' => $filename
            ]);
        } else {
            efa_jsonResponse(false, 'Failed to save screenshot');
        }
    } else {
        efa_jsonResponse(false, 'Invalid image format');
    }
}

function efa_handleGetConfig() {
    $config = efa_getSystemConfig();
    efa_jsonResponse(true, 'Config loaded', ['eye_for_ai' => $config]);
}

function efa_handleSaveConfig() {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) { efa_jsonResponse(false, 'Invalid input'); return; }

    $db = efa_getDb();
    $newConfig = $input['eye_for_ai'] ?? $input;

    $stmt = $db->prepare("INSERT INTO efa_config (config_key, config_value) VALUES (?, ?)
                          ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)");
    foreach ($newConfig as $key => $value) {
        $val = is_bool($value) ? ($value ? '1' : '0') : (string)$value;
        $stmt->bind_param('ss', $key, $val);
        $stmt->execute();
    }
    $stmt->close();

    efa_jsonResponse(true, 'Config saved', efa_getSystemConfig());
}

function efa_handleExportMd() {
    $pageUrl = $_GET['page_url'] ?? '';
    if (empty($pageUrl)) { efa_jsonResponse(false, 'Page URL required'); return; }

    $token = efa_getSessionToken();
    $db = efa_getDb();

    $stmt = $db->prepare("SELECT * FROM efa_annotation WHERE session_token = ? AND page_url = ? ORDER BY created_at ASC");
    $stmt->bind_param('ss', $token, $pageUrl);
    $stmt->execute();
    $result = $stmt->get_result();

    $annotations = [];
    while ($row = $result->fetch_assoc()) { $annotations[] = $row; }
    $stmt->close();

    $md = efa_generateMarkdown($pageUrl, '', $annotations);
    efa_jsonResponse(true, 'Markdown generated', ['success' => true, 'markdown' => $md]);
}

// ========================================
// DEV MODE
// ========================================

function efa_handleDevAuth() {
    $input = json_decode(file_get_contents('php://input'), true);
    $password = $input['password'] ?? '';

    $config = efa_getSystemConfig();
    $devPassword = $config['dev_password'] ?? 'dev';

    if ($password === $devPassword) {
        // Use cookie for dev mode (no PHP session needed)
        setcookie('efa_dev', '1', time() + 86400, '/', '', false, false);
        efa_jsonResponse(true, 'Authenticated');
    } else {
        efa_jsonResponse(false, 'Invalid password');
    }
}

function efa_isDevMode() {
    return !empty($_COOKIE['efa_dev']);
}

function efa_handleDevLoadAll() {
    if (!efa_isDevMode()) { efa_jsonResponse(false, 'Developer mode required'); return; }

    $pageUrl = $_GET['page_url'] ?? '';
    if (empty($pageUrl)) { efa_jsonResponse(false, 'Page URL required'); return; }

    $db = efa_getDb();
    $stmt = $db->prepare("SELECT a.*, s.ip_address, s.user_agent, s.created_at as session_created
        FROM efa_annotation a
        LEFT JOIN efa_session s ON a.session_token = s.session_token
        WHERE a.page_url = ?
        ORDER BY a.created_at DESC");
    $stmt->bind_param('s', $pageUrl);
    $stmt->execute();
    $result = $stmt->get_result();

    $annotations = [];
    $sessions = [];
    while ($row = $result->fetch_assoc()) {
        $annotations[] = [
            'id' => $row['annotation_key'],
            'annotation_key' => $row['annotation_key'],
            'type' => $row['type'],
            'comment' => $row['comment'] ?? '',
            'selector' => $row['selector'] ?? '',
            'element_text' => $row['element_text'] ?? '',
            'selected_text' => $row['selected_text'] ?? '',
            'context' => $row['context'] ?? '',
            'screenshot_path' => $row['screenshot_path'] ?? '',
            'element_position' => $row['element_position'] ? json_decode($row['element_position'], true) : '',
            'status' => $row['status'],
            'priority' => $row['priority'] ?? null,
            'developer_response' => $row['developer_response'] ?? '',
            'ai_analysis' => $row['ai_analysis'] ?? null,
            'ai_solution' => $row['ai_solution'] ?? null,
            'ai_analyzed_at' => $row['ai_analyzed_at'] ?? null,
            'resolved_at' => $row['resolved_at'] ?? null,
            'created_at' => $row['created_at'],
            'timestamp' => $row['created_at'],
            '_session_id' => $row['session_token'],
            '_session_ip' => $row['ip_address'] ?? '',
            '_session_time' => $row['session_created'] ?? '',
            '_session_dir' => $row['session_token'],
            '_page_file' => ''
        ];
        $sessions[$row['session_token']] = true;
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'annotations' => $annotations,
        'page_url' => $pageUrl,
        'session_count' => count($sessions),
        'total_count' => count($annotations)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function efa_handleDevUpdate() {
    if (!efa_isDevMode()) { efa_jsonResponse(false, 'Developer mode required'); return; }

    $input = json_decode(file_get_contents('php://input'), true);
    $sessionDir = $input['session_dir'] ?? '';
    $annotationId = $input['annotation_id'] ?? '';
    $updateType = $input['update_type'] ?? '';
    $value = $input['value'] ?? '';

    if (empty($annotationId) || empty($updateType)) {
        efa_jsonResponse(false, 'Missing parameters');
        return;
    }

    $db = efa_getDb();

    if ($updateType === 'status') {
        $stmt = $db->prepare("UPDATE efa_annotation SET status = ? WHERE annotation_key = ?");
        $stmt->bind_param('ss', $value, $annotationId);
    } elseif ($updateType === 'response') {
        $stmt = $db->prepare("UPDATE efa_annotation SET developer_response = ? WHERE annotation_key = ?");
        $stmt->bind_param('ss', $value, $annotationId);
    } else {
        efa_jsonResponse(false, 'Invalid update_type');
        return;
    }

    $stmt->execute();
    $updated = $stmt->affected_rows > 0;
    $stmt->close();

    if ($updated) {
        efa_jsonResponse(true, 'Updated', ['success' => true, 'message' => 'Updated']);
    } else {
        efa_jsonResponse(false, 'Annotation not found or no change');
    }
}

function efa_handleDevDelete() {
    if (!efa_isDevMode()) { efa_jsonResponse(false, 'Developer mode required'); return; }

    $input = json_decode(file_get_contents('php://input'), true);
    $annotationId = $input['annotation_id'] ?? '';
    if (empty($annotationId)) { efa_jsonResponse(false, 'Missing annotation_id'); return; }

    $db = efa_getDb();

    // Fetch session_token to locate screenshot file, then delete it
    $stmt = $db->prepare("SELECT session_token FROM efa_annotation WHERE annotation_key = ?");
    $stmt->bind_param('s', $annotationId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($row) {
        efa_deleteScreenshotFile($row['session_token'], $annotationId);
    }

    $stmt = $db->prepare("DELETE FROM efa_annotation WHERE annotation_key = ?");
    $stmt->bind_param('s', $annotationId);
    $stmt->execute();
    $deleted = $stmt->affected_rows > 0;
    $stmt->close();

    if ($deleted) {
        efa_jsonResponse(true, 'Deleted', ['success' => true, 'message' => 'Deleted']);
    } else {
        efa_jsonResponse(false, 'Annotation not found');
    }
}

// ========================================
// AI API
// ========================================

function efa_handleAiPending() {
    efa_checkAiAuth();

    $status = $_GET['status'] ?? 'pending';
    $limit = min(max((int)($_GET['limit'] ?? 50), 1), 200);
    $allowed = ['pending', 'ai_analyzed', 'dev_approved', 'in_progress', 'resolved', 'wontfix'];
    if (!in_array($status, $allowed, true)) $status = 'pending';

    $db = efa_getDb();
    $stmt = $db->prepare("SELECT a.*, s.ip_address, s.user_agent
        FROM efa_annotation a
        LEFT JOIN efa_session s ON a.session_token = s.session_token
        WHERE a.status = ?
        ORDER BY a.created_at ASC
        LIMIT ?");
    $stmt->bind_param('si', $status, $limit);
    $stmt->execute();
    $result = $stmt->get_result();

    $annotations = [];
    while ($row = $result->fetch_assoc()) {
        $entry = [
            'id' => $row['annotation_key'],
            'type' => $row['type'],
            'page_url' => $row['page_url'],
            'page_title' => $row['page_title'] ?? '',
            'comment' => $row['comment'] ?? '',
            'status' => $row['status'],
            'developer_response' => $row['developer_response'],
            'priority' => $row['priority'] ?? null,
            'ai_analysis' => $row['ai_analysis'] ?? null,
            'ai_solution' => $row['ai_solution'] ?? null,
            'ai_analyzed_at' => $row['ai_analyzed_at'] ?? null,
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'resolved_at' => $row['resolved_at'] ?? null,
            'session' => [
                'ip' => $row['ip_address'] ?? '',
                'user_agent' => $row['user_agent'] ?? ''
            ]
        ];
        if ($row['type'] === 'element') {
            $entry['selector'] = $row['selector'] ?? '';
            $entry['element_text'] = $row['element_text'] ?? '';
        } elseif ($row['type'] === 'text') {
            $entry['selector'] = $row['selector'] ?? '';
            $entry['selected_text'] = $row['selected_text'] ?? '';
            $entry['context'] = $row['context'] ?? '';
        } elseif ($row['type'] === 'screenshot' && !empty($row['screenshot_path'])) {
            $path = $row['screenshot_path'];
            // Make URL absolute if it's a relative path
            if (strpos($path, '://') === false) {
                $path = efa_getSiteUrl() . $path;
            }
            $entry['screenshot_url'] = $path;
        }
        if (!empty($row['element_position'])) {
            $entry['element_position'] = json_decode($row['element_position'], true);
        }
        $annotations[] = $entry;
    }
    $stmt->close();

    echo json_encode([
        'annotations' => $annotations,
        'total' => count($annotations),
        'status' => $status,
        'site_url' => efa_getSiteUrl()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function efa_handleAiBatch() {
    efa_checkAiAuth();

    $input = json_decode(file_get_contents('php://input'), true);
    $updates = $input['updates'] ?? [];
    if (empty($updates) || !is_array($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'updates array is required']);
        exit;
    }
    if (count($updates) > 100) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Maximum 100 updates per batch']);
        exit;
    }

    $db = efa_getDb();
    $allowed = ['pending', 'ai_analyzed', 'dev_approved', 'in_progress', 'resolved', 'wontfix'];
    $results = [];

    foreach ($updates as $upd) {
        $id = $upd['id'] ?? '';
        if (empty($id)) { $results[] = ['id' => $id, 'success' => false, 'error' => 'No id']; continue; }

        $sets = [];
        $params = [];
        $types = '';

        if (isset($upd['status']) && in_array($upd['status'], $allowed, true)) {
            $sets[] = 'status = ?';
            $params[] = $upd['status'];
            $types .= 's';
        }
        if (isset($upd['developer_response'])) {
            $sets[] = 'developer_response = ?';
            $params[] = $upd['developer_response'];
            $types .= 's';
        }

        if (empty($sets)) { $results[] = ['id' => $id, 'success' => false, 'error' => 'Nothing to update']; continue; }

        $params[] = $id;
        $types .= 's';

        $stmt = $db->prepare("UPDATE efa_annotation SET " . implode(', ', $sets) . " WHERE annotation_key = ?");
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $results[] = ['id' => $id, 'success' => $stmt->affected_rows >= 0];
        $stmt->close();
    }

    $successCount = count(array_filter($results, function($r) { return $r['success']; }));
    echo json_encode([
        'success' => true,
        'results' => $results,
        'updated' => $successCount,
        'failed' => count($results) - $successCount
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function efa_handleAiGenerateKey() {
    if (!efa_isDevMode()) { efa_jsonResponse(false, 'Developer mode required'); return; }

    $key = bin2hex(random_bytes(20));
    $db = efa_getDb();

    $stmt = $db->prepare("INSERT INTO efa_config (config_key, config_value) VALUES ('ai_api_key', ?)
                          ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)");
    $stmt->bind_param('s', $key);
    $stmt->execute();
    $stmt->close();

    $stmt = $db->prepare("INSERT INTO efa_config (config_key, config_value) VALUES ('ai_api_enabled', '1')
                          ON DUPLICATE KEY UPDATE config_value = '1'");
    $stmt->execute();
    $stmt->close();

    efa_jsonResponse(true, 'API key generated. AI API is now enabled.', ['key' => $key]);
}

// ========================================
// AI WORKFLOW HANDLERS
// ========================================

/**
 * ai_detail — Get single annotation with full details (for AI deep analysis)
 * GET ?action=ai_detail&id=ann_xxx
 */
function efa_handleAiDetail() {
    efa_checkAiAuth();

    $annotationId = $_GET['id'] ?? '';
    if (empty($annotationId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id parameter is required']);
        exit;
    }

    $db = efa_getDb();
    $stmt = $db->prepare("SELECT a.*, s.ip_address, s.user_agent
        FROM efa_annotation a
        LEFT JOIN efa_session s ON a.session_token = s.session_token
        WHERE a.annotation_key = ?");
    $stmt->bind_param('s', $annotationId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Annotation not found']);
        exit;
    }

    $siteUrl = efa_getSiteUrl();
    $screenshotUrl = null;
    if (!empty($row['screenshot_path'])) {
        $screenshotUrl = (strpos($row['screenshot_path'], '://') === false)
            ? $siteUrl . $row['screenshot_path']
            : $row['screenshot_path'];
    }

    echo json_encode([
        'success' => true,
        'annotation' => [
            'id' => $row['annotation_key'],
            'type' => $row['type'],
            'page_url' => $row['page_url'],
            'page_title' => $row['page_title'] ?? '',
            'comment' => $row['comment'] ?? '',
            'selector' => $row['selector'] ?? '',
            'element_text' => $row['element_text'] ?? '',
            'selected_text' => $row['selected_text'] ?? '',
            'context' => $row['context'] ?? '',
            'screenshot_url' => $screenshotUrl,
            'element_position' => !empty($row['element_position']) ? json_decode($row['element_position'], true) : null,
            'status' => $row['status'],
            'priority' => $row['priority'] ?? null,
            'developer_response' => $row['developer_response'],
            'ai_analysis' => $row['ai_analysis'] ?? null,
            'ai_solution' => $row['ai_solution'] ?? null,
            'ai_analyzed_at' => $row['ai_analyzed_at'] ?? null,
            'resolved_at' => $row['resolved_at'] ?? null,
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'session' => [
                'ip' => $row['ip_address'] ?? '',
                'user_agent' => $row['user_agent'] ?? ''
            ]
        ],
        'site_url' => $siteUrl
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * ai_analyze — AI submits analysis + proposed solution for an annotation
 * POST { id, analysis, solution, priority? }
 * Moves status from 'pending' → 'ai_analyzed'
 */
function efa_handleAiAnalyze() {
    efa_checkAiAuth();

    $input = json_decode(file_get_contents('php://input'), true);
    $annotationId = $input['id'] ?? '';
    $analysis = $input['analysis'] ?? '';
    $solution = $input['solution'] ?? '';
    $priority = $input['priority'] ?? null;

    if (empty($annotationId) || empty($analysis) || empty($solution)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id, analysis, and solution are required']);
        exit;
    }

    $allowedPriority = ['low', 'medium', 'high', 'critical'];
    if ($priority !== null && !in_array($priority, $allowedPriority, true)) {
        $priority = null;
    }

    $db = efa_getDb();
    $now = date('Y-m-d H:i:s');

    $sql = "UPDATE efa_annotation SET ai_analysis = ?, ai_solution = ?, ai_analyzed_at = ?, status = 'ai_analyzed'";
    $params = [$analysis, $solution, $now];
    $types = 'sss';

    if ($priority !== null) {
        $sql .= ", priority = ?";
        $params[] = $priority;
        $types .= 's';
    }

    $sql .= " WHERE annotation_key = ?";
    $params[] = $annotationId;
    $types .= 's';

    $stmt = $db->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Annotation not found or unchanged']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Analysis submitted. Status changed to ai_analyzed.',
        'id' => $annotationId
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * ai_resolve — Quick resolve: set status to resolved + developer_response + resolved_at
 * POST { id, response, status? }
 */
function efa_handleAiResolve() {
    efa_checkAiAuth();

    $input = json_decode(file_get_contents('php://input'), true);
    $annotationId = $input['id'] ?? '';
    $response = $input['response'] ?? '';
    $status = $input['status'] ?? 'resolved';

    if (empty($annotationId) || empty($response)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id and response are required']);
        exit;
    }

    $allowed = ['resolved', 'wontfix'];
    if (!in_array($status, $allowed, true)) $status = 'resolved';

    $db = efa_getDb();
    $now = date('Y-m-d H:i:s');

    $stmt = $db->prepare("UPDATE efa_annotation SET developer_response = ?, status = ?, resolved_at = ? WHERE annotation_key = ?");
    $stmt->bind_param('ssss', $response, $status, $now, $annotationId);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    echo json_encode([
        'success' => $affected > 0,
        'message' => $affected > 0 ? 'Resolved successfully' : 'Annotation not found',
        'id' => $annotationId
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * ai_summary — Overview stats for AI dashboard
 * GET ?action=ai_summary
 */
function efa_handleAiSummary() {
    efa_checkAiAuth();

    $db = efa_getDb();

    // Count by status
    $r = $db->query("SELECT status, COUNT(*) as cnt FROM efa_annotation GROUP BY status");
    $byStatus = [];
    while ($row = $r->fetch_assoc()) {
        $byStatus[$row['status']] = (int)$row['cnt'];
    }

    // Count by priority
    $r = $db->query("SELECT COALESCE(priority, 'unset') as p, COUNT(*) as cnt FROM efa_annotation GROUP BY p");
    $byPriority = [];
    while ($row = $r->fetch_assoc()) {
        $byPriority[$row['p']] = (int)$row['cnt'];
    }

    // Count by page
    $r = $db->query("SELECT page_url, COUNT(*) as cnt FROM efa_annotation GROUP BY page_url ORDER BY cnt DESC LIMIT 20");
    $byPage = [];
    while ($row = $r->fetch_assoc()) {
        $byPage[] = ['page_url' => $row['page_url'], 'count' => (int)$row['cnt']];
    }

    // Recent activity
    $r = $db->query("SELECT COUNT(*) as total,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as last_24h,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as last_7d
        FROM efa_annotation");
    $activity = $r->fetch_assoc();

    echo json_encode([
        'success' => true,
        'summary' => [
            'total' => (int)$activity['total'],
            'last_24h' => (int)$activity['last_24h'],
            'last_7d' => (int)$activity['last_7d'],
            'by_status' => $byStatus,
            'by_priority' => $byPriority,
            'by_page' => $byPage
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * ai_screenshot — Proxy screenshot image for direct AI reading
 * GET ?action=ai_screenshot&id=ann_xxx
 * Returns the image binary with proper Content-Type
 */
function efa_handleAiScreenshot() {
    efa_checkAiAuth();

    $annotationId = $_GET['id'] ?? '';
    if (empty($annotationId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id parameter is required']);
        exit;
    }

    $db = efa_getDb();
    $stmt = $db->prepare("SELECT session_token, screenshot_path FROM efa_annotation WHERE annotation_key = ?");
    $stmt->bind_param('s', $annotationId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || empty($row['screenshot_path'])) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No screenshot found']);
        exit;
    }

    // Resolve filesystem path from the URL-based screenshot_path
    $tokenPrefix = substr($row['session_token'], 0, 16);
    $screenshotDir = EFA_DATA_PATH . '/screenshots/' . $tokenPrefix;

    // Try to find the file by annotation ID
    $found = null;
    foreach (['png', 'jpg', 'jpeg', 'gif', 'webp'] as $ext) {
        $file = $screenshotDir . '/' . $annotationId . '.' . $ext;
        if (file_exists($file)) { $found = $file; break; }
    }

    if (!$found) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Screenshot file not found on disk']);
        exit;
    }

    $mimeTypes = ['png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'webp' => 'image/webp'];
    $ext = strtolower(pathinfo($found, PATHINFO_EXTENSION));

    header('Content-Type: ' . ($mimeTypes[$ext] ?? 'application/octet-stream'));
    header('Content-Length: ' . filesize($found));
    header('Cache-Control: public, max-age=3600');
    readfile($found);
    exit;
}

// ========================================
// HELPERS
// ========================================

function efa_deleteScreenshotFile($sessionToken, $annotationId) {
    if (empty($sessionToken) || empty($annotationId)) return;

    $tokenPrefix = substr($sessionToken, 0, 16);
    $screenshotDir = EFA_DATA_PATH . '/screenshots/' . $tokenPrefix;
    if (!is_dir($screenshotDir)) return;

    // Try common image extensions
    foreach (['png', 'jpg', 'jpeg', 'gif', 'webp'] as $ext) {
        $file = $screenshotDir . '/' . $annotationId . '.' . $ext;
        if (file_exists($file)) {
            unlink($file);
        }
    }

    // Remove directory if empty
    $remaining = glob($screenshotDir . '/*');
    if (empty($remaining)) {
        rmdir($screenshotDir);
    }
}

function efa_getSystemConfig() {
    $db = efa_getDb();
    $result = $db->query("SELECT config_key, config_value FROM efa_config");
    $config = [
        'expire_hours' => 72,
        'dev_password' => 'dev',
        'enabled' => true,
        'ai_api_enabled' => false,
        'ai_api_key' => ''
    ];
    while ($row = $result->fetch_assoc()) {
        $val = $row['config_value'];
        if ($val === '1' || $val === 'true') $val = true;
        elseif ($val === '0' || $val === 'false') $val = false;
        elseif (is_numeric($val)) $val = (int)$val;
        $config[$row['config_key']] = $val;
    }
    return $config;
}

function efa_checkAiAuth() {
    $config = efa_getSystemConfig();
    if (empty($config['ai_api_enabled'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'AI API is not enabled.']);
        exit;
    }
    $headers = array_change_key_case(getallheaders(), CASE_LOWER);
    $apiKey = $headers['x-efa-api-key'] ?? '';
    if (empty($apiKey) || empty($config['ai_api_key']) || !hash_equals((string)$config['ai_api_key'], $apiKey)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid or missing API key.']);
        exit;
    }
}

function efa_getSiteUrl() {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}

function efa_generateMarkdown($pageUrl, $pageTitle, $annotations) {
    $md = "# Eye for AI Feedback Report\n\n";
    $md .= "**URL**: " . $pageUrl . "\n";
    $md .= "**Date**: " . date('Y-m-d H:i') . "\n\n---\n\n";

    if (empty($annotations)) { return $md . "*No annotations*\n"; }

    $i = 1;
    foreach ($annotations as $ann) {
        $type = $ann['type'] ?? 'element';
        $md .= "## #{$i} " . ucfirst($type) . " Annotation\n";
        if ($type === 'element') {
            $md .= "- **Selector**: `" . ($ann['selector'] ?? '') . "`\n";
            if (!empty($ann['element_text'])) $md .= "- **Element Text**: \"" . $ann['element_text'] . "\"\n";
        } elseif ($type === 'text') {
            $md .= "- **Selected**: \"" . ($ann['selected_text'] ?? '') . "\"\n";
            if (!empty($ann['context'])) $md .= "- **Context**: \"" . $ann['context'] . "\"\n";
        } elseif ($type === 'screenshot' && !empty($ann['screenshot_path'])) {
            $md .= "- **Image**: [View](" . $ann['screenshot_path'] . ")\n";
        }
        $md .= "- **Comment**: " . ($ann['comment'] ?? '') . "\n";
        $md .= "- **Status**: " . ($ann['status'] ?? 'pending') . "\n";
        if (!empty($ann['developer_response'])) $md .= "- **Dev Response**: " . $ann['developer_response'] . "\n";
        $md .= "- **Time**: " . ($ann['created_at'] ?? date('Y-m-d H:i:s')) . "\n\n";
        $i++;
    }
    return $md;
}

function efa_jsonResponse($success, $message, $data = null) {
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) $response = array_merge($response, $data);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

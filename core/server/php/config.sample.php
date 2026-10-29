<?php
declare(strict_types=1);
/**
 * Eye for AI reference server — configuration. Copy to config.php (gitignored) and edit.
 * Every key is optional; the defaults are in index.php → efa_config().
 */
return [
    // Keep data outside the web root in production. The bundled data/.htaccess only protects Apache.
    'db_path'     => __DIR__ . '/data/eye-for-ai.sqlite',
    'storage_dir' => __DIR__ . '/data/screenshots',

    // The AI agent's key: `Authorization: Bearer <ai_token>`. Generate with
    //   php -r "echo bin2hex(random_bytes(24)), PHP_EOL;"
    // and read it from the environment rather than writing it here.
    'ai_token' => getenv('EFA_AI_TOKEN') ?: '',

    // Who is reporting. Hook your app's session in; return ['id' => ..., 'name' => ...] or null.
    // With null and allow_anonymous = true, reporters get a random cookie id ("Guest ab12").
    'current_user' => function (): ?array {
        // session_start();
        // return isset($_SESSION['user']) ? ['id' => $_SESSION['user']['id'], 'name' => $_SESSION['user']['name']] : null;
        return null;
    },
    'allow_anonymous' => true,

    // The version now deployed for a scope — powers "fix is live / pending" next to a Fix Version.
    'current_version' => function (?string $scope): ?string {
        return null;   // e.g. return $scope === 'billing' ? '1.4.1' : null;
    },

    'max_screenshots'   => 6,
    'max_image_bytes'   => 8 * 1024 * 1024,
    'reports_per_10min' => 20,     // per reporter; 0 = no limit
    'auto_close_days'   => 14,     // Resolved and unverified for this long → Closed; 0 = never
];

<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class EFA_Activator {

    /**
     * Run on plugin activation.
     */
    public static function activate() {
        self::create_tables();
        self::set_defaults();
        self::create_upload_dir();

        // Schedule cleanup cron
        if ( ! wp_next_scheduled( 'efa_cleanup_sessions' ) ) {
            wp_schedule_event( time(), 'daily', 'efa_cleanup_sessions' );
        }
    }

    /**
     * Create database tables via dbDelta.
     */
    private static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        $sessions_table = $wpdb->prefix . 'efa_sessions';
        $annotations_table = $wpdb->prefix . 'efa_annotations';

        $sql = "CREATE TABLE {$sessions_table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            session_token varchar(64) NOT NULL,
            user_id bigint(20) unsigned DEFAULT NULL,
            user_agent text,
            ip_address varchar(45) DEFAULT '',
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_active datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY session_token (session_token),
            KEY expires_at (expires_at)
        ) {$charset_collate};

        CREATE TABLE {$annotations_table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            session_id bigint(20) unsigned NOT NULL,
            annotation_key varchar(64) NOT NULL DEFAULT '',
            page_url text NOT NULL,
            page_title varchar(255) DEFAULT '',
            type varchar(20) NOT NULL DEFAULT 'element',
            comment text,
            selector text,
            element_text text,
            selected_text text,
            context text,
            screenshot_path varchar(512) DEFAULT NULL,
            element_position text,
            status varchar(20) NOT NULL DEFAULT 'pending',
            developer_response text,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY session_id (session_id),
            KEY type (type),
            KEY status (status)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql );

        update_option( 'efa_db_version', '1.2.0' );
    }

    /**
     * Set default options.
     */
    private static function set_defaults() {
        add_option( 'efa_enabled', '1' );
        add_option( 'efa_capability', 'manage_options' );
        add_option( 'efa_session_expiry_hours', '72' );
        add_option( 'efa_screenshot_max_size', '2' ); // MB
        add_option( 'efa_ai_enabled', '0' );
        add_option( 'efa_ai_api_key', '' );
    }

    /**
     * Create upload directory for screenshots.
     */
    private static function create_upload_dir() {
        $upload_dir = wp_upload_dir();
        $efa_dir = $upload_dir['basedir'] . '/eye-for-ai';

        if ( ! is_dir( $efa_dir ) ) {
            wp_mkdir_p( $efa_dir );
        }

        // Protect directory with .htaccess (allow images only)
        $htaccess = $efa_dir . '/.htaccess';
        if ( ! file_exists( $htaccess ) ) {
            file_put_contents( $htaccess, "Options -Indexes\n<FilesMatch '\\.(?:png|jpe?g|gif|webp)$'>\n    Require all granted\n</FilesMatch>\n<FilesMatch '(?<!\\.(png|jpe?g|gif|webp))$'>\n    Require all denied\n</FilesMatch>\n" );
        }

        // Also add an index.php for extra protection
        $index = $efa_dir . '/index.php';
        if ( ! file_exists( $index ) ) {
            file_put_contents( $index, '<?php // Silence is golden.' );
        }
    }
}

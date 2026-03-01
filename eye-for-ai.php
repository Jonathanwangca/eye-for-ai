<?php
/**
 * Plugin Name: Eye for AI
 * Plugin URI:  https://github.com/Jonathanwangca/eye-for-ai
 * Description: Visual annotation overlay for collecting page feedback — element, text, and screenshot annotations with AI-friendly API and developer admin panel.
 * Version:     1.2.0
 * Author:      Jonathan Wang
 * Author URI:  https://github.com/Jonathanwangca
 * License:     GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: eye-for-ai
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Plugin constants
define( 'EFA_VERSION', '1.2.0' );
define( 'EFA_PLUGIN_FILE', __FILE__ );
define( 'EFA_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EFA_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'EFA_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

// Activation / Deactivation
require_once EFA_PLUGIN_DIR . 'includes/class-efa-activator.php';
register_activation_hook( __FILE__, array( 'EFA_Activator', 'activate' ) );

require_once EFA_PLUGIN_DIR . 'includes/class-efa-deactivator.php';
register_deactivation_hook( __FILE__, array( 'EFA_Deactivator', 'deactivate' ) );

// Core classes
require_once EFA_PLUGIN_DIR . 'includes/class-efa-session.php';
require_once EFA_PLUGIN_DIR . 'includes/class-efa-rest-api.php';
require_once EFA_PLUGIN_DIR . 'includes/class-efa-ai-api.php';
require_once EFA_PLUGIN_DIR . 'includes/class-efa-export.php';
require_once EFA_PLUGIN_DIR . 'includes/class-efa-frontend.php';
require_once EFA_PLUGIN_DIR . 'includes/class-efa-admin.php';

/**
 * Initialize session handling early (before headers sent).
 */
add_action( 'init', function () {
    if ( get_option( 'efa_enabled', '1' ) !== '1' ) {
        return;
    }
    EFA_Session::init_cookie();
}, 5 );

/**
 * Register REST API routes.
 */
add_action( 'rest_api_init', function () {
    $api = new EFA_REST_API();
    $api->register_routes();

    $ai = new EFA_AI_API();
    $ai->register_routes();
} );

/**
 * Enqueue frontend assets.
 */
add_action( 'wp_enqueue_scripts', function () {
    if ( get_option( 'efa_enabled', '1' ) !== '1' ) {
        return;
    }
    EFA_Frontend::enqueue();
} );

/**
 * Register admin pages.
 */
add_action( 'admin_menu', function () {
    EFA_Admin::register_menus();
} );

add_action( 'admin_init', function () {
    EFA_Admin::register_settings();
} );

add_action( 'admin_enqueue_scripts', function ( $hook ) {
    EFA_Admin::enqueue( $hook );
} );

/**
 * Schedule / unschedule cron for session cleanup.
 */
add_action( 'efa_cleanup_sessions', array( 'EFA_Session', 'cleanup_expired' ) );

if ( ! wp_next_scheduled( 'efa_cleanup_sessions' ) ) {
    wp_schedule_event( time(), 'daily', 'efa_cleanup_sessions' );
}

/**
 * Load text domain, run migrations and DB upgrades.
 */
add_action( 'plugins_loaded', function () {
    load_plugin_textdomain( 'eye-for-ai', false, dirname( EFA_PLUGIN_BASENAME ) . '/languages' );

    // Migrate from VFB to EFA if old tables exist
    global $wpdb;
    $old_table = $wpdb->prefix . 'vfb_sessions';
    $new_table = $wpdb->prefix . 'efa_sessions';

    if ( $wpdb->get_var( "SHOW TABLES LIKE '{$old_table}'" ) === $old_table
         && $wpdb->get_var( "SHOW TABLES LIKE '{$new_table}'" ) !== $new_table ) {

        // Rename tables
        $wpdb->query( "RENAME TABLE {$wpdb->prefix}vfb_sessions TO {$wpdb->prefix}efa_sessions" );
        $wpdb->query( "RENAME TABLE {$wpdb->prefix}vfb_annotations TO {$wpdb->prefix}efa_annotations" );

        // Migrate options
        $option_map = array(
            'vfb_enabled'              => 'efa_enabled',
            'vfb_capability'           => 'efa_capability',
            'vfb_session_expiry_hours' => 'efa_session_expiry_hours',
            'vfb_screenshot_max_size'  => 'efa_screenshot_max_size',
            'vfb_db_version'           => 'efa_db_version',
            'vfb_ai_enabled'           => 'efa_ai_enabled',
            'vfb_ai_api_key'           => 'efa_ai_api_key',
        );

        foreach ( $option_map as $old => $new ) {
            $val = get_option( $old );
            if ( $val !== false ) {
                update_option( $new, $val );
                delete_option( $old );
            }
        }

        // Clear old cron hook
        wp_clear_scheduled_hook( 'vfb_cleanup_sessions' );
    }

    // DB upgrade check — re-run dbDelta when version changes.
    if ( get_option( 'efa_db_version', '1.0.0' ) !== '1.2.0' ) {
        EFA_Activator::activate();
    }
} );

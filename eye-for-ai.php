<?php
/**
 * Plugin Name: Eye for AI
 * Plugin URI:  https://github.com/Jonathanwangca/eye-for-ai
 * Description: Visual annotation overlay for collecting page feedback — element, text, and screenshot annotations with AI-friendly API and developer admin panel.
 * Version:     1.1.0
 * Author:      Jonathan Wang
 * Author URI:  https://onedreamtravel.com
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
define( 'VFB_VERSION', '1.1.0' );
define( 'VFB_PLUGIN_FILE', __FILE__ );
define( 'VFB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'VFB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'VFB_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

// Activation / Deactivation
require_once VFB_PLUGIN_DIR . 'includes/class-vfb-activator.php';
register_activation_hook( __FILE__, array( 'VFB_Activator', 'activate' ) );

require_once VFB_PLUGIN_DIR . 'includes/class-vfb-deactivator.php';
register_deactivation_hook( __FILE__, array( 'VFB_Deactivator', 'deactivate' ) );

// Core classes
require_once VFB_PLUGIN_DIR . 'includes/class-vfb-session.php';
require_once VFB_PLUGIN_DIR . 'includes/class-vfb-rest-api.php';
require_once VFB_PLUGIN_DIR . 'includes/class-vfb-ai-api.php';
require_once VFB_PLUGIN_DIR . 'includes/class-vfb-export.php';
require_once VFB_PLUGIN_DIR . 'includes/class-vfb-frontend.php';
require_once VFB_PLUGIN_DIR . 'includes/class-vfb-admin.php';

/**
 * Initialize session handling early (before headers sent).
 */
add_action( 'init', function () {
    if ( get_option( 'vfb_enabled', '1' ) !== '1' ) {
        return;
    }
    VFB_Session::init_cookie();
}, 5 );

/**
 * Register REST API routes.
 */
add_action( 'rest_api_init', function () {
    $api = new VFB_REST_API();
    $api->register_routes();

    $ai = new VFB_AI_API();
    $ai->register_routes();
} );

/**
 * Enqueue frontend assets.
 */
add_action( 'wp_enqueue_scripts', function () {
    if ( get_option( 'vfb_enabled', '1' ) !== '1' ) {
        return;
    }
    VFB_Frontend::enqueue();
} );

/**
 * Register admin pages.
 */
add_action( 'admin_menu', function () {
    VFB_Admin::register_menus();
} );

add_action( 'admin_init', function () {
    VFB_Admin::register_settings();
} );

add_action( 'admin_enqueue_scripts', function ( $hook ) {
    VFB_Admin::enqueue( $hook );
} );

/**
 * Schedule / unschedule cron for session cleanup.
 */
add_action( 'vfb_cleanup_sessions', array( 'VFB_Session', 'cleanup_expired' ) );

if ( ! wp_next_scheduled( 'vfb_cleanup_sessions' ) ) {
    wp_schedule_event( time(), 'daily', 'vfb_cleanup_sessions' );
}

/**
 * Load text domain and run DB upgrades if needed.
 */
add_action( 'plugins_loaded', function () {
    load_plugin_textdomain( 'eye-for-ai', false, dirname( VFB_PLUGIN_BASENAME ) . '/languages' );

    // DB upgrade check — re-run dbDelta when version changes.
    if ( get_option( 'vfb_db_version', '1.0.0' ) !== '1.1.0' ) {
        VFB_Activator::activate();
    }
} );

<?php
/**
 * Fired when the plugin is uninstalled (deleted).
 * Drops tables, removes options, and cleans up uploads.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

global $wpdb;

// Drop tables (both old and new names for safety)
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}efa_annotations" );
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}efa_sessions" );
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}vfb_annotations" );
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}vfb_sessions" );

// Delete options (both old and new names for safety)
$options = array(
    'efa_enabled',
    'efa_capability',
    'efa_session_expiry_hours',
    'efa_screenshot_max_size',
    'efa_db_version',
    'efa_ai_enabled',
    'efa_ai_api_key',
    'vfb_enabled',
    'vfb_capability',
    'vfb_session_expiry_hours',
    'vfb_screenshot_max_size',
    'vfb_db_version',
    'vfb_ai_enabled',
    'vfb_ai_api_key',
);

foreach ( $options as $option ) {
    delete_option( $option );
}

// Remove upload directory
$upload_dir = wp_upload_dir();
$efa_dir = $upload_dir['basedir'] . '/eye-for-ai';

if ( is_dir( $efa_dir ) ) {
    // Recursive delete
    $iterator = new RecursiveDirectoryIterator( $efa_dir, RecursiveDirectoryIterator::SKIP_DOTS );
    $files = new RecursiveIteratorIterator( $iterator, RecursiveIteratorIterator::CHILD_FIRST );

    foreach ( $files as $file ) {
        if ( $file->isDir() ) {
            rmdir( $file->getRealPath() );
        } else {
            unlink( $file->getRealPath() );
        }
    }

    rmdir( $efa_dir );
}

// Clear any scheduled cron (both old and new names)
wp_clear_scheduled_hook( 'efa_cleanup_sessions' );
wp_clear_scheduled_hook( 'vfb_cleanup_sessions' );

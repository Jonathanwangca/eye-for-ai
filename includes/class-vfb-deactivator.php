<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class VFB_Deactivator {

    /**
     * Run on plugin deactivation.
     */
    public static function deactivate() {
        wp_clear_scheduled_hook( 'vfb_cleanup_sessions' );
    }
}

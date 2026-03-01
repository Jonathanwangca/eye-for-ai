<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class EFA_Deactivator {

    /**
     * Run on plugin deactivation.
     */
    public static function deactivate() {
        wp_clear_scheduled_hook( 'efa_cleanup_sessions' );
    }
}

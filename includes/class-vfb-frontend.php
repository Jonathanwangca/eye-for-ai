<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class VFB_Frontend {

    /**
     * Enqueue frontend assets.
     */
    public static function enqueue() {
        // html2canvas (bundled)
        wp_enqueue_script(
            'html2canvas',
            VFB_PLUGIN_URL . 'assets/vendor/html2canvas.min.js',
            array(),
            '1.4.1',
            true
        );

        // VFB Screenshot module
        wp_enqueue_script(
            'vfb-screenshot',
            VFB_PLUGIN_URL . 'assets/js/vfb-screenshot.js',
            array( 'html2canvas' ),
            VFB_VERSION,
            true
        );

        // VFB main
        wp_enqueue_script(
            'vfb-main',
            VFB_PLUGIN_URL . 'assets/js/vfb.js',
            array( 'vfb-screenshot' ),
            VFB_VERSION,
            true
        );

        // VFB CSS
        wp_enqueue_style(
            'vfb-style',
            VFB_PLUGIN_URL . 'assets/css/vfb.css',
            array(),
            VFB_VERSION
        );

        // Inject configuration
        $is_admin = current_user_can( get_option( 'vfb_capability', 'manage_options' ) );

        $config = array(
            'apiBase' => rest_url( 'eye-for-ai/v1' ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
            'isAdmin' => $is_admin,
            'debug'   => defined( 'WP_DEBUG' ) && WP_DEBUG,
            'version' => VFB_VERSION,
            'i18n'    => array(
                // Toolbar
                'feedback'        => __( 'Feedback', 'eye-for-ai' ),
                'element'         => __( 'Element', 'eye-for-ai' ),
                'text'            => __( 'Text', 'eye-for-ai' ),
                'screenshot'      => __( 'Screenshot', 'eye-for-ai' ),
                'list'            => __( 'List', 'eye-for-ai' ),
                'save'            => __( 'Save', 'eye-for-ai' ),
                'close'           => __( 'Close', 'eye-for-ai' ),
                'devMode'         => __( 'Dev Mode', 'eye-for-ai' ),
                // Modal
                'addComment'      => __( 'Add your feedback', 'eye-for-ai' ),
                'commentLabel'    => __( 'Comment', 'eye-for-ai' ),
                'cancel'          => __( 'Cancel', 'eye-for-ai' ),
                'submit'          => __( 'Submit', 'eye-for-ai' ),
                'delete'          => __( 'Delete', 'eye-for-ai' ),
                // Status
                'pending'         => __( 'Pending', 'eye-for-ai' ),
                'inProgress'      => __( 'In Progress', 'eye-for-ai' ),
                'resolved'        => __( 'Resolved', 'eye-for-ai' ),
                // Messages
                'saved'           => __( 'Feedback saved', 'eye-for-ai' ),
                'deleted'         => __( 'Annotation deleted', 'eye-for-ai' ),
                'error'           => __( 'An error occurred', 'eye-for-ai' ),
                'noAnnotations'   => __( 'No annotations yet', 'eye-for-ai' ),
                'clickElement'    => __( 'Click an element to annotate', 'eye-for-ai' ),
                'selectText'      => __( 'Select text to annotate', 'eye-for-ai' ),
                'drawRegion'      => __( 'Draw a region to capture', 'eye-for-ai' ),
                'exportMd'        => __( 'Export Markdown', 'eye-for-ai' ),
                // Detail
                'type'            => __( 'Type', 'eye-for-ai' ),
                'selector'        => __( 'Selector', 'eye-for-ai' ),
                'elementText'     => __( 'Element Text', 'eye-for-ai' ),
                'selectedText'    => __( 'Selected Text', 'eye-for-ai' ),
                'context'         => __( 'Context', 'eye-for-ai' ),
                'devResponse'     => __( 'Developer Response', 'eye-for-ai' ),
                'locate'          => __( 'Locate', 'eye-for-ai' ),
                'viewScreenshot'  => __( 'View Screenshot', 'eye-for-ai' ),
            ),
        );

        wp_add_inline_script( 'vfb-main', 'window.VFBConfig = ' . wp_json_encode( $config ) . ';', 'before' );
    }
}

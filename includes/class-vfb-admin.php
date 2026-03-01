<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class VFB_Admin {

    /**
     * Register admin menu pages.
     */
    public static function register_menus() {
        // Dashboard under Tools
        add_management_page(
            __( 'Visual Feedback', 'eye-for-ai' ),
            __( 'Visual Feedback', 'eye-for-ai' ),
            get_option( 'vfb_capability', 'manage_options' ),
            'eye-for-ai',
            array( __CLASS__, 'render_dashboard' )
        );

        // Settings page
        add_options_page(
            __( 'Visual Feedback Settings', 'eye-for-ai' ),
            __( 'Visual Feedback', 'eye-for-ai' ),
            'manage_options',
            'eye-for-ai-settings',
            array( __CLASS__, 'render_settings' )
        );
    }

    /**
     * Register settings using Settings API.
     */
    public static function register_settings() {
        register_setting( 'vfb_settings', 'vfb_enabled', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '1',
        ) );

        register_setting( 'vfb_settings', 'vfb_session_expiry_hours', array(
            'type'              => 'integer',
            'sanitize_callback' => 'absint',
            'default'           => 72,
        ) );

        register_setting( 'vfb_settings', 'vfb_screenshot_max_size', array(
            'type'              => 'integer',
            'sanitize_callback' => 'absint',
            'default'           => 2,
        ) );

        register_setting( 'vfb_settings', 'vfb_ai_enabled', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '0',
        ) );
    }

    /**
     * Enqueue admin scripts/styles.
     */
    public static function enqueue( $hook ) {
        if ( ! in_array( $hook, array( 'tools_page_eye-for-ai', 'settings_page_eye-for-ai-settings' ), true ) ) {
            return;
        }

        wp_enqueue_style(
            'vfb-admin',
            VFB_PLUGIN_URL . 'assets/css/vfb-admin.css',
            array(),
            VFB_VERSION
        );

        wp_enqueue_script(
            'vfb-admin',
            VFB_PLUGIN_URL . 'assets/js/vfb-admin.js',
            array( 'jquery' ),
            VFB_VERSION,
            true
        );

        wp_localize_script( 'vfb-admin', 'vfbAdmin', array(
            'ajaxUrl'  => admin_url( 'admin-ajax.php' ),
            'restBase' => rest_url( 'eye-for-ai/v1' ),
            'nonce'    => wp_create_nonce( 'wp_rest' ),
            'i18n'     => array(
                'confirmDelete'        => __( 'Delete this annotation?', 'eye-for-ai' ),
                'confirmDeleteSession' => __( 'Delete entire session and all its feedback?', 'eye-for-ai' ),
                'saved'                => __( 'Saved', 'eye-for-ai' ),
                'deleted'              => __( 'Deleted', 'eye-for-ai' ),
                'error'                => __( 'An error occurred', 'eye-for-ai' ),
                'apiKeyCopied'         => __( 'API key copied to clipboard', 'eye-for-ai' ),
            ),
        ) );
    }

    /**
     * Render the dashboard page (Tools > Visual Feedback).
     */
    public static function render_dashboard() {
        global $wpdb;

        $sessions_table    = $wpdb->prefix . 'vfb_sessions';
        $annotations_table = $wpdb->prefix . 'vfb_annotations';

        // Stats
        $total_sessions    = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$sessions_table}" );
        $total_annotations = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$annotations_table}" );
        $pending_count     = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$annotations_table} WHERE status = %s", 'pending' ) );
        $resolved_count    = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$annotations_table} WHERE status = %s", 'resolved' ) );

        // Get sessions with annotations
        $sessions = $wpdb->get_results(
            "SELECT s.*, COUNT(a.id) AS annotation_count
             FROM {$sessions_table} s
             LEFT JOIN {$annotations_table} a ON s.id = a.session_id
             GROUP BY s.id
             HAVING annotation_count > 0
             ORDER BY s.last_active DESC
             LIMIT 50"
        );

        ?>
        <div class="wrap vfb-admin-wrap">
            <h1><?php esc_html_e( 'Visual Feedback Dashboard', 'eye-for-ai' ); ?></h1>

            <!-- Stats Cards -->
            <div class="vfb-stats-grid">
                <div class="vfb-stat-card">
                    <div class="vfb-stat-number"><?php echo esc_html( $total_sessions ); ?></div>
                    <div class="vfb-stat-label"><?php esc_html_e( 'Sessions', 'eye-for-ai' ); ?></div>
                </div>
                <div class="vfb-stat-card">
                    <div class="vfb-stat-number"><?php echo esc_html( $total_annotations ); ?></div>
                    <div class="vfb-stat-label"><?php esc_html_e( 'Total Annotations', 'eye-for-ai' ); ?></div>
                </div>
                <div class="vfb-stat-card">
                    <div class="vfb-stat-number vfb-stat-pending"><?php echo esc_html( $pending_count ); ?></div>
                    <div class="vfb-stat-label"><?php esc_html_e( 'Pending', 'eye-for-ai' ); ?></div>
                </div>
                <div class="vfb-stat-card">
                    <div class="vfb-stat-number vfb-stat-resolved"><?php echo esc_html( $resolved_count ); ?></div>
                    <div class="vfb-stat-label"><?php esc_html_e( 'Resolved', 'eye-for-ai' ); ?></div>
                </div>
            </div>

            <!-- Sessions List -->
            <?php if ( empty( $sessions ) ) : ?>
                <div class="vfb-empty-state">
                    <span class="dashicons dashicons-format-chat" style="font-size:48px;width:48px;height:48px;color:#ccc;"></span>
                    <h3><?php esc_html_e( 'No feedback yet', 'eye-for-ai' ); ?></h3>
                    <p><?php esc_html_e( 'User feedback will appear here once submitted.', 'eye-for-ai' ); ?></p>
                </div>
            <?php else : ?>
                <?php foreach ( $sessions as $session ) : ?>
                    <?php
                    $annotations = $wpdb->get_results(
                        $wpdb->prepare(
                            "SELECT * FROM {$annotations_table} WHERE session_id = %d ORDER BY created_at DESC",
                            $session->id
                        )
                    );
                    ?>
                    <div class="vfb-session-card" data-session-id="<?php echo esc_attr( $session->id ); ?>">
                        <div class="vfb-session-header" onclick="vfbToggleSession(this)">
                            <div class="vfb-session-info">
                                <span class="dashicons dashicons-arrow-right-alt2 vfb-chevron"></span>
                                <strong><?php echo esc_html( substr( $session->session_token, 0, 12 ) . '...' ); ?></strong>
                                <span class="vfb-badge-count"><?php echo esc_html( $session->annotation_count ); ?></span>
                            </div>
                            <div class="vfb-session-meta">
                                <?php echo esc_html( human_time_diff( strtotime( $session->last_active ), time() ) ); ?> ago
                                &middot; <?php echo esc_html( $session->ip_address ); ?>
                                &middot; <?php echo esc_html( substr( $session->user_agent ?? '', 0, 60 ) ); ?>
                            </div>
                        </div>
                        <div class="vfb-session-content" style="display:none;">
                            <?php foreach ( $annotations as $ann ) : ?>
                                <div class="vfb-annotation-item" id="vfb-ann-<?php echo esc_attr( $ann->id ); ?>">
                                    <div class="vfb-ann-row">
                                        <span class="vfb-ann-type vfb-type-<?php echo esc_attr( $ann->type ); ?>"><?php echo esc_html( $ann->type ); ?></span>
                                        <span class="vfb-status-badge vfb-status-<?php echo esc_attr( $ann->status ); ?>"><?php echo esc_html( ucfirst( str_replace( '_', ' ', $ann->status ) ) ); ?></span>
                                        <span class="vfb-ann-time"><?php echo esc_html( $ann->created_at ); ?></span>
                                        <a href="<?php echo esc_url( $ann->page_url ); ?>" target="_blank" class="vfb-ann-page" title="<?php echo esc_attr( $ann->page_url ); ?>"><?php echo esc_html( $ann->page_url ); ?></a>
                                    </div>
                                    <?php if ( ! empty( $ann->element_position ) ) :
                                        $pos = json_decode( $ann->element_position, true );
                                        if ( $pos ) : ?>
                                        <div class="vfb-ann-detail vfb-ann-position">
                                            <strong><?php esc_html_e( 'Position:', 'eye-for-ai' ); ?></strong>
                                            <?php if ( isset( $pos['rect'] ) ) : ?>
                                                top:<?php echo esc_html( $pos['rect']['top'] ); ?>px, left:<?php echo esc_html( $pos['rect']['left'] ); ?>px, <?php echo esc_html( $pos['rect']['width'] ); ?>&times;<?php echo esc_html( $pos['rect']['height'] ); ?>px
                                            <?php endif; ?>
                                            | viewport: <?php echo esc_html( ( $pos['viewportWidth'] ?? '?' ) . '&times;' . ( $pos['viewportHeight'] ?? '?' ) ); ?>
                                            | scroll: <?php echo esc_html( ( $pos['scrollX'] ?? 0 ) . ',' . ( $pos['scrollY'] ?? 0 ) ); ?>
                                        </div>
                                    <?php endif; endif; ?>

                                    <?php if ( $ann->type === 'element' ) : ?>
                                        <div class="vfb-ann-detail"><strong>Element:</strong> <?php echo esc_html( $ann->element_text ); ?></div>
                                        <div class="vfb-ann-detail"><strong>Selector:</strong> <code><?php echo esc_html( $ann->selector ); ?></code></div>
                                    <?php elseif ( $ann->type === 'text' ) : ?>
                                        <div class="vfb-ann-detail"><strong>Selected:</strong> "<?php echo esc_html( $ann->selected_text ); ?>"</div>
                                    <?php elseif ( $ann->type === 'screenshot' && ! empty( $ann->screenshot_path ) ) : ?>
                                        <?php
                                        $upload_dir = wp_upload_dir();
                                        $img_url = $upload_dir['baseurl'] . '/eye-for-ai/' . $ann->screenshot_path;
                                        ?>
                                        <div class="vfb-ann-detail"><img src="<?php echo esc_url( $img_url ); ?>" class="vfb-thumb" alt="Screenshot"></div>
                                    <?php endif; ?>

                                    <?php if ( ! empty( $ann->comment ) ) : ?>
                                        <div class="vfb-comment-box"><?php echo esc_html( $ann->comment ); ?></div>
                                    <?php endif; ?>

                                    <?php if ( ! empty( $ann->developer_response ) ) : ?>
                                        <div class="vfb-response-box"><?php echo esc_html( $ann->developer_response ); ?></div>
                                    <?php endif; ?>

                                    <div class="vfb-ann-actions">
                                        <select class="vfb-status-select" data-id="<?php echo esc_attr( $ann->id ); ?>">
                                            <option value="pending" <?php selected( $ann->status, 'pending' ); ?>>Pending</option>
                                            <option value="in_progress" <?php selected( $ann->status, 'in_progress' ); ?>>In Progress</option>
                                            <option value="resolved" <?php selected( $ann->status, 'resolved' ); ?>>Resolved</option>
                                            <option value="wontfix" <?php selected( $ann->status, 'wontfix' ); ?>>Won't Fix</option>
                                        </select>
                                        <input type="text" class="vfb-response-input" data-id="<?php echo esc_attr( $ann->id ); ?>"
                                               placeholder="<?php esc_attr_e( 'Developer response...', 'eye-for-ai' ); ?>"
                                               value="<?php echo esc_attr( $ann->developer_response ?? '' ); ?>">
                                        <button class="button vfb-save-response" data-id="<?php echo esc_attr( $ann->id ); ?>">
                                            <?php esc_html_e( 'Save', 'eye-for-ai' ); ?>
                                        </button>
                                        <button class="button vfb-delete-ann" data-id="<?php echo esc_attr( $ann->id ); ?>">
                                            <?php esc_html_e( 'Delete', 'eye-for-ai' ); ?>
                                        </button>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Render the settings page (Settings > Visual Feedback).
     */
    public static function render_settings() {
        $api_key = get_option( 'vfb_ai_api_key', '' );
        ?>
        <div class="wrap">
            <h1><?php esc_html_e( 'Visual Feedback Settings', 'eye-for-ai' ); ?></h1>

            <form method="post" action="options.php">
                <?php settings_fields( 'vfb_settings' ); ?>

                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e( 'Enable Visual Feedback', 'eye-for-ai' ); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="vfb_enabled" value="1" <?php checked( get_option( 'vfb_enabled', '1' ), '1' ); ?>>
                                <?php esc_html_e( 'Show feedback toolbar on frontend pages', 'eye-for-ai' ); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e( 'Session Expiry', 'eye-for-ai' ); ?></th>
                        <td>
                            <input type="number" name="vfb_session_expiry_hours" value="<?php echo esc_attr( get_option( 'vfb_session_expiry_hours', 72 ) ); ?>" min="1" max="720" class="small-text">
                            <?php esc_html_e( 'hours', 'eye-for-ai' ); ?>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e( 'Max Screenshot Size', 'eye-for-ai' ); ?></th>
                        <td>
                            <input type="number" name="vfb_screenshot_max_size" value="<?php echo esc_attr( get_option( 'vfb_screenshot_max_size', 2 ) ); ?>" min="1" max="10" class="small-text">
                            MB
                        </td>
                    </tr>
                </table>

                <h2><?php esc_html_e( 'AI API', 'eye-for-ai' ); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e( 'Enable AI API', 'eye-for-ai' ); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="vfb_ai_enabled" value="1" <?php checked( get_option( 'vfb_ai_enabled', '0' ), '1' ); ?>>
                                <?php esc_html_e( 'Allow external AI agents to access feedback via API', 'eye-for-ai' ); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e( 'API Key', 'eye-for-ai' ); ?></th>
                        <td>
                            <?php if ( $api_key ) : ?>
                                <code id="vfb-api-key-display"><?php echo esc_html( $api_key ); ?></code>
                                <button type="button" class="button" id="vfb-copy-api-key"><?php esc_html_e( 'Copy', 'eye-for-ai' ); ?></button>
                            <?php else : ?>
                                <em><?php esc_html_e( 'No API key generated yet.', 'eye-for-ai' ); ?></em>
                            <?php endif; ?>
                            <br>
                            <button type="button" class="button" id="vfb-generate-api-key" style="margin-top:8px;">
                                <?php echo $api_key ? esc_html__( 'Regenerate API Key', 'eye-for-ai' ) : esc_html__( 'Generate API Key', 'eye-for-ai' ); ?>
                            </button>
                            <p class="description">
                                <?php esc_html_e( 'Pass this key via the X-VFB-API-Key header. Alternatively, use WordPress Application Passwords.', 'eye-for-ai' ); ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    /**
     * AJAX: Generate API key.
     */
    public static function ajax_generate_api_key() {
        check_ajax_referer( 'wp_rest', 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Unauthorized' );
        }

        $key = wp_generate_password( 40, false );
        update_option( 'vfb_ai_api_key', $key );

        wp_send_json_success( array( 'key' => $key ) );
    }
}

// Register AJAX handler for API key generation
add_action( 'wp_ajax_vfb_generate_api_key', array( 'VFB_Admin', 'ajax_generate_api_key' ) );

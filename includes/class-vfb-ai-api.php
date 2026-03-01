<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class VFB_AI_API {

    const NAMESPACE = 'eye-for-ai/v1';

    /**
     * Register AI-specific REST routes.
     */
    public function register_routes() {

        // GET /ai/pending — get all pending annotations (AI consumption)
        register_rest_route( self::NAMESPACE, '/ai/pending', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( $this, 'get_pending' ),
            'permission_callback' => array( $this, 'check_ai_auth' ),
            'args'                => array(
                'status' => array(
                    'default'           => 'pending',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'limit' => array(
                    'default'           => 50,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ) );

        // PATCH /ai/batch — bulk update annotations
        register_rest_route( self::NAMESPACE, '/ai/batch', array(
            'methods'             => 'PATCH',
            'callback'            => array( $this, 'batch_update' ),
            'permission_callback' => array( $this, 'check_ai_auth' ),
        ) );
    }

    /**
     * Authenticate via API Key or WordPress Application Password.
     */
    public function check_ai_auth( $request ) {
        // Check if AI API is enabled
        if ( get_option( 'vfb_ai_enabled', '0' ) !== '1' ) {
            return new WP_Error(
                'ai_disabled',
                __( 'AI API is not enabled. Enable it in Settings > Visual Feedback.', 'eye-for-ai' ),
                array( 'status' => 403 )
            );
        }

        // Method 1: Custom API Key via X-VFB-API-Key header
        $api_key = $request->get_header( 'X-VFB-API-Key' );
        if ( $api_key ) {
            $stored_key = get_option( 'vfb_ai_api_key', '' );
            if ( ! empty( $stored_key ) && hash_equals( $stored_key, $api_key ) ) {
                return true;
            }
            return new WP_Error( 'invalid_api_key', __( 'Invalid API key.', 'eye-for-ai' ), array( 'status' => 401 ) );
        }

        // Method 2: WordPress Application Password (Basic Auth)
        // WP automatically authenticates via application passwords.
        // If the user is authenticated and has the right capability, allow.
        if ( is_user_logged_in() && current_user_can( get_option( 'vfb_capability', 'manage_options' ) ) ) {
            return true;
        }

        return new WP_Error(
            'auth_required',
            __( 'Authentication required. Use X-VFB-API-Key header or WordPress Application Password.', 'eye-for-ai' ),
            array( 'status' => 401 )
        );
    }

    /**
     * GET /ai/pending
     * Returns pending annotations with full context, optimized for AI consumption.
     */
    public function get_pending( $request ) {
        global $wpdb;

        $status = $request->get_param( 'status' );
        $limit  = min( (int) $request->get_param( 'limit' ), 200 );

        $allowed_statuses = array( 'pending', 'in_progress', 'resolved', 'wontfix' );
        if ( ! in_array( $status, $allowed_statuses, true ) ) {
            $status = 'pending';
        }

        $annotations_table = $wpdb->prefix . 'vfb_annotations';
        $sessions_table    = $wpdb->prefix . 'vfb_sessions';

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT a.*, s.ip_address, s.user_agent
                 FROM {$annotations_table} a
                 JOIN {$sessions_table} s ON a.session_id = s.id
                 WHERE a.status = %s
                 ORDER BY a.created_at ASC
                 LIMIT %d",
                $status,
                $limit
            )
        );

        $upload_dir = wp_upload_dir();
        $annotations = array();

        foreach ( $results as $row ) {
            $ann = array(
                'id'                 => (int) $row->id,
                'type'               => $row->type,
                'page_url'           => $row->page_url,
                'page_title'         => $row->page_title,
                'comment'            => $row->comment,
                'status'             => $row->status,
                'developer_response' => $row->developer_response,
                'created_at'         => $row->created_at,
                'updated_at'         => $row->updated_at,
                'session'            => array(
                    'ip'         => $row->ip_address,
                    'user_agent' => $row->user_agent,
                ),
            );

            // Type-specific fields
            if ( $row->type === 'element' ) {
                $ann['selector']     = $row->selector;
                $ann['element_text'] = $row->element_text;
            } elseif ( $row->type === 'text' ) {
                $ann['selector']      = $row->selector;
                $ann['selected_text'] = $row->selected_text;
                $ann['context']       = $row->context;
            } elseif ( $row->type === 'screenshot' && ! empty( $row->screenshot_path ) ) {
                $ann['screenshot_url'] = $upload_dir['baseurl'] . '/eye-for-ai/' . $row->screenshot_path;
            }

            // Element position data (JSON decoded for AI consumption)
            if ( ! empty( $row->element_position ) ) {
                $pos = json_decode( $row->element_position, true );
                if ( $pos ) {
                    $ann['element_position'] = $pos;
                }
            }

            $annotations[] = $ann;
        }

        return rest_ensure_response( array(
            'annotations' => $annotations,
            'total'       => count( $annotations ),
            'status'      => $status,
            'site_url'    => home_url(),
        ) );
    }

    /**
     * PATCH /ai/batch
     * Bulk update annotation status and developer_response.
     */
    public function batch_update( $request ) {
        global $wpdb;

        $body    = $request->get_json_params();
        $updates = $body['updates'] ?? array();

        if ( empty( $updates ) || ! is_array( $updates ) ) {
            return new WP_Error( 'invalid_input', __( 'updates array is required.', 'eye-for-ai' ), array( 'status' => 400 ) );
        }

        if ( count( $updates ) > 100 ) {
            return new WP_Error( 'too_many', __( 'Maximum 100 updates per batch.', 'eye-for-ai' ), array( 'status' => 400 ) );
        }

        $table   = $wpdb->prefix . 'vfb_annotations';
        $allowed = array( 'pending', 'in_progress', 'resolved', 'wontfix' );
        $results = array();

        foreach ( $updates as $item ) {
            $id = isset( $item['id'] ) ? (int) $item['id'] : 0;

            if ( ! $id ) {
                $results[] = array( 'id' => $id, 'success' => false, 'error' => 'Invalid ID' );
                continue;
            }

            $exists = $wpdb->get_var(
                $wpdb->prepare( "SELECT id FROM {$table} WHERE id = %d", $id )
            );

            if ( ! $exists ) {
                $results[] = array( 'id' => $id, 'success' => false, 'error' => 'Not found' );
                continue;
            }

            $update_data = array( 'updated_at' => current_time( 'mysql', true ) );
            $format      = array( '%s' );

            if ( isset( $item['status'] ) ) {
                $status = sanitize_text_field( $item['status'] );
                if ( in_array( $status, $allowed, true ) ) {
                    $update_data['status'] = $status;
                    $format[] = '%s';
                }
            }

            if ( isset( $item['developer_response'] ) ) {
                $update_data['developer_response'] = sanitize_textarea_field( $item['developer_response'] );
                $format[] = '%s';
            }

            $wpdb->update( $table, $update_data, array( 'id' => $id ), $format, array( '%d' ) );

            $results[] = array( 'id' => $id, 'success' => true );
        }

        return rest_ensure_response( array(
            'success' => true,
            'results' => $results,
            'updated' => count( array_filter( $results, function ( $r ) { return $r['success']; } ) ),
            'failed'  => count( array_filter( $results, function ( $r ) { return ! $r['success']; } ) ),
        ) );
    }
}

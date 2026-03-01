<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class EFA_REST_API {

    const NAMESPACE = 'eye-for-ai/v1';

    /**
     * Register all REST routes.
     */
    public function register_routes() {

        // POST /session — create or refresh session, returns nonce
        register_rest_route( self::NAMESPACE, '/session', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => array( $this, 'create_session' ),
            'permission_callback' => '__return_true',
        ) );

        // GET /annotations — load annotations for current session (or all with ?all=1 for admins)
        register_rest_route( self::NAMESPACE, '/annotations', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( $this, 'get_annotations' ),
            'permission_callback' => array( $this, 'check_nonce' ),
            'args'                => array(
                'page_url' => array(
                    'required'          => true,
                    'sanitize_callback' => 'esc_url_raw',
                ),
                'all' => array(
                    'default'           => '0',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
            ),
        ) );

        // POST /annotations — create or update annotation
        register_rest_route( self::NAMESPACE, '/annotations', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => array( $this, 'save_annotation' ),
            'permission_callback' => array( $this, 'check_nonce' ),
        ) );

        // DELETE /annotations/{id}
        register_rest_route( self::NAMESPACE, '/annotations/(?P<id>\d+)', array(
            'methods'             => WP_REST_Server::DELETABLE,
            'callback'            => array( $this, 'delete_annotation' ),
            'permission_callback' => array( $this, 'check_nonce' ),
            'args'                => array(
                'id' => array(
                    'validate_callback' => function ( $val ) {
                        return is_numeric( $val );
                    },
                ),
            ),
        ) );

        // PATCH /annotations/{id} — admin update (status / developer_response)
        register_rest_route( self::NAMESPACE, '/annotations/(?P<id>\d+)', array(
            'methods'             => 'PATCH',
            'callback'            => array( $this, 'update_annotation' ),
            'permission_callback' => array( $this, 'check_admin' ),
            'args'                => array(
                'id' => array(
                    'validate_callback' => function ( $val ) {
                        return is_numeric( $val );
                    },
                ),
            ),
        ) );

        // POST /screenshots — upload screenshot image
        register_rest_route( self::NAMESPACE, '/screenshots', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => array( $this, 'upload_screenshot' ),
            'permission_callback' => array( $this, 'check_nonce' ),
        ) );

        // GET /export — export markdown
        register_rest_route( self::NAMESPACE, '/export', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( $this, 'export_markdown' ),
            'permission_callback' => array( $this, 'check_nonce' ),
            'args'                => array(
                'page_url' => array(
                    'required'          => true,
                    'sanitize_callback' => 'esc_url_raw',
                ),
            ),
        ) );
    }

    // --------------------------------------------------
    // Permission callbacks
    // --------------------------------------------------

    /**
     * Verify WP nonce from X-WP-Nonce header.
     */
    public function check_nonce( $request ) {
        $nonce = $request->get_header( 'X-WP-Nonce' );

        if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
            return new WP_Error( 'rest_forbidden', __( 'Nonce verification failed.', 'eye-for-ai' ), array( 'status' => 401 ) );
        }

        return true;
    }

    /**
     * Require admin capability + nonce.
     */
    public function check_admin( $request ) {
        $nonce_check = $this->check_nonce( $request );

        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        if ( ! current_user_can( get_option( 'efa_capability', 'manage_options' ) ) ) {
            return new WP_Error( 'rest_forbidden', __( 'Admin access required.', 'eye-for-ai' ), array( 'status' => 403 ) );
        }

        return true;
    }

    // --------------------------------------------------
    // Endpoint handlers
    // --------------------------------------------------

    /**
     * POST /session
     */
    public function create_session( $request ) {
        $session = EFA_Session::get_current();

        if ( ! $session ) {
            $session = EFA_Session::create();
        }

        if ( ! $session ) {
            return new WP_Error( 'session_error', __( 'Failed to create session.', 'eye-for-ai' ), array( 'status' => 500 ) );
        }

        return rest_ensure_response( array(
            'success' => true,
            'token'   => $session->session_token,
            'nonce'   => wp_create_nonce( 'wp_rest' ),
        ) );
    }

    /**
     * GET /annotations
     */
    public function get_annotations( $request ) {
        global $wpdb;

        $page_url = $request->get_param( 'page_url' );
        $all = $request->get_param( 'all' ) === '1';

        $annotations_table = $wpdb->prefix . 'efa_annotations';
        $sessions_table = $wpdb->prefix . 'efa_sessions';

        if ( $all && current_user_can( get_option( 'efa_capability', 'manage_options' ) ) ) {
            // Admin: load all sessions' annotations for this page
            $results = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT a.*, s.session_token, s.ip_address, s.user_agent, s.last_active AS session_last_active
                     FROM {$annotations_table} a
                     JOIN {$sessions_table} s ON a.session_id = s.id
                     WHERE a.page_url = %s
                     ORDER BY a.created_at DESC",
                    $page_url
                )
            );
        } else {
            // Regular user: own session only
            $session = EFA_Session::get_current();

            if ( ! $session ) {
                return rest_ensure_response( array(
                    'success'     => true,
                    'annotations' => array(),
                ) );
            }

            $results = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM {$annotations_table} WHERE session_id = %d AND page_url = %s ORDER BY created_at ASC",
                    $session->id,
                    $page_url
                )
            );
        }

        $annotations = array_map( array( $this, 'format_annotation' ), $results );

        return rest_ensure_response( array(
            'success'     => true,
            'annotations' => $annotations,
            'page_url'    => $page_url,
        ) );
    }

    /**
     * POST /annotations
     */
    public function save_annotation( $request ) {
        global $wpdb;

        $session = EFA_Session::get_current();

        if ( ! $session ) {
            return new WP_Error( 'no_session', __( 'No active session.', 'eye-for-ai' ), array( 'status' => 400 ) );
        }

        $body = $request->get_json_params();

        $annotation_key = sanitize_text_field( $body['id'] ?? '' );
        $page_url       = esc_url_raw( $body['page_url'] ?? '' );
        $page_title     = sanitize_text_field( $body['page_title'] ?? '' );
        $type           = sanitize_text_field( $body['type'] ?? 'element' );
        $comment        = sanitize_textarea_field( $body['comment'] ?? '' );
        $selector       = sanitize_text_field( $body['selector'] ?? '' );
        $element_text   = sanitize_text_field( $body['element_text'] ?? '' );
        $selected_text  = sanitize_text_field( $body['selected_text'] ?? '' );
        $context        = sanitize_text_field( $body['context'] ?? '' );
        $screenshot_path  = sanitize_text_field( $body['screenshot_path'] ?? '' );
        $element_position = sanitize_text_field( $body['element_position'] ?? '' );
        $status           = sanitize_text_field( $body['status'] ?? 'pending' );

        if ( empty( $page_url ) || empty( $type ) ) {
            return new WP_Error( 'invalid_input', __( 'page_url and type are required.', 'eye-for-ai' ), array( 'status' => 400 ) );
        }

        if ( ! in_array( $type, array( 'element', 'text', 'screenshot' ), true ) ) {
            return new WP_Error( 'invalid_type', __( 'Invalid annotation type.', 'eye-for-ai' ), array( 'status' => 400 ) );
        }

        $table = $wpdb->prefix . 'efa_annotations';
        $now   = current_time( 'mysql', true );

        // Upsert: check if annotation_key exists for this session
        $existing = null;
        if ( $annotation_key ) {
            $existing = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT id FROM {$table} WHERE session_id = %d AND annotation_key = %s",
                    $session->id,
                    $annotation_key
                )
            );
        }

        $data = array(
            'session_id'       => $session->id,
            'annotation_key'   => $annotation_key,
            'page_url'         => $page_url,
            'page_title'       => $page_title,
            'type'             => $type,
            'comment'          => $comment,
            'selector'         => $selector,
            'element_text'     => $element_text,
            'selected_text'    => $selected_text,
            'context'          => $context,
            'screenshot_path'  => $screenshot_path,
            'element_position' => $element_position,
            'status'           => $status,
            'updated_at'       => $now,
        );

        $format = array( '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' );

        if ( $existing ) {
            $wpdb->update( $table, $data, array( 'id' => $existing->id ), $format, array( '%d' ) );
            $annotation_id = $existing->id;
        } else {
            $data['created_at'] = $now;
            $format[] = '%s';
            $wpdb->insert( $table, $data, $format );
            $annotation_id = $wpdb->insert_id;
        }

        return rest_ensure_response( array(
            'success' => true,
            'id'      => (int) $annotation_id,
            'message' => $existing ? 'Updated' : 'Created',
        ) );
    }

    /**
     * DELETE /annotations/{id}
     */
    public function delete_annotation( $request ) {
        global $wpdb;

        $id = (int) $request->get_param( 'id' );
        $table = $wpdb->prefix . 'efa_annotations';

        $annotation = $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id )
        );

        if ( ! $annotation ) {
            return new WP_Error( 'not_found', __( 'Annotation not found.', 'eye-for-ai' ), array( 'status' => 404 ) );
        }

        // Owner or admin can delete
        $session = EFA_Session::get_current();
        $is_admin = current_user_can( get_option( 'efa_capability', 'manage_options' ) );

        if ( ! $is_admin && ( ! $session || (int) $annotation->session_id !== (int) $session->id ) ) {
            return new WP_Error( 'forbidden', __( 'You can only delete your own annotations.', 'eye-for-ai' ), array( 'status' => 403 ) );
        }

        // Delete screenshot file if exists
        if ( ! empty( $annotation->screenshot_path ) ) {
            $upload_dir = wp_upload_dir();
            $file = $upload_dir['basedir'] . '/eye-for-ai/' . $annotation->screenshot_path;
            if ( file_exists( $file ) ) {
                unlink( $file );
            }
        }

        $wpdb->delete( $table, array( 'id' => $id ), array( '%d' ) );

        return rest_ensure_response( array(
            'success' => true,
            'message' => 'Deleted',
        ) );
    }

    /**
     * PATCH /annotations/{id} — admin only
     */
    public function update_annotation( $request ) {
        global $wpdb;

        $id = (int) $request->get_param( 'id' );
        $table = $wpdb->prefix . 'efa_annotations';

        $annotation = $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id )
        );

        if ( ! $annotation ) {
            return new WP_Error( 'not_found', __( 'Annotation not found.', 'eye-for-ai' ), array( 'status' => 404 ) );
        }

        $body = $request->get_json_params();
        $update = array( 'updated_at' => current_time( 'mysql', true ) );
        $format = array( '%s' );

        if ( isset( $body['status'] ) ) {
            $allowed = array( 'pending', 'in_progress', 'resolved', 'wontfix' );
            $status = sanitize_text_field( $body['status'] );
            if ( in_array( $status, $allowed, true ) ) {
                $update['status'] = $status;
                $format[] = '%s';
            }
        }

        if ( isset( $body['developer_response'] ) ) {
            $update['developer_response'] = sanitize_textarea_field( $body['developer_response'] );
            $format[] = '%s';
        }

        $wpdb->update( $table, $update, array( 'id' => $id ), $format, array( '%d' ) );

        return rest_ensure_response( array(
            'success' => true,
            'message' => 'Updated',
        ) );
    }

    /**
     * POST /screenshots
     */
    public function upload_screenshot( $request ) {
        $session = EFA_Session::get_current();

        if ( ! $session ) {
            return new WP_Error( 'no_session', __( 'No active session.', 'eye-for-ai' ), array( 'status' => 400 ) );
        }

        $body = $request->get_json_params();
        $image_data    = $body['image_data'] ?? '';
        $annotation_id = sanitize_text_field( $body['annotation_id'] ?? '' );

        if ( empty( $image_data ) || empty( $annotation_id ) ) {
            return new WP_Error( 'invalid_input', __( 'image_data and annotation_id are required.', 'eye-for-ai' ), array( 'status' => 400 ) );
        }

        // Validate and decode base64 image
        if ( ! preg_match( '/^data:image\/(png|jpe?g|gif|webp);base64,/', $image_data, $matches ) ) {
            return new WP_Error( 'invalid_format', __( 'Invalid image format.', 'eye-for-ai' ), array( 'status' => 400 ) );
        }

        $image_type = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];
        $raw = base64_decode( substr( $image_data, strpos( $image_data, ',' ) + 1 ) );

        if ( $raw === false ) {
            return new WP_Error( 'decode_error', __( 'Failed to decode image.', 'eye-for-ai' ), array( 'status' => 400 ) );
        }

        // Check file size
        $max_mb = (int) get_option( 'efa_screenshot_max_size', 2 );
        if ( strlen( $raw ) > $max_mb * 1024 * 1024 ) {
            return new WP_Error( 'too_large', sprintf( __( 'Image exceeds %dMB limit.', 'eye-for-ai' ), $max_mb ), array( 'status' => 413 ) );
        }

        $upload_dir = wp_upload_dir();
        $session_dir = $upload_dir['basedir'] . '/eye-for-ai/' . $session->session_token;

        if ( ! is_dir( $session_dir ) ) {
            wp_mkdir_p( $session_dir );
        }

        $filename = sanitize_file_name( $annotation_id . '.' . $image_type );
        $filepath = $session_dir . '/' . $filename;

        if ( file_put_contents( $filepath, $raw ) === false ) {
            return new WP_Error( 'write_error', __( 'Failed to save screenshot.', 'eye-for-ai' ), array( 'status' => 500 ) );
        }

        // Relative path stored in DB
        $relative_path = $session->session_token . '/' . $filename;

        // Full URL for frontend
        $access_url = $upload_dir['baseurl'] . '/eye-for-ai/' . $relative_path;

        return rest_ensure_response( array(
            'success'       => true,
            'relative_path' => $relative_path,
            'access_url'    => $access_url,
            'filename'      => $filename,
        ) );
    }

    /**
     * GET /export
     */
    public function export_markdown( $request ) {
        global $wpdb;

        $page_url = $request->get_param( 'page_url' );
        $session  = EFA_Session::get_current();

        if ( ! $session ) {
            return new WP_Error( 'no_session', __( 'No active session.', 'eye-for-ai' ), array( 'status' => 400 ) );
        }

        $annotations = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}efa_annotations WHERE session_id = %d AND page_url = %s ORDER BY created_at ASC",
                $session->id,
                $page_url
            )
        );

        $md = EFA_Export::generate( $annotations, $page_url );

        return rest_ensure_response( array(
            'success'  => true,
            'markdown' => $md,
        ) );
    }

    // --------------------------------------------------
    // Helpers
    // --------------------------------------------------

    /**
     * Format a DB row for JSON response.
     *
     * @param object $row Database row.
     * @return array
     */
    private function format_annotation( $row ) {
        $data = array(
            'id'                 => (int) $row->id,
            'annotation_key'     => $row->annotation_key,
            'page_url'           => $row->page_url,
            'page_title'         => $row->page_title,
            'type'               => $row->type,
            'comment'            => $row->comment,
            'selector'           => $row->selector,
            'element_text'       => $row->element_text,
            'selected_text'      => $row->selected_text,
            'context'            => $row->context,
            'screenshot_path'    => $row->screenshot_path,
            'element_position'   => $row->element_position ?? null,
            'status'             => $row->status,
            'developer_response' => $row->developer_response,
            'created_at'         => $row->created_at,
            'updated_at'         => $row->updated_at,
        );

        // Add screenshot URL if exists
        if ( ! empty( $row->screenshot_path ) ) {
            $upload_dir = wp_upload_dir();
            $data['screenshot_url'] = $upload_dir['baseurl'] . '/eye-for-ai/' . $row->screenshot_path;
        }

        // Add session info for admin views
        if ( isset( $row->session_token ) ) {
            $data['session'] = array(
                'token'       => $row->session_token,
                'ip_address'  => $row->ip_address ?? '',
                'user_agent'  => $row->user_agent ?? '',
                'last_active' => $row->session_last_active ?? '',
            );
        }

        return $data;
    }
}

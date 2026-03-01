<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class VFB_Session {

    const COOKIE_NAME = 'vfb_session';

    /**
     * Initialize session cookie on the init hook.
     * Must run before headers are sent.
     */
    public static function init_cookie() {
        if ( isset( $_COOKIE[ self::COOKIE_NAME ] ) ) {
            $token = sanitize_text_field( $_COOKIE[ self::COOKIE_NAME ] );
            $session = self::get_by_token( $token );

            if ( $session ) {
                self::touch( $session->id );
                return;
            }
        }

        // Create new session
        self::create();
    }

    /**
     * Create a new session and set cookie.
     *
     * @return object|null The session row or null on failure.
     */
    public static function create() {
        global $wpdb;

        $token = wp_generate_uuid4();
        $expiry_hours = (int) get_option( 'vfb_session_expiry_hours', 72 );
        $expires_at = gmdate( 'Y-m-d H:i:s', time() + $expiry_hours * HOUR_IN_SECONDS );
        $now = current_time( 'mysql', true );

        $wpdb->insert(
            $wpdb->prefix . 'vfb_sessions',
            array(
                'session_token' => $token,
                'user_id'       => get_current_user_id() ?: null,
                'user_agent'    => isset( $_SERVER['HTTP_USER_AGENT'] ) ? substr( sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ), 0, 512 ) : '',
                'ip_address'    => self::get_client_ip(),
                'created_at'    => $now,
                'last_active'   => $now,
                'expires_at'    => $expires_at,
            ),
            array( '%s', '%d', '%s', '%s', '%s', '%s', '%s' )
        );

        if ( ! $wpdb->insert_id ) {
            return null;
        }

        // Set cookie (secure if HTTPS, SameSite=Lax)
        $secure = is_ssl();
        setcookie( self::COOKIE_NAME, $token, array(
            'expires'  => time() + $expiry_hours * HOUR_IN_SECONDS,
            'path'     => COOKIEPATH,
            'domain'   => COOKIE_DOMAIN,
            'secure'   => $secure,
            'httponly'  => false, // JS needs access for nonce refresh
            'samesite' => 'Lax',
        ) );

        // Also set for current request
        $_COOKIE[ self::COOKIE_NAME ] = $token;

        return self::get_by_token( $token );
    }

    /**
     * Get session by token.
     *
     * @param string $token Session token.
     * @return object|null
     */
    public static function get_by_token( $token ) {
        global $wpdb;

        if ( empty( $token ) ) {
            return null;
        }

        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}vfb_sessions WHERE session_token = %s AND expires_at > %s",
                $token,
                current_time( 'mysql', true )
            )
        );
    }

    /**
     * Get the current session from cookie.
     *
     * @return object|null
     */
    public static function get_current() {
        $token = isset( $_COOKIE[ self::COOKIE_NAME ] ) ? sanitize_text_field( $_COOKIE[ self::COOKIE_NAME ] ) : '';
        return self::get_by_token( $token );
    }

    /**
     * Update last_active timestamp.
     *
     * @param int $session_id Session row ID.
     */
    public static function touch( $session_id ) {
        global $wpdb;

        $wpdb->update(
            $wpdb->prefix . 'vfb_sessions',
            array( 'last_active' => current_time( 'mysql', true ) ),
            array( 'id' => $session_id ),
            array( '%s' ),
            array( '%d' )
        );
    }

    /**
     * Cleanup expired sessions and their annotations/screenshots.
     * Scheduled via WP Cron (daily).
     */
    public static function cleanup_expired() {
        global $wpdb;

        $now = current_time( 'mysql', true );
        $sessions_table = $wpdb->prefix . 'vfb_sessions';
        $annotations_table = $wpdb->prefix . 'vfb_annotations';

        // Get expired sessions
        $expired = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT id, session_token FROM {$sessions_table} WHERE expires_at < %s",
                $now
            )
        );

        if ( empty( $expired ) ) {
            return;
        }

        $upload_dir = wp_upload_dir();
        $vfb_base = $upload_dir['basedir'] . '/eye-for-ai';

        foreach ( $expired as $session ) {
            // Delete screenshots directory
            $session_dir = $vfb_base . '/' . $session->session_token;
            if ( is_dir( $session_dir ) ) {
                self::delete_directory( $session_dir );
            }

            // Delete annotations
            $wpdb->delete( $annotations_table, array( 'session_id' => $session->id ), array( '%d' ) );

            // Delete session
            $wpdb->delete( $sessions_table, array( 'id' => $session->id ), array( '%d' ) );
        }
    }

    /**
     * Get client IP address.
     *
     * @return string
     */
    private static function get_client_ip() {
        $ip = '';

        if ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
            $ips = explode( ',', sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) );
            $ip = trim( $ips[0] );
        } elseif ( ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
            $ip = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
        }

        return substr( $ip, 0, 45 );
    }

    /**
     * Recursively delete a directory.
     *
     * @param string $dir Directory path.
     */
    private static function delete_directory( $dir ) {
        if ( ! is_dir( $dir ) ) {
            return;
        }

        $items = array_diff( scandir( $dir ), array( '.', '..' ) );

        foreach ( $items as $item ) {
            $path = $dir . '/' . $item;
            if ( is_dir( $path ) ) {
                self::delete_directory( $path );
            } else {
                unlink( $path );
            }
        }

        rmdir( $dir );
    }
}

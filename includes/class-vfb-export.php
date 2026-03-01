<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class VFB_Export {

    /**
     * Generate Markdown report from annotations.
     *
     * @param array  $annotations Array of DB row objects.
     * @param string $page_url    The page URL.
     * @return string Markdown content.
     */
    public static function generate( $annotations, $page_url ) {
        $page_title = '';
        if ( ! empty( $annotations ) ) {
            $page_title = $annotations[0]->page_title ?? '';
        }

        $md  = "# Visual Feedback Report\n\n";
        $md .= '**Page**: ' . ( $page_title ?: $page_url ) . "\n";
        $md .= '**URL**: ' . $page_url . "\n";
        $md .= '**Date**: ' . current_time( 'Y-m-d H:i' ) . "\n";
        $md .= '**Site**: ' . home_url() . "\n\n";
        $md .= "---\n\n";

        if ( empty( $annotations ) ) {
            $md .= "*No annotations*\n";
            return $md;
        }

        $index = 1;
        $upload_dir = wp_upload_dir();

        foreach ( $annotations as $ann ) {
            $type = $ann->type ?? 'element';

            switch ( $type ) {
                case 'element':
                    $md .= "## #{$index} Element Annotation\n";
                    $md .= '- **Selector**: `' . ( $ann->selector ?? '' ) . "`\n";
                    if ( ! empty( $ann->element_text ) ) {
                        $md .= '- **Element Text**: "' . $ann->element_text . "\"\n";
                    }
                    break;

                case 'text':
                    $md .= "## #{$index} Text Annotation\n";
                    $md .= '- **Selected Text**: "' . ( $ann->selected_text ?? '' ) . "\"\n";
                    if ( ! empty( $ann->context ) ) {
                        $md .= '- **Context**: "' . $ann->context . "\"\n";
                    }
                    break;

                case 'screenshot':
                    $md .= "## #{$index} Screenshot Annotation\n";
                    if ( ! empty( $ann->screenshot_path ) ) {
                        $url = $upload_dir['baseurl'] . '/eye-for-ai/' . $ann->screenshot_path;
                        $md .= '- **Image**: [View Screenshot](' . $url . ")\n";
                    }
                    break;
            }

            $md .= '- **Page URL**: ' . ( $ann->page_url ?? $page_url ) . "\n";
            $md .= '- **Comment**: ' . ( $ann->comment ?? '' ) . "\n";
            $md .= '- **Status**: ' . ( $ann->status ?? 'pending' ) . "\n";

            if ( ! empty( $ann->element_position ) ) {
                $pos = is_string( $ann->element_position ) ? json_decode( $ann->element_position, true ) : (array) $ann->element_position;
                if ( $pos && isset( $pos['rect'] ) ) {
                    $md .= '- **Position**: top:' . $pos['rect']['top'] . 'px, left:' . $pos['rect']['left'] . 'px, ' . $pos['rect']['width'] . 'x' . $pos['rect']['height'] . "px\n";
                    $md .= '- **Viewport**: ' . ( $pos['viewportWidth'] ?? '?' ) . 'x' . ( $pos['viewportHeight'] ?? '?' ) . ', scroll:(' . ( $pos['scrollX'] ?? 0 ) . ',' . ( $pos['scrollY'] ?? 0 ) . ")\n";
                }
            }

            if ( ! empty( $ann->developer_response ) ) {
                $md .= '- **Developer Response**: ' . $ann->developer_response . "\n";
            }

            $md .= '- **Created**: ' . ( $ann->created_at ?? '' ) . "\n\n";
            $index++;
        }

        return $md;
    }
}

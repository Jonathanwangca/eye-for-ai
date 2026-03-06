/**
 * Eye for AI - Portable Loader
 * Version: 2.0
 *
 * Usage:
 *
 * 1. Include this loader in your HTML:
 *    <script src="path/to/efa-loader.js"></script>
 *
 * 2. Initialize with configuration:
 *    EFALoader.init({
 *        basePath: '/your-app/efa',                // Path to EFA files
 *        apiPath: '/your-app/efa/api/feedback.php', // Path to API
 *        enabled: true,                             // Enable/disable
 *        debug: false                               // Debug logging
 *    });
 */

(function() {
    'use strict';

    const EFALoader = {
        version: '2.0',
        loaded: false,
        config: {
            basePath: '',
            apiPath: '',
            enabled: true,
            debug: false,
            autoLoad: true,
            userId: ''
        },

        /**
         * Initialize EFA Loader.
         * Sets window.EFAConfig BEFORE loading efa.js so the unified
         * script picks up standalone configuration on first run.
         */
        init: function(options) {
            Object.assign(this.config, options);

            if (!this.config.basePath) {
                console.error('[EFA] basePath is required');
                return;
            }
            if (!this.config.apiPath) {
                this.config.apiPath = this.config.basePath.replace(/\/$/, '') + '/api/feedback.php';
            }

            if (!this.config.enabled) {
                console.log('[EFA] Eye for AI is disabled');
                return;
            }

            // Set EFAConfig BEFORE loading efa.js
            window.EFAConfig = {
                apiBase: this.config.apiPath,
                apiMode: 'standalone',
                nonce: '',
                isAdmin: false,
                debug: !!this.config.debug,
                version: this.version,
                userId: this.config.userId || '',
                i18n: {
                    feedback: 'Feedback',
                    element: 'Element',
                    text: 'Text',
                    screenshot: 'Screenshot',
                    list: 'List',
                    save: 'Save',
                    close: 'Close',
                    devMode: 'Dev Mode',
                    addComment: 'Add your feedback',
                    commentLabel: 'Comment',
                    cancel: 'Cancel',
                    submit: 'Submit',
                    delete: 'Delete',
                    pending: 'Pending',
                    inProgress: 'In Progress',
                    resolved: 'Resolved',
                    saved: 'Feedback saved',
                    deleted: 'Annotation deleted',
                    error: 'An error occurred',
                    noAnnotations: 'No annotations yet',
                    clickElement: 'Click an element to annotate',
                    selectText: 'Select text to annotate',
                    drawRegion: 'Draw a region to capture',
                    exportMd: 'Export Markdown',
                    type: 'Type',
                    selector: 'Selector',
                    elementText: 'Element Text',
                    selectedText: 'Selected Text',
                    context: 'Context',
                    devResponse: 'Developer Response',
                    locate: 'Locate',
                    viewScreenshot: 'View Screenshot'
                }
            };

            if (this.config.autoLoad) {
                this.load();
            }

            if (this.config.debug) {
                console.log('[EFA] Loader initialized', this.config);
            }
        },

        /**
         * Load EFA resources
         */
        load: function() {
            if (this.loaded) return;

            const basePath = this.config.basePath.replace(/\/$/, '');

            // Load CSS
            this.loadCSS(basePath + '/efa.css');

            // Load html2canvas (bundled locally)
            this.loadScript(basePath + '/vendor/html2canvas.min.js', () => {
                // Load EFA Screenshot
                this.loadScript(basePath + '/efa-screenshot.js', () => {
                    // Load main EFA
                    this.loadScript(basePath + '/efa.js', () => {
                        this.loaded = true;
                        if (this.config.debug) {
                            console.log('[EFA] All resources loaded');
                        }
                    });
                });
            });
        },

        /**
         * Load CSS file
         */
        loadCSS: function(href) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href + '?v=' + this.version;
            document.head.appendChild(link);
        },

        /**
         * Load JavaScript file
         */
        loadScript: function(src, callback) {
            const script = document.createElement('script');
            script.src = src + (src.includes('?') ? '&' : '?') + 'v=' + this.version;
            script.onload = callback;
            script.onerror = () => console.error('[EFA] Failed to load:', src);
            document.head.appendChild(script);
        },

        /**
         * Manually show EFA toolbar
         */
        show: function() {
            if (typeof window.EFA !== 'undefined' && window.EFA.elements.toolbar) {
                window.EFA.elements.toolbar.style.display = 'block';
            }
        },

        /**
         * Hide EFA toolbar
         */
        hide: function() {
            if (typeof window.EFA !== 'undefined' && window.EFA.elements.toolbar) {
                window.EFA.elements.toolbar.style.display = 'none';
            }
        }
    };

    // Expose to global
    window.EFALoader = EFALoader;

    // Auto-init if data attributes present
    document.addEventListener('DOMContentLoaded', function() {
        const script = document.querySelector('script[data-efa-base]');
        if (script) {
            EFALoader.init({
                basePath: script.dataset.efaBase,
                apiPath: script.dataset.efaApi || (script.dataset.efaBase + '/api/feedback.php'),
                enabled: script.dataset.efaEnabled !== 'false',
                debug: script.dataset.efaDebug === 'true'
            });
        }
    });

})();

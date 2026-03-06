/**
 * Eye for AI Tool
 * 视觉反馈工具
 * Version: 1.5
 */

(function() {
    'use strict';

    // ========================================
    // Configuration from WordPress - 配置
    // ========================================
    const cfg = window.EFAConfig || {};

    const EFA = {
        version: cfg.version || '1.0.0',
        apiBase: cfg.apiBase || '/wp-json/eye-for-ai/v1',
        apiMode: cfg.apiMode || 'rest',
        nonce: cfg.nonce || '',
        userId: cfg.userId || '',
        isActive: false,
        isDevMode: !!cfg.isAdmin,
        debug: !!cfg.debug,
        i18n: cfg.i18n || {},
        currentTool: null, // 'element', 'text', 'screenshot'
        annotations: [],
        elements: {
            toolbar: null,
            overlay: null,
            highlight: null
        }
    };

    // ========================================
    // Icons - 图标
    // ========================================
    const Icons = {
        logo: '<img src="data:image/png;base64,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" alt="EFA" class="efa-logo-icon">',
        element: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>',
        text: '<svg viewBox="0 0 24 24"><path d="M5 4v3h5.5v12h3V7H19V4H5z"/></svg>',
        screenshot: '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
        copy: '<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
        close: '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
        delete: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
        clear: '<svg viewBox="0 0 24 24"><path d="M5 13h14v-2H5v2zm-2 4h14v-2H3v2zM7 7v2h14V7H7z"/></svg>',
        undo: '<svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>',
        check: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
        save: '<svg viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',
        list: '<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>',
        locate: '<svg viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>',
        dev: '<svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>'
    };

    // ========================================
    // Utility Functions - 工具函数
    // ========================================

    /**
     * Generate unique ID
     */
    function generateId() {
        return 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get CSS selector for element
     */
    function getSelector(el) {
        if (!el || el === document.body) return 'body';

        const parts = [];
        while (el && el !== document.body) {
            let selector = el.tagName.toLowerCase();

            // Use getAttribute to avoid form input shadowing issues
            // (e.g., <input name="id"> shadows form.id property)
            const elId = el.getAttribute && el.getAttribute('id');
            if (elId && typeof elId === 'string' && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(elId)) {
                selector += '#' + elId;
                parts.unshift(selector);
                break;
            }

            // Use getAttribute for className too to avoid similar issues
            const className = el.getAttribute && el.getAttribute('class');
            if (className && typeof className === 'string') {
                const classes = className.trim().split(/\s+/).filter(c => !c.startsWith('efa-') && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(c));
                if (classes.length) {
                    selector += '.' + classes.slice(0, 2).join('.');
                }
            }

            // Add nth-of-type if needed (use nth-of-type instead of nth-child
            // because we count same-tag siblings, not all children)
            const parent = el.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(el) + 1;
                    selector += ':nth-of-type(' + index + ')';
                }
            }

            parts.unshift(selector);
            el = parent;
        }

        return parts.join(' > ');
    }

    /**
     * Get element text content (truncated)
     */
    function getElementText(el, maxLength = 50) {
        const text = el.innerText || el.textContent || '';
        const cleaned = text.trim().replace(/\s+/g, ' ');
        return cleaned.length > maxLength ? cleaned.substr(0, maxLength) + '...' : cleaned;
    }

    /**
     * Show toast message
     */
    function showToast(message, type = 'default') {
        const existing = document.querySelector('.efa-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'efa-toast ' + type;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    /**
     * Copy text to clipboard
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const result = document.execCommand('copy');
            document.body.removeChild(textarea);
            return result;
        }
    }

    // ========================================
    // API Functions - API 函数
    // ========================================

    /**
     * Unified API request helper.
     * Supports two modes via EFA.apiMode:
     *   'rest'       — WordPress REST API (default)
     *   'standalone' — Plain PHP with ?action= params
     *
     * @param {string} endpoint - REST-style path (e.g. '/annotations', '/annotations/42')
     * @param {object|null} data - Body or query params
     * @param {string} method - HTTP method
     */
    async function apiRequest(endpoint, data = null, method = 'GET') {
        const apiMode = EFA.apiMode || 'rest';

        let url, options;

        if (apiMode === 'standalone') {
            // Standalone mode: map REST endpoints to ?action= params
            const ACTIONS = {
                'POST /session':       'init_session',
                'GET /annotations':    'load',
                'POST /annotations':   'save_one',
                'DELETE /annotations/': 'delete',
                'PATCH /annotations/': 'dev_update',
                'POST /screenshots':   'upload_screenshot',
                'GET /export':         'export_md'
            };

            // Build action key: strip trailing numeric ID for matching
            const cleanEndpoint = endpoint.replace(/\/\d+$/, '/');
            const actionKey = method + ' ' + cleanEndpoint;
            const action = ACTIONS[actionKey] || ACTIONS[method + ' ' + endpoint] || 'load';

            url = EFA.apiBase.replace(/\/$/, '') + '?action=' + action;

            // For DELETE/PATCH with ID, add it as a param
            const idMatch = endpoint.match(/\/(\d+)$/);
            if (idMatch) {
                url += '&id=' + idMatch[1];
            }

            options = {
                method: (method === 'GET' || method === 'DELETE') ? method : 'POST',
                credentials: 'same-origin',
                headers: {}
            };

            // Send usr_login with every request
            if (EFA.userId) {
                options.headers['X-EFA-User'] = EFA.userId;
            }

            if (method === 'GET' && data) {
                const params = new URLSearchParams();
                Object.keys(data).forEach(key => params.set(key, data[key]));
                url += '&' + params.toString();
            } else if (data) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        } else {
            // WordPress REST API mode
            url = EFA.apiBase.replace(/\/$/, '') + endpoint;

            options = {
                method: method,
                headers: {
                    'X-WP-Nonce': EFA.nonce
                },
                credentials: 'same-origin'
            };

            if (method === 'GET' && data) {
                const params = new URLSearchParams();
                Object.keys(data).forEach(key => params.set(key, data[key]));
                url += '?' + params.toString();
            } else if (data && (method === 'POST' || method === 'PATCH' || method === 'DELETE')) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        }

        if (EFA.debug) {
            console.log('[EFA Debug] apiRequest:', { endpoint, url, method, apiMode, data });
        }

        try {
            let response = await fetch(url, options);

            // Nonce expired — refresh and retry once (REST mode only)
            if (apiMode === 'rest' && (response.status === 401 || response.status === 403)) {
                const refreshed = await refreshNonce();
                if (refreshed) {
                    options.headers['X-WP-Nonce'] = EFA.nonce;
                    response = await fetch(url, options);
                }
            }

            const result = await response.json();

            if (EFA.debug) {
                console.log('[EFA Debug] apiResponse:', { endpoint, status: response.status, result });
            }

            return result;
        } catch (error) {
            console.error('EFA API Error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Refresh nonce by calling POST /session
     */
    async function refreshNonce() {
        try {
            const resp = await fetch(EFA.apiBase.replace(/\/$/, '') + '/session', {
                method: 'POST',
                credentials: 'same-origin'
            });
            const data = await resp.json();
            if (data.success && data.nonce) {
                EFA.nonce = data.nonce;
                return true;
            }
        } catch (e) {
            console.error('[EFA] Nonce refresh failed:', e);
        }
        return false;
    }

    async function loadAnnotations() {
        const params = { page_url: window.location.href };
        if (EFA.isDevMode) {
            params.all = '1';
        }

        const result = await apiRequest('/annotations', params);

        if (result.success) {
            EFA.annotations = (result.annotations || []).map(a => {
                // Map DB fields to frontend format
                a.id = a.annotation_key || String(a.id);
                a._db_id = a.id; // Keep DB id for API calls
                if (typeof a.annotation_key !== 'undefined' && a.annotation_key) {
                    a.id = a.annotation_key;
                }
                a._db_id = result.annotations ? a._db_id : a.id;
                a.timestamp = a.created_at;
                return a;
            });

            // Re-map: use original response to get _db_id
            EFA.annotations = (result.annotations || []).map(a => {
                // Parse element_position from JSON string
                if (a.element_position && typeof a.element_position === 'string') {
                    try { a.element_position = JSON.parse(a.element_position); } catch (e) { /* ignore */ }
                }
                return {
                    ...a,
                    _db_id: a.id, // DB primary key
                    id: a.annotation_key || String(a.id), // Frontend ID
                    timestamp: a.created_at
                };
            });

            renderAnnotationList();
            renderPageMarkers();

            if (EFA.isDevMode && result.annotations) {
                showToast(`Dev Mode: ${result.annotations.length} annotations`, 'default');
            }
        }
    }

    /**
     * Save a single annotation via POST /annotations.
     * @param {object} annotation - The annotation to save.
     * @param {boolean} silent - Suppress toast messages.
     */
    async function saveAnnotation(annotation, silent = false) {
        const payload = {
            ...annotation,
            id: annotation.id, // annotation_key
            page_url: window.location.href,
            page_title: document.title
        };

        // Serialize position object to JSON string for storage
        if (payload.element_position && typeof payload.element_position === 'object') {
            payload.element_position = JSON.stringify(payload.element_position);
        }

        const result = await apiRequest('/annotations', payload, 'POST');

        if (result.success && result.id) {
            annotation._db_id = result.id;
        }

        if (!silent) {
            if (result.success) {
                showToast(EFA.i18n.saved || 'Saved', 'success');
            } else {
                showToast(EFA.i18n.error || 'Save failed', 'error');
            }
        }
        return result;
    }

    // Keep saveAnnotations as a compat wrapper for the auto-save call
    async function saveAnnotations(silent = false) {
        // No-op: individual saves handled by saveAnnotation
        return { success: true };
    }

    async function deleteAnnotation(annotationId) {
        const ann = EFA.annotations.find(a => a.id === annotationId);
        const dbId = ann ? (ann._db_id || ann.id) : annotationId;

        if (EFA.debug) {
            console.log('[EFA Debug] deleteAnnotation:', { annotationId, dbId });
        }

        const result = await apiRequest('/annotations/' + dbId, null, 'DELETE');

        if (result.success) {
            EFA.annotations = EFA.annotations.filter(a => a.id !== annotationId);
            renderAnnotationList();
            renderPageMarkers();
            showToast(EFA.i18n.deleted || 'Deleted', 'success');
        } else {
            showToast(result.message || EFA.i18n.error || 'Delete failed', 'error');
        }
    }

    async function exportMarkdown() {
        try {
            // 首先检查是否有标注数据
            if (!EFA.annotations || EFA.annotations.length === 0) {
                showToast('No annotations to export / 没有标注可导出', 'warning');
                return;
            }

            const result = await apiRequest('/export', { page_url: window.location.href });

            if (result.success && result.markdown) {
                const success = await copyToClipboard(result.markdown);
                if (success) {
                    showToast('Copied to clipboard / 已复制', 'success');
                } else {
                    // 如果剪贴板失败，尝试显示内容供用户手动复制
                    showMarkdownModal(result.markdown);
                }
            } else {
                const errorMsg = result.message || 'Export failed / 导出失败';
                showToast(errorMsg, 'error');
                console.error('EFA Export MD Error:', result);
            }
        } catch (error) {
            console.error('EFA Export Error:', error);
            showToast('Export error / 导出出错', 'error');
        }
    }

    // 显示 Markdown 内容的模态框（剪贴板失败时的备用方案）
    function showMarkdownModal(markdown) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'efa-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="efa-modal" style="max-width: 600px;">
                <div class="efa-modal-header">
                    <div class="efa-modal-title">📋 Markdown Content</div>
                    <button class="efa-modal-close">&times;</button>
                </div>
                <div class="efa-modal-body">
                    <p style="margin-bottom:8px;color:#666;font-size:12px;">
                        Clipboard access denied. Please copy manually:<br>
                        剪贴板访问被拒绝，请手动复制：
                    </p>
                    <textarea class="efa-md-textarea" readonly style="width:100%;height:300px;font-family:monospace;font-size:12px;padding:10px;border:1px solid #ddd;border-radius:4px;resize:vertical;">${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                </div>
                <div class="efa-modal-footer">
                    <button class="efa-btn efa-btn-primary efa-copy-btn">Select All & Copy</button>
                    <button class="efa-btn efa-close-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        const textarea = modalOverlay.querySelector('.efa-md-textarea');
        const copyBtn = modalOverlay.querySelector('.efa-copy-btn');
        const closeBtn = modalOverlay.querySelector('.efa-close-btn');
        const closeX = modalOverlay.querySelector('.efa-modal-close');

        copyBtn.addEventListener('click', () => {
            textarea.select();
            document.execCommand('copy');
            showToast('Copied / 已复制', 'success');
            modalOverlay.remove();
        });

        closeBtn.addEventListener('click', () => modalOverlay.remove());
        closeX.addEventListener('click', () => modalOverlay.remove());
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.remove();
        });

        // 自动选中文本
        setTimeout(() => textarea.select(), 100);
    }

    async function uploadScreenshot(imageData, annotationId) {
        if (EFA.debug) {
            console.log('[EFA Debug] uploadScreenshot:', {
                annotationId,
                dataLength: imageData ? imageData.length : 0,
                dataPrefix: imageData ? imageData.substring(0, 30) : ''
            });
        }
        const result = await apiRequest('/screenshots', {
            image_data: imageData,
            annotation_id: annotationId
        }, 'POST');
        if (!result.success && EFA.debug) {
            console.error('[EFA Debug] uploadScreenshot failed:', result);
        }
        return result;
    }

    // ========================================
    // Developer Mode Functions - 开发者模式函数
    // ========================================

    /**
     * Toggle developer mode.
     * In WP version, dev mode is based on capability — no password needed.
     */
    function toggleDevMode() {
        if (!cfg.isAdmin) {
            showToast('Admin access required', 'error');
            return;
        }

        if (EFA.isDevMode) {
            exitDevMode();
        } else {
            enterDevMode();
        }
    }

    /**
     * Enter developer mode
     */
    function enterDevMode() {
        EFA.isDevMode = true;

        // Update UI
        const devBtn = document.getElementById('efa-dev');
        if (devBtn) {
            devBtn.classList.add('active');
            devBtn.setAttribute('data-tooltip', 'Exit Dev Mode');
        }

        // Add dev mode indicator to toolbar
        const toolbar = EFA.elements.toolbar;
        if (toolbar) {
            toolbar.classList.add('efa-dev-mode');
        }

        // Reload annotations (will load all from all sessions)
        loadAnnotations();

        showToast('Developer Mode ON', 'success');
    }

    /**
     * Exit developer mode
     */
    function exitDevMode() {
        EFA.isDevMode = false;

        // Update UI
        const devBtn = document.getElementById('efa-dev');
        if (devBtn) {
            devBtn.classList.remove('active');
            devBtn.setAttribute('data-tooltip', 'Dev Mode');
        }

        // Remove dev mode indicator
        const toolbar = EFA.elements.toolbar;
        if (toolbar) {
            toolbar.classList.remove('efa-dev-mode');
        }

        // Reload annotations (will load only current session)
        loadAnnotations();

        showToast('Developer Mode OFF', 'default');
    }

    /**
     * Update annotation status (dev mode)
     */
    async function updateAnnotationStatus(ann, newStatus) {
        if (!EFA.isDevMode) return false;

        const dbId = ann._db_id || ann.id;
        const result = await apiRequest('/annotations/' + dbId, { status: newStatus }, 'PATCH');

        if (result.success) {
            ann.status = newStatus;
            showToast('Status updated', 'success');
            renderAnnotationList();
            return true;
        } else {
            showToast('Update failed', 'error');
            return false;
        }
    }

    async function addDevResponse(ann, response) {
        if (!EFA.isDevMode) return false;

        const dbId = ann._db_id || ann.id;
        const result = await apiRequest('/annotations/' + dbId, { developer_response: response }, 'PATCH');

        if (result.success) {
            ann.developer_response = response;
            ann.responded_at = new Date().toISOString();
            showToast('Response saved', 'success');
            return true;
        } else {
            showToast('Save failed', 'error');
            return false;
        }
    }

    // ========================================
    // UI Functions - 界面函数
    // ========================================

    /**
     * Create toolbar HTML
     */
    function createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'efa-toolbar';
        toolbar.innerHTML = `
            <div class="efa-toolbar-collapsed" id="efa-toggle">
                ${Icons.logo}
            </div>
            <div class="efa-toolbar-expanded" style="display: none;">
                <button class="efa-tool-btn" data-tool="element" data-tooltip="Element">
                    ${Icons.element}
                </button>
                <button class="efa-tool-btn" data-tool="text" data-tooltip="Text">
                    ${Icons.text}
                </button>
                <button class="efa-tool-btn" data-tool="screenshot" data-tooltip="Screenshot">
                    ${Icons.screenshot}
                </button>
                <div class="efa-divider"></div>
                <button class="efa-tool-btn" id="efa-list" data-tooltip="List">
                    ${Icons.list}
                    <span class="efa-list-count"></span>
                </button>
                <button class="efa-tool-btn" id="efa-copy" data-tooltip="Copy MD">
                    ${Icons.copy}
                </button>
                ${cfg.isAdmin ? `<button class="efa-tool-btn" id="efa-dev" data-tooltip="Dev Mode">
                    ${Icons.dev}
                </button>` : ''}
                <div class="efa-divider"></div>
                <button class="efa-tool-btn efa-btn-close" id="efa-collapse" data-tooltip="Close">
                    ${Icons.close}
                </button>
            </div>
            <div class="efa-list-panel" id="efa-list-panel" style="display: none;"></div>
        `;

        document.body.appendChild(toolbar);
        EFA.elements.toolbar = toolbar;

        // Bind events
        toolbar.querySelector('#efa-toggle').addEventListener('click', expandToolbar);
        toolbar.querySelector('#efa-collapse').addEventListener('click', collapseToolbar);
        toolbar.querySelector('#efa-copy').addEventListener('click', exportMarkdown);
        toolbar.querySelector('#efa-list').addEventListener('click', toggleListPanel);
        const devBtn = toolbar.querySelector('#efa-dev');
        if (devBtn) devBtn.addEventListener('click', toggleDevMode);

        // Tool buttons
        toolbar.querySelectorAll('.efa-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                if (EFA.currentTool === tool) {
                    deactivateTool();
                } else {
                    activateTool(tool);
                }
            });
        });

        // Draggable removed - horizontal toolbar doesn't need it
    }

    /**
     * Expand toolbar
     */
    function expandToolbar() {
        const toolbar = EFA.elements.toolbar;
        toolbar.querySelector('.efa-toolbar-collapsed').style.display = 'none';
        toolbar.querySelector('.efa-toolbar-expanded').style.display = 'flex';
    }

    /**
     * Collapse toolbar
     */
    function collapseToolbar() {
        const toolbar = EFA.elements.toolbar;
        toolbar.querySelector('.efa-toolbar-expanded').style.display = 'none';
        toolbar.querySelector('.efa-toolbar-collapsed').style.display = 'flex';
        // Close list panel
        const panel = document.getElementById('efa-list-panel');
        if (panel) panel.style.display = 'none';
        const listBtn = document.getElementById('efa-list');
        if (listBtn) listBtn.classList.remove('active');
        deactivateTool();
    }

    /**
     * Make element draggable
     */
    function makeDraggable(element, handle) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.left = (initialX + dx) + 'px';
            element.style.top = (initialY + dy) + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    /**
     * Render annotation list (updates markers and list panel if open)
     */
    function renderAnnotationList() {
        renderPageMarkers();

        // Also refresh list panel if it's currently open
        const listPanel = document.getElementById('efa-list-panel');
        if (listPanel && listPanel.style.display !== 'none') {
            renderListPanel();
        }
    }

    /**
     * Check if element is visible (not hidden by collapse/accordion/display:none)
     */
    function isElementVisible(el) {
        if (!el) return false;

        // Check if element or any parent is hidden
        let current = el;
        while (current && current !== document.body) {
            const style = window.getComputedStyle(current);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
            // Check for collapsed Bootstrap elements
            if (current.classList.contains('collapse') && !current.classList.contains('show')) {
                return false;
            }
            // Check for accordion items
            if (current.classList.contains('accordion-collapse') && !current.classList.contains('show')) {
                return false;
            }
            current = current.parentElement;
        }

        // Check if element has zero dimensions
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            return false;
        }

        return true;
    }

    /**
     * Render page markers
     * Uses a marker cache to avoid flickering during scroll
     */
    function renderPageMarkers() {
        // Get existing markers map
        const existingMarkers = {};
        document.querySelectorAll('.efa-marker').forEach(m => {
            existingMarkers[m.dataset.id] = m;
        });

        const usedIds = new Set();

        EFA.annotations.forEach((ann, index) => {
            if (ann.type === 'screenshot') {
                return; // No marker for screenshots
            }

            let targetEl = null;
            if (ann.selector) {
                try {
                    targetEl = document.querySelector(ann.selector);
                } catch (e) {
                    // Invalid selector
                }
            }

            if (targetEl && isElementVisible(targetEl)) {
                const rect = targetEl.getBoundingClientRect();
                const left = rect.right + window.scrollX - 12;
                const top = rect.top + window.scrollY - 12;

                usedIds.add(ann.id);

                // Check if marker already exists
                let marker = existingMarkers[ann.id];
                if (marker) {
                    // Update position only
                    marker.style.left = left + 'px';
                    marker.style.top = top + 'px';
                    marker.textContent = index + 1;
                    marker.dataset.index = index;
                } else {
                    // Create new marker
                    marker = document.createElement('div');
                    marker.className = 'efa-marker ' + ann.type;
                    marker.textContent = index + 1;
                    marker.style.position = 'absolute';
                    marker.style.left = left + 'px';
                    marker.style.top = top + 'px';
                    marker.title = ann.comment || '';
                    marker.dataset.id = ann.id;
                    marker.dataset.index = index;

                    // Click to show detail dialog
                    marker.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const annIndex = parseInt(marker.dataset.index, 10);
                        const annData = EFA.annotations.find(a => a.id === ann.id);
                        if (annData) {
                            showAnnotationDetail(annData, annIndex);
                        }
                    });

                    document.body.appendChild(marker);
                }
            } else {
                // Element not visible, mark for potential removal
            }
        });

        // Remove markers for annotations that no longer have visible elements
        Object.keys(existingMarkers).forEach(id => {
            if (!usedIds.has(id)) {
                existingMarkers[id].remove();
            }
        });

        // Update badge count on collapsed button and list button
        updateBadgeCount();
        updateListCount();
    }

    /**
     * Update badge count on collapsed toolbar
     */
    function updateBadgeCount() {
        const toggle = document.getElementById('efa-toggle');
        if (!toggle) return;

        let badge = toggle.querySelector('.efa-badge');
        const count = EFA.annotations.length;

        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'efa-badge';
                toggle.appendChild(badge);
            }
            badge.textContent = count;
        } else if (badge) {
            badge.remove();
        }
    }

    // ========================================
    // Tool Functions - 工具函数
    // ========================================

    /**
     * Activate tool
     */
    function activateTool(tool) {
        deactivateTool();
        EFA.currentTool = tool;
        EFA.isActive = true;

        // Update UI
        const toolbar = EFA.elements.toolbar;
        toolbar.querySelectorAll('.efa-tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        if (tool === 'element') {
            createOverlay();
            document.addEventListener('mousemove', handleElementHover);
            document.addEventListener('click', handleElementClick, true);
        } else if (tool === 'text') {
            document.addEventListener('mouseup', handleTextSelection);
            showToast('Select text to annotate', 'default');
        } else if (tool === 'screenshot') {
            captureScreenshot();
        }
    }

    /**
     * Deactivate current tool
     */
    function deactivateTool() {
        EFA.currentTool = null;
        EFA.isActive = false;

        // Update UI
        const toolbar = EFA.elements.toolbar;
        if (toolbar) {
            toolbar.querySelectorAll('.efa-tool-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }

        // Remove overlay
        removeOverlay();

        // Remove event listeners
        document.removeEventListener('mousemove', handleElementHover);
        document.removeEventListener('click', handleElementClick, true);
        document.removeEventListener('mouseup', handleTextSelection);
    }

    /**
     * Create overlay for element selection
     */
    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'efa-overlay';
        overlay.id = 'efa-overlay';
        document.body.appendChild(overlay);
        EFA.elements.overlay = overlay;

        const highlight = document.createElement('div');
        highlight.className = 'efa-highlight';
        highlight.id = 'efa-highlight';
        highlight.innerHTML = '<div class="efa-highlight-label"></div>';
        highlight.style.display = 'none';
        document.body.appendChild(highlight);
        EFA.elements.highlight = highlight;
    }

    /**
     * Remove overlay
     */
    function removeOverlay() {
        if (EFA.elements.overlay) {
            EFA.elements.overlay.remove();
            EFA.elements.overlay = null;
        }
        if (EFA.elements.highlight) {
            EFA.elements.highlight.remove();
            EFA.elements.highlight = null;
        }
    }

    /**
     * Handle element hover
     */
    function handleElementHover(e) {
        if (!EFA.isActive || EFA.currentTool !== 'element') return;

        const overlay = EFA.elements.overlay;
        const highlight = EFA.elements.highlight;
        if (!overlay || !highlight) return;

        // Get element under cursor (through overlay)
        overlay.style.pointerEvents = 'none';
        const el = document.elementFromPoint(e.clientX, e.clientY);
        overlay.style.pointerEvents = 'auto';

        if (!el || el.closest('.efa-toolbar') || el.closest('.efa-highlight')) {
            highlight.style.display = 'none';
            return;
        }

        const rect = el.getBoundingClientRect();
        highlight.style.display = 'block';
        highlight.style.left = (rect.left + window.scrollX) + 'px';
        highlight.style.top = (rect.top + window.scrollY) + 'px';
        highlight.style.width = rect.width + 'px';
        highlight.style.height = rect.height + 'px';

        const label = highlight.querySelector('.efa-highlight-label');
        label.textContent = el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : '');
    }

    /**
     * Handle element click
     */
    function handleElementClick(e) {
        if (!EFA.isActive || EFA.currentTool !== 'element') return;

        const overlay = EFA.elements.overlay;
        if (!overlay) return;

        // Get element under cursor
        overlay.style.pointerEvents = 'none';
        const el = document.elementFromPoint(e.clientX, e.clientY);
        overlay.style.pointerEvents = 'auto';

        if (!el || el.closest('.efa-toolbar') || el.closest('.efa-modal-overlay')) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const selector = getSelector(el);
        const elementText = getElementText(el);
        const elRect = el.getBoundingClientRect();

        showCommentModal({
            type: 'element',
            selector: selector,
            element_text: elementText,
            element_position: {
                rect: { top: Math.round(elRect.top + window.scrollY), left: Math.round(elRect.left + window.scrollX), width: Math.round(elRect.width), height: Math.round(elRect.height) },
                scrollX: Math.round(window.scrollX),
                scrollY: Math.round(window.scrollY),
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                pageWidth: document.documentElement.scrollWidth,
                pageHeight: document.documentElement.scrollHeight
            },
            info: `<code>${selector}</code><br>Text: "${elementText}"`
        });
    }

    /**
     * Handle text selection
     */
    function handleTextSelection(e) {
        if (!EFA.isActive || EFA.currentTool !== 'text') return;
        if (e.target.closest('.efa-toolbar') || e.target.closest('.efa-modal-overlay')) return;

        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (!selectedText) return;

        // Get context
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const fullText = container.textContent || '';
        const startIndex = Math.max(0, fullText.indexOf(selectedText) - 20);
        const endIndex = Math.min(fullText.length, fullText.indexOf(selectedText) + selectedText.length + 20);
        const context = '...' + fullText.substring(startIndex, endIndex) + '...';

        const rangeRect = range.getBoundingClientRect();
        showCommentModal({
            type: 'text',
            selected_text: selectedText,
            context: context,
            selector: getSelector(container.parentElement || container),
            element_position: {
                rect: { top: Math.round(rangeRect.top + window.scrollY), left: Math.round(rangeRect.left + window.scrollX), width: Math.round(rangeRect.width), height: Math.round(rangeRect.height) },
                scrollX: Math.round(window.scrollX),
                scrollY: Math.round(window.scrollY),
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                pageWidth: document.documentElement.scrollWidth,
                pageHeight: document.documentElement.scrollHeight
            },
            info: `Selected: "<strong>${selectedText}</strong>"<br>Context: "${context}"`
        });
    }

    /**
     * Capture screenshot with region selection
     */
    function captureScreenshot() {
        if (typeof html2canvas === 'undefined') {
            showToast('html2canvas not loaded', 'error');
            deactivateTool();
            return;
        }

        // Show region selection overlay
        showRegionSelector();
    }

    /**
     * Show region selector overlay
     */
    function showRegionSelector() {
        const toolbar = EFA.elements.toolbar;
        toolbar.style.display = 'none';

        const overlay = document.createElement('div');
        overlay.className = 'efa-region-overlay';
        overlay.id = 'efa-region-overlay';
        overlay.innerHTML = `
            <div class="efa-region-hint">Drag to select capture area / ESC to cancel</div>
            <div class="efa-region-box" id="efa-region-box"></div>
        `;
        document.body.appendChild(overlay);

        const box = document.getElementById('efa-region-box');
        let isDrawing = false;
        let startX = 0, startY = 0;

        const handleMouseDown = (e) => {
            isDrawing = true;
            startX = e.clientX;
            startY = e.clientY;
            box.style.left = startX + 'px';
            box.style.top = startY + 'px';
            box.style.width = '0';
            box.style.height = '0';
            box.style.display = 'block';
        };

        const handleMouseMove = (e) => {
            if (!isDrawing) return;
            const currentX = e.clientX;
            const currentY = e.clientY;
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            box.style.left = left + 'px';
            box.style.top = top + 'px';
            box.style.width = width + 'px';
            box.style.height = height + 'px';
        };

        const handleMouseUp = (e) => {
            if (!isDrawing) return;
            isDrawing = false;

            const rect = box.getBoundingClientRect();
            if (rect.width < 20 || rect.height < 20) {
                // Too small, cancel
                closeRegionSelector();
                toolbar.style.display = 'flex';
                deactivateTool();
                return;
            }

            // Capture the selected region
            captureRegion(rect);
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeRegionSelector();
                toolbar.style.display = 'flex';
                deactivateTool();
            }
        };

        const closeRegionSelector = () => {
            overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
        };

        overlay.addEventListener('mousedown', handleMouseDown);
        overlay.addEventListener('mousemove', handleMouseMove);
        overlay.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('keydown', handleKeyDown);

        EFA.closeRegionSelector = closeRegionSelector;
    }

    /**
     * Capture selected region (WYSIWYG approach)
     * Step 1: Capture entire visible viewport
     * Step 2: Crop to selected region
     */
    function captureRegion(rect) {
        const toolbar = EFA.elements.toolbar;

        // Store rect values before closing overlay (viewport coordinates)
        const cropX = rect.left;
        const cropY = rect.top;
        const cropWidth = rect.width;
        const cropHeight = rect.height;

        // Close region selector first
        if (EFA.closeRegionSelector) {
            EFA.closeRegionSelector();
        }

        showToast('Capturing...', 'default');

        // Wait for overlay to be removed, then capture
        setTimeout(() => {
            // Get device pixel ratio for high DPI screens
            const scale = window.devicePixelRatio || 1;

            // Capture the entire visible viewport
            html2canvas(document.documentElement, {
                useCORS: true,
                allowTaint: false,
                logging: false,
                scale: scale,   // Handle high DPI screens
                // Capture only the visible viewport
                scrollX: -window.scrollX,
                scrollY: -window.scrollY,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                width: window.innerWidth,
                height: window.innerHeight,
                x: 0,
                y: 0,
                // Ignore EFA elements
                ignoreElements: (element) => {
                    return element.classList && (
                        element.classList.contains('efa-toolbar') ||
                        element.classList.contains('efa-toast') ||
                        element.classList.contains('efa-marker')
                    );
                }
            }).then(fullCanvas => {
                // Step 2: Crop to selected region (account for scale)
                const croppedCanvas = document.createElement('canvas');
                croppedCanvas.width = cropWidth * scale;
                croppedCanvas.height = cropHeight * scale;
                const ctx = croppedCanvas.getContext('2d');

                // Draw the cropped region (scale coordinates)
                ctx.drawImage(
                    fullCanvas,
                    cropX * scale, cropY * scale, cropWidth * scale, cropHeight * scale,
                    0, 0, cropWidth * scale, cropHeight * scale
                );

                // Verify canvas is exportable (not tainted by cross-origin images)
                try {
                    croppedCanvas.toDataURL('image/png');
                } catch (e) {
                    console.error('EFA: Canvas tainted by cross-origin images:', e);
                    toolbar.style.display = 'flex';
                    showToast('Screenshot failed: cross-origin images on page', 'error');
                    deactivateTool();
                    return;
                }

                toolbar.style.display = 'flex';
                openScreenshotEditor(croppedCanvas);
            }).catch(err => {
                toolbar.style.display = 'flex';
                showToast('Screenshot failed: ' + (err.message || err), 'error');
                console.error('EFA Screenshot error:', err);
                deactivateTool();
            });
        }, 150);
    }

    /**
     * Open screenshot editor
     */
    function openScreenshotEditor(canvas) {
        // Call the screenshot module
        if (typeof EFAScreenshot !== 'undefined') {
            EFAScreenshot.open(canvas, (imageData) => {
                // Got edited image, show comment modal
                showCommentModal({
                    type: 'screenshot',
                    screenshot_data: imageData,
                    element_position: {
                        rect: { top: 0, left: 0, width: canvas.width, height: canvas.height },
                        scrollX: Math.round(window.scrollX),
                        scrollY: Math.round(window.scrollY),
                        viewportWidth: window.innerWidth,
                        viewportHeight: window.innerHeight,
                        pageWidth: document.documentElement.scrollWidth,
                        pageHeight: document.documentElement.scrollHeight
                    },
                    info: '<img src="' + imageData + '" style="max-width:100%;max-height:120px;border-radius:4px;">'
                });
            }, () => {
                // Cancelled
                deactivateTool();
            });
        } else {
            showToast('Screenshot module not loaded', 'error');
            deactivateTool();
        }
    }

    // ========================================
    // Modal Functions - 弹窗函数
    // ========================================

    /**
     * Show comment modal
     */
    function showCommentModal(data) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'efa-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="efa-modal">
                <div class="efa-modal-header">
                    <div class="efa-modal-title">Add Comment</div>
                    <button class="efa-modal-close">&times;</button>
                </div>
                <div class="efa-modal-body">
                    <div class="efa-modal-info">${data.info || ''}</div>
                    <textarea class="efa-textarea" placeholder="Enter your comment..."></textarea>
                </div>
                <div class="efa-modal-footer">
                    <button class="efa-btn efa-btn-secondary efa-modal-cancel">Cancel</button>
                    <button class="efa-btn efa-btn-primary efa-modal-confirm">Add</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        const textarea = modalOverlay.querySelector('.efa-textarea');
        textarea.focus();

        // Close modal
        const closeModal = () => {
            modalOverlay.remove();
            deactivateTool();
        };

        modalOverlay.querySelector('.efa-modal-close').addEventListener('click', closeModal);
        modalOverlay.querySelector('.efa-modal-cancel').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        // Confirm
        modalOverlay.querySelector('.efa-modal-confirm').addEventListener('click', async () => {
            const comment = textarea.value.trim();

            const annotation = {
                id: generateId(),
                type: data.type,
                comment: comment,
                timestamp: new Date().toISOString()
            };

            // Attach element position if captured
            if (data.element_position) {
                annotation.element_position = data.element_position;
            }

            if (data.type === 'element') {
                annotation.selector = data.selector;
                annotation.element_text = data.element_text;
            } else if (data.type === 'text') {
                annotation.selected_text = data.selected_text;
                annotation.context = data.context;
                annotation.selector = data.selector;
            } else if (data.type === 'screenshot') {
                // Upload screenshot
                const result = await uploadScreenshot(data.screenshot_data, annotation.id);
                if (result.success) {
                    annotation.screenshot_path = result.relative_path;
                    annotation.screenshot_url = result.access_url;
                } else {
                    showToast('Screenshot upload failed', 'error');
                    closeModal();
                    return;
                }
            }

            EFA.annotations.push(annotation);
            renderAnnotationList();
            renderPageMarkers();
            closeModal();

            // Save individual annotation to DB
            saveAnnotation(annotation, true).then(result => {
                if (result.success) {
                    showToast(EFA.i18n.saved || 'Saved', 'success');
                } else {
                    showToast(EFA.i18n.error || 'Save failed', 'error');
                }
            });
        });
    }

    // ========================================
    // Annotation Detail Dialog - 标注详情对话框
    // ========================================

    /**
     * Show annotation detail dialog
     */
    function showAnnotationDetail(ann, index) {
        let infoHtml = '';
        if (ann.type === 'element') {
            infoHtml = `
                <div class="efa-detail-type"><strong>Type:</strong> Element</div>
                <div class="efa-detail-text"><strong>Text:</strong> "${ann.element_text || ''}"</div>
                <div class="efa-detail-selector"><strong>Selector:</strong> <code>${ann.selector || ''}</code></div>
            `;
        } else if (ann.type === 'text') {
            infoHtml = `
                <div class="efa-detail-type"><strong>Type:</strong> Text Selection</div>
                <div class="efa-detail-text"><strong>Selected:</strong> "${ann.selected_text || ''}"</div>
                <div class="efa-detail-context"><strong>Context:</strong> ${ann.context || ''}</div>
            `;
        } else if (ann.type === 'screenshot') {
            infoHtml = `
                <div class="efa-detail-type"><strong>Type:</strong> Screenshot</div>
                <div class="efa-detail-image">
                    <img src="${ann.screenshot_url || ''}" class="efa-detail-img-thumb" style="max-width:100%;max-height:200px;border-radius:4px;cursor:zoom-in;" title="Click to enlarge">
                </div>
            `;
        }

        // Show locate button only for element/text types
        const showLocateBtn = ann.type === 'element' || ann.type === 'text';

        // Status badge
        const status = ann.status || 'pending';
        const statusLabels = { pending: 'Pending', ai_analyzed: 'AI Analyzed', dev_approved: 'Approved', in_progress: 'In Progress', resolved: 'Resolved', wontfix: "Won't Fix" };
        const statusHtml = `<span class="efa-status-badge efa-status-${status}">${statusLabels[status] || status}</span>`;

        // AI Analysis section (visible to all)
        const aiAnalysisHtml = ann.ai_analysis ? `
            <div class="efa-ai-analysis" style="margin-top:12px;padding:10px;background:#f0f4ff;border-radius:6px;border-left:3px solid #667eea;">
                <strong style="color:#667eea;font-size:12px;">🤖 AI Analysis:</strong>
                <div style="margin-top:6px;font-size:12px;color:#334155;white-space:pre-wrap;">${ann.ai_analysis}</div>
                ${ann.ai_solution ? `
                    <div style="margin-top:8px;padding:8px;background:#e0e7ff;border-radius:4px;">
                        <strong style="color:#4338ca;font-size:12px;">Proposed Solution:</strong>
                        <div style="margin-top:4px;font-size:12px;color:#334155;white-space:pre-wrap;">${ann.ai_solution}</div>
                    </div>
                ` : ''}
                ${ann.ai_analyzed_at ? `<small style="color:#999;display:block;margin-top:6px;">Analyzed: ${new Date(ann.ai_analyzed_at).toLocaleString()}</small>` : ''}
            </div>
        ` : '';

        // Resolution report (visible to all when resolved)
        const resolutionHtml = (status === 'resolved' && ann.developer_response) ? `
            <div class="efa-resolution-report" style="margin-top:12px;padding:10px;background:#ecfdf5;border-radius:6px;border-left:3px solid #10b981;">
                <strong style="color:#059669;font-size:12px;">✅ Resolution Report:</strong>
                <div style="margin-top:6px;font-size:12px;color:#334155;white-space:pre-wrap;">${ann.developer_response}</div>
                ${ann.resolved_at ? `<small style="color:#999;display:block;margin-top:6px;">Resolved: ${new Date(ann.resolved_at).toLocaleString()}</small>` : ''}
            </div>
        ` : '';

        // Developer response (view mode — only if NOT resolved, since resolved shows resolution report above)
        const responseViewHtml = (ann.developer_response && status !== 'resolved') ? `
            <div class="efa-dev-response">
                <strong><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>Developer Response:</strong>
                <div style="margin-top:6px;padding:8px;background:#e8f5e9;border-radius:4px;border-left:3px solid #28a745;">
                    ${ann.developer_response}
                </div>
                ${ann.responded_at ? `<small style="color:#999;">Responded: ${new Date(ann.responded_at).toLocaleString()}</small>` : ''}
            </div>
        ` : '';

        // Dev mode controls (edit mode)
        const devApproveBtn = (EFA.isDevMode && status === 'ai_analyzed') ? `
            <div style="margin-bottom:10px;display:flex;gap:8px;">
                <button class="efa-btn efa-btn-primary efa-dev-approve-ai" style="padding:4px 12px;font-size:12px;background:#059669;border-color:#059669;">✓ Approve AI Solution</button>
                <button class="efa-btn efa-btn-secondary efa-dev-reject-ai" style="padding:4px 12px;font-size:12px;">✗ Reject</button>
            </div>
        ` : '';

        const devControlsHtml = EFA.isDevMode ? `
            <div class="efa-dev-controls" style="margin-top:12px;padding-top:12px;border-top:2px solid #667eea;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <strong style="font-size:12px;color:#667eea;">${Icons.dev} Dev Controls</strong>
                    ${ann._session_id ? `<small style="color:#999;">Session: ${ann._session_id.substring(0, 8)}...</small>` : ''}
                    ${ann.priority ? `<span style="font-size:11px;padding:1px 6px;border-radius:3px;background:${ann.priority === 'critical' ? '#fecaca' : ann.priority === 'high' ? '#fed7aa' : ann.priority === 'medium' ? '#fef9c3' : '#d1fae5'};color:${ann.priority === 'critical' ? '#991b1b' : ann.priority === 'high' ? '#9a3412' : ann.priority === 'medium' ? '#854d0e' : '#065f46'};">${ann.priority.toUpperCase()}</span>` : ''}
                </div>
                ${devApproveBtn}
                <div style="margin-bottom:10px;">
                    <label style="font-size:12px;font-weight:500;">Status:</label>
                    <select class="efa-dev-status" style="margin-left:8px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">
                        <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="ai_analyzed" ${status === 'ai_analyzed' ? 'selected' : ''}>AI Analyzed</option>
                        <option value="dev_approved" ${status === 'dev_approved' ? 'selected' : ''}>Approved</option>
                        <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="resolved" ${status === 'resolved' ? 'selected' : ''}>Resolved</option>
                        <option value="wontfix" ${status === 'wontfix' ? 'selected' : ''}>Won't Fix</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Response:</label>
                    <textarea class="efa-dev-response-input" style="width:100%;min-height:60px;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:12px;resize:vertical;" placeholder="Enter developer response (visible as resolution report to user)...">${ann.developer_response || ''}</textarea>
                    <button class="efa-btn efa-btn-primary efa-dev-save-response" style="margin-top:6px;padding:4px 12px;font-size:12px;">Save Response</button>
                </div>
            </div>
        ` : (aiAnalysisHtml + resolutionHtml + responseViewHtml);

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'efa-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="efa-modal" style="${EFA.isDevMode ? 'width:420px;' : ''}">
                <div class="efa-modal-header">
                    <div class="efa-modal-title">Annotation #${index + 1} ${statusHtml}</div>
                    <button class="efa-modal-close">&times;</button>
                </div>
                <div class="efa-modal-body">
                    <div class="efa-modal-info">
                        ${infoHtml}
                    </div>
                    <div class="efa-detail-comment">
                        <strong>User Comment:</strong>${ann.author ? ` <span style="font-size:11px;color:#667eea;font-weight:normal;">by ${ann.author}</span>` : ''}${ann.is_mine === false ? ' <span style="font-size:10px;color:#94a3b8;">(read only)</span>' : ''}<br>
                        <div style="margin-top:6px;padding:8px;background:#f8f9fa;border-radius:4px;min-height:40px;">
                            ${ann.comment || '<em style="color:#999;">No comment</em>'}
                        </div>
                    </div>
                    ${EFA.isDevMode ? aiAnalysisHtml : ''}
                    ${EFA.isDevMode ? resolutionHtml : ''}
                    ${devControlsHtml}
                    <div class="efa-detail-time" style="margin-top:10px;font-size:11px;color:#999;">
                        Created: ${new Date(ann.timestamp).toLocaleString()}
                    </div>
                </div>
                <div class="efa-modal-footer">
                    ${(ann.is_mine !== false || EFA.isDevMode) ? `<button class="efa-btn efa-btn-danger efa-detail-delete">
                        ${Icons.delete} Delete
                    </button>` : '<span></span>'}
                    ${showLocateBtn ? `<button class="efa-btn efa-btn-info efa-detail-locate">${Icons.locate} Locate</button>` : ''}
                    <button class="efa-btn efa-btn-secondary efa-modal-close-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        // Close modal
        const closeModal = () => modalOverlay.remove();

        modalOverlay.querySelector('.efa-modal-close').addEventListener('click', closeModal);
        modalOverlay.querySelector('.efa-modal-close-btn').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        // Delete button
        modalOverlay.querySelector('.efa-detail-delete').addEventListener('click', () => {
            if (confirm('Delete this annotation?')) {
                deleteAnnotation(ann.id);
                closeModal();
            }
        });

        // Locate button
        const locateBtn = modalOverlay.querySelector('.efa-detail-locate');
        if (locateBtn) {
            locateBtn.addEventListener('click', () => {
                closeModal();
                scrollToAnnotation(ann);
            });
        }

        // Image zoom (for screenshot type)
        const thumbImg = modalOverlay.querySelector('.efa-detail-img-thumb');
        if (thumbImg) {
            thumbImg.addEventListener('click', () => {
                openImageLightbox(thumbImg.src);
            });
        }

        // Dev mode controls
        if (EFA.isDevMode) {
            // Status change
            const statusSelect = modalOverlay.querySelector('.efa-dev-status');
            if (statusSelect) {
                statusSelect.addEventListener('change', async () => {
                    const newStatus = statusSelect.value;
                    const success = await updateAnnotationStatus(ann, newStatus);
                    if (success) {
                        // Update status badge in header
                        const badge = modalOverlay.querySelector('.efa-status-badge');
                        if (badge) {
                            badge.className = `efa-status-badge efa-status-${newStatus}`;
                            badge.textContent = (statusLabels[newStatus] || newStatus);
                        }
                    }
                });
            }

            // Save response
            const saveResponseBtn = modalOverlay.querySelector('.efa-dev-save-response');
            if (saveResponseBtn) {
                saveResponseBtn.addEventListener('click', async () => {
                    const responseInput = modalOverlay.querySelector('.efa-dev-response-input');
                    const response = responseInput.value.trim();
                    await addDevResponse(ann, response);
                });
            }

            // Approve AI Solution button
            const approveBtn = modalOverlay.querySelector('.efa-dev-approve-ai');
            if (approveBtn) {
                approveBtn.addEventListener('click', async () => {
                    const success = await updateAnnotationStatus(ann, 'dev_approved');
                    if (success) {
                        ann.status = 'dev_approved';
                        closeModal();
                        showAnnotationDetail(ann, index);
                        showToast('AI solution approved', 'success');
                    }
                });
            }

            // Reject AI Solution button
            const rejectBtn = modalOverlay.querySelector('.efa-dev-reject-ai');
            if (rejectBtn) {
                rejectBtn.addEventListener('click', async () => {
                    const success = await updateAnnotationStatus(ann, 'pending');
                    if (success) {
                        ann.status = 'pending';
                        closeModal();
                        showAnnotationDetail(ann, index);
                        showToast('AI solution rejected, reset to pending', 'default');
                    }
                });
            }
        }
    }

    /**
     * Open image lightbox for full-size viewing
     */
    function openImageLightbox(src) {
        const lightbox = document.createElement('div');
        lightbox.className = 'efa-lightbox';
        lightbox.innerHTML = `
            <div class="efa-lightbox-content">
                <img src="${src}" class="efa-lightbox-img">
                <button class="efa-lightbox-close">&times;</button>
                <div class="efa-lightbox-hint">Click anywhere or press ESC to close</div>
            </div>
        `;
        document.body.appendChild(lightbox);

        const closeLightbox = () => lightbox.remove();

        lightbox.addEventListener('click', closeLightbox);
        lightbox.querySelector('.efa-lightbox-close').addEventListener('click', closeLightbox);

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeLightbox();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    }

    /**
     * Scroll to annotation element and highlight it
     */
    function scrollToAnnotation(ann) {
        if (!ann.selector) {
            showToast('Cannot locate: no selector', 'error');
            return;
        }

        let targetEl = null;
        try {
            targetEl = document.querySelector(ann.selector);
        } catch (e) {
            showToast('Cannot locate: invalid selector', 'error');
            return;
        }

        if (!targetEl) {
            showToast('Element not found on page', 'error');
            return;
        }

        // Handle any Bootstrap collapse/accordion parents
        expandBootstrapCollapse(targetEl);

        // Wait for collapse/expand animations
        setTimeout(() => {
            // Scroll to element
            targetEl.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Show highlight effect after scroll completes
            setTimeout(() => {
                targetEl.classList.add('efa-locate-highlight');

                // Remove highlight after 2 seconds
                setTimeout(() => {
                    targetEl.classList.remove('efa-locate-highlight');
                }, 2000);

                renderPageMarkers();
            }, 300);
        }, 350);
    }

    /**
     * Create a visual locate marker on the element
     */
    function createLocateMarker(el) {
        removeLocateMarker();

        const rect = el.getBoundingClientRect();

        // Create pulsing rings marker
        const marker = document.createElement('div');
        marker.id = 'efa-locate-marker';
        marker.innerHTML = `
            <div class="efa-ring efa-ring-1"></div>
            <div class="efa-ring efa-ring-2"></div>
            <div class="efa-ring efa-ring-3"></div>
            <div class="efa-center-dot"></div>
        `;

        // Inline styles for reliability
        const size = 60;
        marker.style.cssText = `
            position: fixed;
            left: ${rect.left + rect.width / 2}px;
            top: ${rect.top + rect.height / 2}px;
            width: ${size}px;
            height: ${size}px;
            transform: translate(-50%, -50%);
            z-index: 999999;
            pointer-events: none;
        `;

        // Add ring styles
        const ringBase = `
            position: absolute;
            border: 3px solid #ff6b35;
            border-radius: 50%;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
        `;

        marker.querySelector('.efa-ring-1').style.cssText = ringBase + `
            width: 20px; height: 20px;
            animation: efaRingPulse 1.2s ease-out infinite;
        `;
        marker.querySelector('.efa-ring-2').style.cssText = ringBase + `
            width: 35px; height: 35px;
            animation: efaRingPulse 1.2s ease-out infinite 0.3s;
        `;
        marker.querySelector('.efa-ring-3').style.cssText = ringBase + `
            width: 50px; height: 50px;
            animation: efaRingPulse 1.2s ease-out infinite 0.6s;
        `;
        marker.querySelector('.efa-center-dot').style.cssText = `
            position: absolute;
            width: 10px; height: 10px;
            background: #ff6b35;
            border-radius: 50%;
            left: 50%; top: 50%;
            transform: translate(-50%, -50%);
        `;

        // Add keyframes animation if not exists
        if (!document.getElementById('efa-locate-styles')) {
            const style = document.createElement('style');
            style.id = 'efa-locate-styles';
            style.textContent = `
                @keyframes efaRingPulse {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(marker);
    }

    /**
     * Remove the locate marker
     */
    function removeLocateMarker() {
        const marker = document.getElementById('efa-locate-marker');
        if (marker) marker.remove();
    }

    /**
     * Expand Bootstrap collapse/accordion parents only
     */
    function expandBootstrapCollapse(el) {
        let current = el;

        while (current && current !== document.body) {
            // Bootstrap collapse
            if (current.classList.contains('collapse') && !current.classList.contains('show')) {
                if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
                    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(current, { toggle: false });
                    bsCollapse.show();
                } else {
                    current.classList.add('show');
                }
            }

            // Bootstrap accordion
            if (current.classList.contains('accordion-collapse') && !current.classList.contains('show')) {
                if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
                    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(current, { toggle: false });
                    bsCollapse.show();
                } else {
                    current.classList.add('show');
                }
            }

            current = current.parentElement;
        }
    }

    // ========================================
    // List Panel - 列表面板
    // ========================================

    /**
     * Toggle list panel
     */
    function toggleListPanel() {
        const panel = document.getElementById('efa-list-panel');
        const listBtn = document.getElementById('efa-list');

        if (panel.style.display === 'none') {
            renderListPanel();
            panel.style.display = 'block';
            listBtn.classList.add('active');
        } else {
            panel.style.display = 'none';
            listBtn.classList.remove('active');
        }
    }

    /**
     * Render list panel content
     */
    function renderListPanel() {
        const panel = document.getElementById('efa-list-panel');
        if (!panel) return;

        if (EFA.annotations.length === 0) {
            panel.innerHTML = '<div class="efa-list-empty">No annotations yet</div>';
            return;
        }

        let html = '<div class="efa-list-items">';
        EFA.annotations.forEach((ann, index) => {
            let typeIcon = Icons.element;
            let summary = '';

            if (ann.type === 'element') {
                typeIcon = Icons.element;
                summary = ann.element_text || ann.selector || '';
            } else if (ann.type === 'text') {
                typeIcon = Icons.text;
                summary = ann.selected_text || '';
            } else if (ann.type === 'screenshot') {
                typeIcon = Icons.screenshot;
                summary = ann.comment || 'Screenshot';
            }

            // Truncate summary
            if (summary.length > 30) {
                summary = summary.substring(0, 30) + '...';
            }

            // Status indicator
            const statusMark = ann.status === 'resolved' ? '<span class="efa-list-item-resolved" title="Resolved">✓</span>'
                : ann.status === 'ai_analyzed' ? '<span title="AI Analyzed" style="font-size:11px;">🤖</span>'
                : ann.status === 'dev_approved' ? '<span title="Approved" style="font-size:11px;color:#059669;">✓</span>'
                : ann.status === 'wontfix' ? '<span title="Won\'t Fix" style="font-size:11px;color:#999;">✗</span>'
                : '';
            const resolvedMark = statusMark;

            const authorTag = ann.author ? `<span style="font-size:10px;color:#667eea;margin-left:2px;" title="${ann.author}">${ann.author.substring(0, 6)}</span>` : '';

            html += `
                <div class="efa-list-item ${ann.status === 'resolved' ? 'efa-list-item-is-resolved' : ''}" data-id="${ann.id}" data-index="${index}">
                    <span class="efa-list-item-num">${index + 1}</span>
                    <span class="efa-list-item-icon">${typeIcon}</span>
                    <span class="efa-list-item-summary">${summary}</span>
                    ${authorTag}
                    <span class="efa-list-item-comment">${ann.comment ? '💬' : ''}</span>
                    ${resolvedMark}
                </div>
            `;
        });
        html += '</div>';

        panel.innerHTML = html;

        // Bind click events to list items
        panel.querySelectorAll('.efa-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const index = parseInt(item.dataset.index, 10);
                const ann = EFA.annotations.find(a => a.id === id);
                if (ann) {
                    // Screenshot: open dialog directly without locate
                    if (ann.type === 'screenshot') {
                        showAnnotationDetail(ann, index);
                        return;
                    }
                    // Element/Text: first locate and highlight, then show dialog
                    scrollToAnnotation(ann);
                    showLocateLoading();
                    setTimeout(() => {
                        hideLocateLoading();
                        showAnnotationDetail(ann, index);
                    }, 1500);
                }
            });
        });
    }

    /**
     * Show locate loading indicator
     */
    function showLocateLoading() {
        // Remove existing
        hideLocateLoading();

        const loader = document.createElement('div');
        loader.id = 'efa-locate-loading';
        loader.innerHTML = `
            <div class="efa-locate-loading-spinner"></div>
            <span>Locating...</span>
        `;
        document.body.appendChild(loader);
    }

    /**
     * Hide locate loading indicator
     */
    function hideLocateLoading() {
        const loader = document.getElementById('efa-locate-loading');
        if (loader) loader.remove();
    }

    /**
     * Update list button count
     */
    function updateListCount() {
        const countEl = document.querySelector('.efa-list-count');
        if (!countEl) return;

        const count = EFA.annotations.length;
        if (count > 0) {
            countEl.textContent = count;
            countEl.style.display = 'flex';
        } else {
            countEl.style.display = 'none';
        }
    }

    // ========================================
    // Keyboard Shortcuts - 快捷键
    // ========================================

    function handleKeyboard(e) {
        // Default shortcut: Ctrl+Shift+F
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            if (EFA.elements.toolbar) {
                const collapsed = EFA.elements.toolbar.querySelector('.efa-toolbar-collapsed');
                if (collapsed.style.display !== 'none') {
                    expandToolbar();
                } else {
                    collapseToolbar();
                }
            }
        }

        // Escape to deactivate tool
        if (e.key === 'Escape' && EFA.isActive) {
            deactivateTool();
        }
    }

    // ========================================
    // Initialization - 初始化
    // ========================================

    function init() {
        // Check if already initialized
        if (document.querySelector('.efa-toolbar')) return;

        createToolbar();

        // Auto-enter dev mode for admins
        if (cfg.isAdmin && EFA.isDevMode) {
            const toolbar = EFA.elements.toolbar;
            if (toolbar) toolbar.classList.add('efa-dev-mode');
            const devBtnInit = document.getElementById('efa-dev');
            if (devBtnInit) {
                devBtnInit.classList.add('active');
                devBtnInit.setAttribute('data-tooltip', 'Exit Dev Mode');
            }
        }

        loadAnnotations();

        document.addEventListener('keydown', handleKeyboard);

        // Update markers on scroll/resize (throttled)
        let scrollTimeout = null;
        const throttledRender = () => {
            if (scrollTimeout) return;
            scrollTimeout = setTimeout(() => {
                renderPageMarkers();
                scrollTimeout = null;
            }, 100);
        };
        window.addEventListener('scroll', throttledRender);
        window.addEventListener('resize', throttledRender);
    }

    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose to global
    window.EFA = EFA;

})();

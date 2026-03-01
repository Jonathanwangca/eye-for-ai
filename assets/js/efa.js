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
                credentials: 'same-origin'
            };

            if (method === 'GET' && data) {
                const params = new URLSearchParams();
                Object.keys(data).forEach(key => params.set(key, data[key]));
                url += '&' + params.toString();
            } else if (data) {
                options.headers = { 'Content-Type': 'application/json' };
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
        const result = await apiRequest('/screenshots', {
            image_data: imageData,
            annotation_id: annotationId
        }, 'POST');
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
                allowTaint: true,
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

                toolbar.style.display = 'flex';
                openScreenshotEditor(croppedCanvas);
            }).catch(err => {
                toolbar.style.display = 'flex';
                showToast('Screenshot failed', 'error');
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
        const statusLabels = { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' };
        const statusHtml = `<span class="efa-status-badge efa-status-${status}">${statusLabels[status] || status}</span>`;

        // Developer response (view mode)
        const responseViewHtml = ann.developer_response ? `
            <div class="efa-dev-response">
                <strong><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>Developer Response:</strong>
                <div style="margin-top:6px;padding:8px;background:#e8f5e9;border-radius:4px;border-left:3px solid #28a745;">
                    ${ann.developer_response}
                </div>
                ${ann.responded_at ? `<small style="color:#999;">Responded: ${new Date(ann.responded_at).toLocaleString()}</small>` : ''}
            </div>
        ` : '';

        // Dev mode controls (edit mode)
        const devControlsHtml = EFA.isDevMode ? `
            <div class="efa-dev-controls" style="margin-top:12px;padding-top:12px;border-top:2px solid #667eea;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <strong style="font-size:12px;color:#667eea;">${Icons.dev} Dev Controls</strong>
                    ${ann._session_id ? `<small style="color:#999;">Session: ${ann._session_id.substring(0, 8)}...</small>` : ''}
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-size:12px;font-weight:500;">Status:</label>
                    <select class="efa-dev-status" style="margin-left:8px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">
                        <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="resolved" ${status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Response:</label>
                    <textarea class="efa-dev-response-input" style="width:100%;min-height:60px;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:12px;resize:vertical;" placeholder="Enter developer response...">${ann.developer_response || ''}</textarea>
                    <button class="efa-btn efa-btn-primary efa-dev-save-response" style="margin-top:6px;padding:4px 12px;font-size:12px;">Save Response</button>
                </div>
            </div>
        ` : responseViewHtml;

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
                        <strong>User Comment:</strong><br>
                        <div style="margin-top:6px;padding:8px;background:#f8f9fa;border-radius:4px;min-height:40px;">
                            ${ann.comment || '<em style="color:#999;">No comment</em>'}
                        </div>
                    </div>
                    ${devControlsHtml}
                    <div class="efa-detail-time" style="margin-top:10px;font-size:11px;color:#999;">
                        Created: ${new Date(ann.timestamp).toLocaleString()}
                    </div>
                </div>
                <div class="efa-modal-footer">
                    <button class="efa-btn efa-btn-danger efa-detail-delete">
                        ${Icons.delete} Delete
                    </button>
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
                            badge.textContent = {pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved'}[newStatus];
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

            // Resolved indicator
            const resolvedMark = ann.status === 'resolved' ? '<span class="efa-list-item-resolved" title="Resolved">✓</span>' : '';

            html += `
                <div class="efa-list-item ${ann.status === 'resolved' ? 'efa-list-item-is-resolved' : ''}" data-id="${ann.id}" data-index="${index}">
                    <span class="efa-list-item-num">${index + 1}</span>
                    <span class="efa-list-item-icon">${typeIcon}</span>
                    <span class="efa-list-item-summary">${summary}</span>
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

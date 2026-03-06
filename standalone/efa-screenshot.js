/**
 * Eye for AI - Screenshot Module
 * 视觉反馈 - 截图模块
 * Version: 2.0 - Added Arrow and Text tools
 */

(function() {
    'use strict';

    const EFAScreenshot = {
        canvas: null,
        ctx: null,
        originalImage: null,
        annotations: [],  // Stores all annotations (rect, arrow, text)
        currentTool: 'rect',  // 'rect', 'arrow', 'text'
        isDrawing: false,
        startX: 0,
        startY: 0,
        currentAnnotation: null,
        onConfirm: null,
        onCancel: null
    };

    // Icons
    const Icons = {
        undo: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>',
        clear: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
        check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
        close: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
        rect: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5z"/></svg>',
        arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>',
        text: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 4v3h5.5v12h3V7H19V4H5z"/></svg>'
    };

    /**
     * Open screenshot editor
     */
    EFAScreenshot.open = function(sourceCanvas, onConfirm, onCancel) {
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this.annotations = [];
        this.currentTool = 'rect';

        // Store original image
        this.originalImage = new Image();
        this.originalImage.src = sourceCanvas.toDataURL('image/png');

        this.originalImage.onload = () => {
            this.createEditor();
        };
    };

    /**
     * Create editor overlay
     */
    EFAScreenshot.createEditor = function() {
        const overlay = document.createElement('div');
        overlay.className = 'efa-screenshot-overlay';
        overlay.id = 'efa-screenshot-overlay';
        overlay.innerHTML = `
            <div class="efa-screenshot-toolbar">
                <div class="efa-screenshot-toolbar-left">
                    <button class="efa-screenshot-btn efa-screenshot-btn-default" id="efa-ss-undo">
                        ${Icons.undo}
                        <span>Undo</span>
                    </button>
                    <button class="efa-screenshot-btn efa-screenshot-btn-default" id="efa-ss-clear">
                        ${Icons.clear}
                        <span>Clear</span>
                    </button>
                </div>
                <div class="efa-screenshot-toolbar-center">
                    <div class="efa-ss-tool-group">
                        <button class="efa-screenshot-btn efa-ss-tool active" data-tool="rect" title="Rectangle (1)">
                            ${Icons.rect}
                        </button>
                        <button class="efa-screenshot-btn efa-ss-tool" data-tool="arrow" title="Arrow (2)">
                            ${Icons.arrow}
                        </button>
                        <button class="efa-screenshot-btn efa-ss-tool" data-tool="text" title="Text (3)">
                            ${Icons.text}
                        </button>
                    </div>
                </div>
                <div class="efa-screenshot-toolbar-right">
                    <button class="efa-screenshot-btn efa-screenshot-btn-danger" id="efa-ss-cancel">
                        ${Icons.close}
                        <span>Cancel</span>
                    </button>
                    <button class="efa-screenshot-btn efa-screenshot-btn-primary" id="efa-ss-confirm">
                        ${Icons.check}
                        <span>Confirm</span>
                    </button>
                </div>
            </div>
            <div class="efa-screenshot-canvas-container">
                <canvas class="efa-screenshot-canvas" id="efa-ss-canvas"></canvas>
            </div>
            <div class="efa-screenshot-hint" id="efa-ss-hint">
                Rectangle: Drag to draw | Arrow: Drag to draw | Text: Click to add
            </div>
        `;

        document.body.appendChild(overlay);

        // Setup canvas
        this.canvas = document.getElementById('efa-ss-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        const maxWidth = window.innerWidth - 100;
        const maxHeight = window.innerHeight - 150;
        let width = this.originalImage.width;
        let height = this.originalImage.height;

        // Scale down if needed
        if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
        }

        this.canvas.width = width;
        this.canvas.height = height;

        // Draw original image
        this.redraw();

        // Bind events
        this.bindEvents();
    };

    /**
     * Bind canvas events
     */
    EFAScreenshot.bindEvents = function() {
        const canvas = this.canvas;
        const self = this;

        // Tool selection
        document.querySelectorAll('.efa-ss-tool').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.efa-ss-tool').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                self.currentTool = btn.dataset.tool;
                self.updateHint();
            });
        });

        // Mouse events for drawing
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            self.startX = e.clientX - rect.left;
            self.startY = e.clientY - rect.top;

            if (self.currentTool === 'text') {
                // For text, show prompt immediately
                self.showTextInput(self.startX, self.startY);
            } else {
                self.isDrawing = true;
                self.currentAnnotation = {
                    type: self.currentTool,
                    x: self.startX,
                    y: self.startY,
                    endX: self.startX,
                    endY: self.startY
                };
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!self.isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            self.currentAnnotation.endX = currentX;
            self.currentAnnotation.endY = currentY;

            self.redraw();
            self.drawAnnotation(self.currentAnnotation, true);
        });

        canvas.addEventListener('mouseup', () => {
            if (!self.isDrawing) return;
            self.isDrawing = false;

            // Check if has minimum size
            const dx = Math.abs(self.currentAnnotation.endX - self.currentAnnotation.x);
            const dy = Math.abs(self.currentAnnotation.endY - self.currentAnnotation.y);

            if (dx > 5 || dy > 5) {
                self.annotations.push({ ...self.currentAnnotation });
            }
            self.currentAnnotation = null;
            self.redraw();
        });

        canvas.addEventListener('mouseleave', () => {
            if (self.isDrawing) {
                self.isDrawing = false;
                self.currentAnnotation = null;
                self.redraw();
            }
        });

        // Button events
        document.getElementById('efa-ss-undo').addEventListener('click', () => {
            if (self.annotations.length > 0) {
                self.annotations.pop();
                self.redraw();
            }
        });

        document.getElementById('efa-ss-clear').addEventListener('click', () => {
            self.annotations = [];
            self.redraw();
        });

        document.getElementById('efa-ss-cancel').addEventListener('click', () => {
            self.close();
            if (self.onCancel) self.onCancel();
        });

        document.getElementById('efa-ss-confirm').addEventListener('click', () => {
            try {
                const imageData = self.canvas.toDataURL('image/png');
                self.close();
                if (self.onConfirm) self.onConfirm(imageData);
            } catch (e) {
                console.error('EFA Screenshot export failed:', e);
                self.close();
                if (self.onCancel) self.onCancel();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', self.handleKeydown);
    };

    /**
     * Update hint text
     */
    EFAScreenshot.updateHint = function() {
        const hint = document.getElementById('efa-ss-hint');
        if (!hint) return;

        switch (this.currentTool) {
            case 'rect':
                hint.textContent = 'Drag to draw rectangle';
                break;
            case 'arrow':
                hint.textContent = 'Drag to draw arrow';
                break;
            case 'text':
                hint.textContent = 'Click to add text';
                break;
        }
    };

    /**
     * Show text input dialog
     */
    EFAScreenshot.showTextInput = function(x, y) {
        const self = this;

        // Create input overlay
        const inputOverlay = document.createElement('div');
        inputOverlay.className = 'efa-ss-text-input-overlay';
        inputOverlay.innerHTML = `
            <div class="efa-ss-text-input-box">
                <input type="text" id="efa-ss-text-input" placeholder="Enter text..." maxlength="50">
                <div class="efa-ss-text-input-btns">
                    <button class="efa-ss-text-cancel">Cancel</button>
                    <button class="efa-ss-text-ok">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(inputOverlay);

        const input = document.getElementById('efa-ss-text-input');
        input.focus();

        const closeInput = () => {
            inputOverlay.remove();
        };

        const addText = () => {
            const text = input.value.trim();
            if (text) {
                self.annotations.push({
                    type: 'text',
                    x: x,
                    y: y,
                    text: text
                });
                self.redraw();
            }
            closeInput();
        };

        inputOverlay.querySelector('.efa-ss-text-cancel').addEventListener('click', closeInput);
        inputOverlay.querySelector('.efa-ss-text-ok').addEventListener('click', addText);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                addText();
            } else if (e.key === 'Escape') {
                closeInput();
            }
        });
    };

    /**
     * Handle keyboard shortcuts
     */
    EFAScreenshot.handleKeydown = function(e) {
        if (!document.getElementById('efa-screenshot-overlay')) return;
        // Don't handle if text input is focused
        if (document.getElementById('efa-ss-text-input')) return;

        if (e.key === 'Escape') {
            EFAScreenshot.close();
            if (EFAScreenshot.onCancel) EFAScreenshot.onCancel();
        } else if (e.key === 'Enter') {
            try {
                const imageData = EFAScreenshot.canvas.toDataURL('image/png');
                EFAScreenshot.close();
                if (EFAScreenshot.onConfirm) EFAScreenshot.onConfirm(imageData);
            } catch (e2) {
                console.error('EFA Screenshot export failed:', e2);
                EFAScreenshot.close();
                if (EFAScreenshot.onCancel) EFAScreenshot.onCancel();
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (EFAScreenshot.annotations.length > 0) {
                EFAScreenshot.annotations.pop();
                EFAScreenshot.redraw();
            }
        } else if (e.key === '1') {
            EFAScreenshot.selectTool('rect');
        } else if (e.key === '2') {
            EFAScreenshot.selectTool('arrow');
        } else if (e.key === '3') {
            EFAScreenshot.selectTool('text');
        }
    };

    /**
     * Select tool programmatically
     */
    EFAScreenshot.selectTool = function(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.efa-ss-tool').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        this.updateHint();
    };

    /**
     * Redraw canvas
     */
    EFAScreenshot.redraw = function() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw original image
        ctx.drawImage(this.originalImage, 0, 0, canvas.width, canvas.height);

        // Draw all annotations
        this.annotations.forEach(ann => {
            this.drawAnnotation(ann, false);
        });
    };

    /**
     * Draw a single annotation
     */
    EFAScreenshot.drawAnnotation = function(ann, isTemp) {
        const ctx = this.ctx;

        ctx.strokeStyle = '#ff0000';
        ctx.fillStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.setLineDash(isTemp ? [5, 5] : []);

        if (ann.type === 'rect') {
            this.drawRect(ann, isTemp);
        } else if (ann.type === 'arrow') {
            this.drawArrow(ann, isTemp);
        } else if (ann.type === 'text') {
            this.drawText(ann);
        }

        ctx.setLineDash([]);
    };

    /**
     * Draw rectangle
     */
    EFAScreenshot.drawRect = function(ann, isTemp) {
        const ctx = this.ctx;
        const x = Math.min(ann.x, ann.endX);
        const y = Math.min(ann.y, ann.endY);
        const width = Math.abs(ann.endX - ann.x);
        const height = Math.abs(ann.endY - ann.y);

        ctx.strokeRect(x, y, width, height);

        // Draw corner handles for permanent rectangles
        if (!isTemp) {
            const handleSize = 6;
            const corners = [
                { x: x, y: y },
                { x: x + width, y: y },
                { x: x, y: y + height },
                { x: x + width, y: y + height }
            ];
            corners.forEach(corner => {
                ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
            });
        }
    };

    /**
     * Draw arrow
     */
    EFAScreenshot.drawArrow = function(ann, isTemp) {
        const ctx = this.ctx;
        const fromX = ann.x;
        const fromY = ann.y;
        const toX = ann.endX;
        const toY = ann.endY;

        const headLength = 15;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        // Draw line
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Draw arrowhead
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6),
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Draw start circle for permanent arrows
        if (!isTemp) {
            ctx.beginPath();
            ctx.arc(fromX, fromY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    /**
     * Draw text
     */
    EFAScreenshot.drawText = function(ann) {
        const ctx = this.ctx;

        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textBaseline = 'top';

        // Draw background
        const textMetrics = ctx.measureText(ann.text);
        const padding = 4;
        const bgX = ann.x - padding;
        const bgY = ann.y - padding;
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = 20 + padding * 2;

        ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
        ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

        // Draw text
        ctx.fillStyle = '#000000';
        ctx.fillText(ann.text, ann.x, ann.y);

        // Draw border
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
    };

    /**
     * Close editor
     */
    EFAScreenshot.close = function() {
        const overlay = document.getElementById('efa-screenshot-overlay');
        if (overlay) {
            overlay.remove();
        }
        const textInput = document.querySelector('.efa-ss-text-input-overlay');
        if (textInput) {
            textInput.remove();
        }
        document.removeEventListener('keydown', this.handleKeydown);
        this.canvas = null;
        this.ctx = null;
        this.originalImage = null;
        this.annotations = [];
    };

    // Expose to global
    window.EFAScreenshot = EFAScreenshot;

})();

/**
 * Eye for AI Core — screenshot capture.
 *
 * Why not html2canvas alone: it re-draws the page from the DOM, so whatever it
 * does not implement comes out wrong — form-control text and arrows vanish,
 * CJK lines overlap, row heights drift.
 *
 * So the primary path is the browser's own tab capture (getDisplayMedia with
 * preferCurrentTab): the pixels ARE the screen. The browser asks once per
 * report; the stream is kept while the report dialog is open so the 2nd–6th
 * screenshot need no new prompt, and release() ends it (the "sharing" bar goes
 * away). If the browser has no tab capture or the user declines, we fall back
 * to html2canvas and say so.
 *
 * Flow of grab(): freeze one frame of the visible tab → the user drags an area
 * on that frozen picture — or just clicks for the whole screen (Esc = cancel) —
 * → crop at device resolution. Annotating is a separate step (annotate()) so pasted / uploaded
 * images can be marked up too.
 */
(function () {
    'use strict';

    var MAX_EDGE = 3840;          // longest side after encode — enough for a 4K tab, keeps uploads < ~2 MB
    var WEBP_QUALITY = 0.92;
    var HIDE_CLASS = 'efa-capturing';

    var live = null;              // { stream, video } while a report dialog is open
    var nativeDeclined = false;   // user said no once → stop asking for this page view

    function hasNative() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) && !nativeDeclined;
    }

    function nextFrame() {
        return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
    }

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    /** A frame painted after our UI was hidden — the video lags the page by a frame or two. */
    function freshFrame(video) {
        if (video.requestVideoFrameCallback) {
            return new Promise(function (r) {
                var n = 0;
                var tick = function () { if (++n >= 2) r(); else video.requestVideoFrameCallback(tick); };
                video.requestVideoFrameCallback(tick);
                setTimeout(r, 600);   // a static page may not emit frames; don't hang
            });
        }
        return sleep(250);
    }

    async function startStream() {
        var stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'browser', frameRate: 30 },
            audio: false,
            preferCurrentTab: true,
            selfBrowserSurface: 'include',
            surfaceSwitching: 'exclude'
        });
        var video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        stream.getVideoTracks()[0].addEventListener('ended', function () { live = null; });
        live = { stream: stream, video: video };
        // The "sharing this tab" bar can resize the viewport right after start.
        await sleep(350);
        return live;
    }

    /** @return {Promise<{canvas: HTMLCanvasElement, native: boolean}>} the whole visible viewport */
    async function viewportFrame() {
        if (hasNative()) {
            try {
                var l = live || await startStream();
                await freshFrame(l.video);
                var c = document.createElement('canvas');
                c.width = l.video.videoWidth;
                c.height = l.video.videoHeight;
                c.getContext('2d').drawImage(l.video, 0, 0);
                return { canvas: c, native: true };
            } catch (e) {
                if (e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) nativeDeclined = true;
            }
        }
        if (typeof html2canvas === 'undefined') throw new Error('No capture method available');
        var scale = window.devicePixelRatio || 1;
        var full = await html2canvas(document.documentElement, {
            useCORS: true, allowTaint: false, logging: false, scale: scale,
            scrollX: -window.scrollX, scrollY: -window.scrollY,
            windowWidth: window.innerWidth, windowHeight: window.innerHeight,
            width: window.innerWidth, height: window.innerHeight, x: 0, y: 0
        });
        return { canvas: full, native: false };
    }

    /** Frozen frame full-screen; resolves with a CSS-pixel rect, or null on Esc. */
    function pickRegion(frame, hint) {
        return new Promise(function (resolve) {
            var ov = document.createElement('div');
            ov.className = 'efa-region';
            var url = frame.toDataURL('image/png');
            ov.style.backgroundImage = 'url("' + url + '")';
            ov.innerHTML = '<div class="efa-region-hint"></div>' +
                '<div class="efa-region-box"></div>';
            ov.firstChild.textContent = hint || 'Drag an area · click = whole screen · Esc = cancel';
            document.body.appendChild(ov);
            var box = ov.querySelector('.efa-region-box');
            var start = null;
            var finish = function (rect) {
                ov.remove();
                document.removeEventListener('keydown', onKey, true);
                resolve(rect);
            };
            var onKey = function (e) {
                if (e.key === 'Escape') { e.stopPropagation(); finish(null); }
                if (e.key === 'Enter') { e.stopPropagation(); finish({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }); }
            };
            ov.addEventListener('mousedown', function (e) {
                start = [e.clientX, e.clientY];
                box.style.cssText = 'display:block;left:' + e.clientX + 'px;top:' + e.clientY + 'px;width:0;height:0';
            });
            ov.addEventListener('mousemove', function (e) {
                if (!start) return;
                box.style.left = Math.min(start[0], e.clientX) + 'px';
                box.style.top = Math.min(start[1], e.clientY) + 'px';
                box.style.width = Math.abs(e.clientX - start[0]) + 'px';
                box.style.height = Math.abs(e.clientY - start[1]) + 'px';
            });
            ov.addEventListener('mouseup', function () {
                if (!start) return;
                start = null;
                var r = box.getBoundingClientRect();
                // A click (no real drag) = the whole screen — the most common case, so it costs one click.
                finish(r.width < 12 || r.height < 12
                    ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
                    : { left: r.left, top: r.top, width: r.width, height: r.height });
            });
            document.addEventListener('keydown', onKey, true);
        });
    }

    function crop(frame, rect) {
        // Frame pixels per CSS pixel — measured, not assumed: native frames follow the
        // tab's real size, which the sharing bar may have changed.
        var sx = frame.width / window.innerWidth;
        var sy = frame.height / window.innerHeight;
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(rect.width * sx));
        c.height = Math.max(1, Math.round(rect.height * sy));
        c.getContext('2d').drawImage(frame, Math.round(rect.left * sx), Math.round(rect.top * sy), c.width, c.height, 0, 0, c.width, c.height);
        return c;
    }

    /**
     * Capture an area of the current tab.
     * @param {{hint?: string}} [opts] hint = the line shown over the frozen frame (i18n)
     * @return {Promise<{canvas: HTMLCanvasElement, native: boolean}|null>} null = cancelled
     */
    async function grab(opts) {
        document.documentElement.classList.add(HIDE_CLASS);
        var shot;
        try {
            await nextFrame();
            shot = await viewportFrame();
        } finally {
            document.documentElement.classList.remove(HIDE_CLASS);
        }
        document.documentElement.classList.add(HIDE_CLASS + '-ui');
        try {
            var rect = await pickRegion(shot.canvas, opts && opts.hint);
            return rect ? { canvas: crop(shot.canvas, rect), native: shot.native } : null;
        } finally {
            document.documentElement.classList.remove(HIDE_CLASS + '-ui');
        }
    }

    /** End tab sharing (report sent / dialog closed). Safe to call any time. */
    function release() {
        if (!live) return;
        live.stream.getTracks().forEach(function (t) { t.stop(); });
        live = null;
    }

    /** Open the markup editor. @return {Promise<string|null>} PNG data URL, null = cancelled */
    function annotate(source) {
        return new Promise(function (resolve) {
            if (typeof EFAScreenshot === 'undefined') { resolve(source.toDataURL('image/png')); return; }
            EFAScreenshot.open(source, function (dataUrl) { resolve(dataUrl); }, function () { resolve(null); });
        });
    }

    function loadImage(src) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { reject(new Error('Not an image')); };
            img.src = src;
        });
    }

    async function toCanvas(src) {
        var img = await loadImage(src);
        var c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        return c;
    }

    /** Pasted / dropped / picked file → data URL (any browser-decodable image). */
    function fromBlob(blob) {
        return new Promise(function (resolve, reject) {
            if (!blob || !/^image\//.test(blob.type)) { reject(new Error('Only images can be attached')); return; }
            var fr = new FileReader();
            fr.onload = function () { resolve(String(fr.result)); };
            fr.onerror = function () { reject(fr.error); };
            fr.readAsDataURL(blob);
        });
    }

    /**
     * Upload encoding: WebP (lossless-looking at 0.92, a fraction of PNG's size) when the
     * browser can write it, else PNG. Over MAX_EDGE is scaled down — nothing a person
     * reads is lost at 4K, and it keeps one upload well under the server limit.
     */
    async function encode(dataUrl) {
        var img = await loadImage(dataUrl);
        var k = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        var ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, c.width, c.height);
        var webp = c.toDataURL('image/webp', WEBP_QUALITY);
        return webp.indexOf('data:image/webp') === 0 ? webp : c.toDataURL('image/png');
    }

    window.EyeForAICapture = {
        grab: grab, release: release, annotate: annotate, toCanvas: toCanvas,
        fromBlob: fromBlob, encode: encode,
        isNativeAvailable: function () { return hasNative(); },
        isSharing: function () { return !!live; }
    };
})();

import { QuartzComponent, QuartzComponentConstructor } from "./types"

/**
 * AnnotationOverlay — admin-only markup + screenshot tool
 *
 * Triggered from the AdminBar (or keyboard shortcut Alt+A). Drops a full-
 * viewport canvas over the page so David can draw arrows, highlight regions,
 * circle things, and add text stickers — then one-click copy the page +
 * annotations to clipboard for pasting directly into a Claude chat.
 *
 * Closes the screenshot → annotate → send loop that was costing 90 seconds
 * per design iteration.
 *
 * Tools:
 *   - Pen (red/yellow/black in 2 sizes)
 *   - Highlighter (semi-transparent yellow)
 *   - Arrow (click-drag, auto-draws head)
 *   - Text sticker (click to place, type, enter to confirm)
 *   - Eraser
 *   - Undo (Ctrl+Z) / Redo (Ctrl+Shift+Z)
 *   - Clear all
 *   - Copy to clipboard (uses html2canvas from CDN)
 *   - Download PNG
 *
 * Keyboard shortcuts when annotation mode is active:
 *   P=pen  H=highlight  A=arrow  T=text  E=eraser  C=clear  Esc=exit
 *   Ctrl+Z=undo  Ctrl+Shift+Z=redo  Ctrl+C=copy to clipboard
 *
 * Gated on `body.admin-mode` class set by AdminBar after password auth.
 * Normies never see the trigger button.
 */

const AnnotationOverlay: QuartzComponent = () => {
  return (
    <div id="anno-root" style={{ display: "none" }}>
      {/* Trigger button — sits fixed at bottom-right, admin-only */}
      <button id="anno-trigger" class="anno-trigger" title="Annotate (Alt+A)">
        <span class="anno-trigger-icon">✎</span>
        <span class="anno-trigger-label">Annotate</span>
      </button>

      {/* Overlay canvas + toolbar (rendered when annotation mode active) */}
      <div id="anno-overlay" class="anno-overlay" style={{ display: "none" }}>
        <canvas id="anno-canvas" class="anno-canvas"></canvas>

        {/* Floating toolbar */}
        <div id="anno-toolbar" class="anno-toolbar">
          <div class="anno-tool-group">
            <button class="anno-tool" data-tool="pen" title="Pen (P)">✎</button>
            <button class="anno-tool" data-tool="highlight" title="Highlight (H)">▬</button>
            <button class="anno-tool" data-tool="arrow" title="Arrow (A)">➜</button>
            <button class="anno-tool" data-tool="text" title="Text (T)">T</button>
            <button class="anno-tool" data-tool="eraser" title="Eraser (E)">⌫</button>
          </div>
          <div class="anno-tool-group">
            <button class="anno-color" data-color="#e63946" style={{ background: "#e63946" }} title="Red"></button>
            <button class="anno-color" data-color="#fbbf24" style={{ background: "#fbbf24" }} title="Yellow"></button>
            <button class="anno-color" data-color="#0a0a0a" style={{ background: "#0a0a0a" }} title="Black"></button>
            <button class="anno-color" data-color="#1d4ed8" style={{ background: "#1d4ed8" }} title="Blue"></button>
          </div>
          <div class="anno-tool-group">
            <button class="anno-size" data-size="2" title="Thin">·</button>
            <button class="anno-size" data-size="4" title="Medium">•</button>
            <button class="anno-size" data-size="8" title="Thick">●</button>
          </div>
          <div class="anno-tool-group">
            <button class="anno-action" id="anno-undo" title="Undo (Ctrl+Z)">↶</button>
            <button class="anno-action" id="anno-redo" title="Redo (Ctrl+Shift+Z)">↷</button>
            <button class="anno-action" id="anno-clear" title="Clear all (C)">✕</button>
          </div>
          <div class="anno-tool-group">
            <button class="anno-action anno-action-primary" id="anno-copy" title="Copy to clipboard (Ctrl+C)">
              <span>📋</span> Copy
            </button>
            <button class="anno-action" id="anno-download" title="Download PNG">⬇</button>
            <button class="anno-action anno-action-done" id="anno-done" title="Exit (Esc)">Done</button>
          </div>
        </div>

        {/* Toast for copy confirmation */}
        <div id="anno-toast" class="anno-toast"></div>
      </div>
    </div>
  )
}

AnnotationOverlay.afterDOMLoaded = `
try {
(function() {
  // Gate on admin session — two signals, either one is enough:
  //   1. body.admin-mode class set by AdminBar
  //   2. localStorage['donor-map-admin'] present (survives page reload
  //      without needing AdminBar to have run yet)
  function checkAdminMode() {
    try {
      if (localStorage.getItem('donor-map-admin')) return true;
    } catch(e) {}
    return document.body.classList.contains('admin-mode');
  }

  // ===== State =====
  var state = {
    tool: 'pen',           // pen | highlight | arrow | text | eraser
    color: '#e63946',
    size: 4,
    drawing: false,
    lastX: 0,
    lastY: 0,
    // Arrow tool needs start point tracked separately
    arrowStart: null,
    // Text tool: we place DOM textareas for easy typing
    textBoxes: [],
    // Undo/redo stacks — each entry is a dataURL snapshot of the canvas
    undoStack: [],
    redoStack: [],
    maxUndoSize: 30,
  };

  var canvas, ctx, overlay, toolbar, root, trigger;

  function show(el, asBlock) {
    if (!el) return;
    el.style.display = asBlock ? 'block' : '';
    el.style.visibility = 'visible';
  }
  function hide(el) { if (el) el.style.display = 'none'; }

  // Show/hide the trigger button based on admin session (poll + observer)
  function syncTriggerVisibility() {
    if (!root || !trigger) return;
    var isAdmin = checkAdminMode();
    console.log('[anno] syncTriggerVisibility admin=', isAdmin, 'root=', !!root, 'trigger=', !!trigger);
    if (isAdmin) {
      show(root, true);
      show(trigger, false); // trigger has its own display:flex from CSS
      // Belt-and-suspenders: force the trigger position + visibility explicitly
      trigger.style.position = 'fixed';
      trigger.style.bottom = '24px';
      trigger.style.right = '24px';
      trigger.style.zIndex = '99998';
    } else {
      hide(root);
      exitAnnotation();
    }
  }

  function toast(msg, ms) {
    var el = document.getElementById('anno-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('anno-toast-show');
    clearTimeout(el._t);
    el._t = setTimeout(function() { el.classList.remove('anno-toast-show'); }, ms || 1500);
  }

  function pushUndo() {
    if (!canvas) return;
    try {
      state.undoStack.push(canvas.toDataURL());
      if (state.undoStack.length > state.maxUndoSize) state.undoStack.shift();
      state.redoStack = [];
    } catch(e) {}
  }

  function restoreFromDataURL(url, cb) {
    var img = new Image();
    img.onload = function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      if (cb) cb();
    };
    img.src = url;
  }

  function undo() {
    if (state.undoStack.length === 0) return;
    var current = canvas.toDataURL();
    state.redoStack.push(current);
    var prev = state.undoStack.pop();
    restoreFromDataURL(prev);
  }

  function redo() {
    if (state.redoStack.length === 0) return;
    var current = canvas.toDataURL();
    state.undoStack.push(current);
    var next = state.redoStack.pop();
    restoreFromDataURL(next);
  }

  function clearAll() {
    pushUndo();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Also remove all text boxes
    state.textBoxes.forEach(function(tb) { if (tb.parentNode) tb.parentNode.removeChild(tb); });
    state.textBoxes = [];
  }

  function setActiveTool(tool) {
    state.tool = tool;
    document.querySelectorAll('.anno-tool').forEach(function(b) {
      b.classList.toggle('anno-tool-active', b.getAttribute('data-tool') === tool);
    });
    // Cursor hint
    if (canvas) {
      if (tool === 'eraser') canvas.style.cursor = 'cell';
      else if (tool === 'text') canvas.style.cursor = 'text';
      else canvas.style.cursor = 'crosshair';
    }
  }

  function setActiveColor(color) {
    state.color = color;
    document.querySelectorAll('.anno-color').forEach(function(b) {
      b.classList.toggle('anno-color-active', b.getAttribute('data-color') === color);
    });
  }

  function setActiveSize(size) {
    state.size = Number(size);
    document.querySelectorAll('.anno-size').forEach(function(b) {
      b.classList.toggle('anno-size-active', Number(b.getAttribute('data-size')) === state.size);
    });
  }

  function resizeCanvas() {
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth;
    var h = window.innerHeight;
    // Save current drawing
    var prev = null;
    try { prev = canvas.toDataURL(); } catch(e) {}
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    if (prev && prev !== 'data:,') restoreFromDataURL(prev);
  }

  // ===== Drawing =====
  function relPos(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX || (e.touches && e.touches[0].clientX) || 0) - rect.left,
      y: (e.clientY || (e.touches && e.touches[0].clientY) || 0) - rect.top
    };
  }

  function startStroke(e) {
    if (state.tool === 'text') return startTextBox(e);
    e.preventDefault();
    var p = relPos(e);
    pushUndo();
    state.drawing = true;
    state.lastX = p.x; state.lastY = p.y;
    if (state.tool === 'arrow') {
      state.arrowStart = { x: p.x, y: p.y };
      // Snapshot so we can redraw the "preview" arrow on each move
      state.arrowSnapshot = canvas.toDataURL();
    } else if (state.tool === 'pen' || state.tool === 'highlight') {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y);
      applyStrokeStyle();
      ctx.stroke();
    } else if (state.tool === 'eraser') {
      erase(p.x, p.y);
    }
  }

  function applyStrokeStyle() {
    if (state.tool === 'highlight') {
      ctx.strokeStyle = state.color;
      ctx.lineWidth = 16;
      ctx.globalAlpha = 0.35;
      ctx.lineCap = 'square';
      ctx.globalCompositeOperation = 'source-over';
    } else if (state.tool === 'pen') {
      ctx.strokeStyle = state.color;
      ctx.lineWidth = state.size;
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
    } else if (state.tool === 'arrow') {
      ctx.strokeStyle = state.color;
      ctx.fillStyle = state.color;
      ctx.lineWidth = state.size;
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function continueStroke(e) {
    if (!state.drawing) return;
    e.preventDefault();
    var p = relPos(e);
    if (state.tool === 'pen' || state.tool === 'highlight') {
      ctx.beginPath();
      ctx.moveTo(state.lastX, state.lastY);
      ctx.lineTo(p.x, p.y);
      applyStrokeStyle();
      ctx.stroke();
      state.lastX = p.x; state.lastY = p.y;
    } else if (state.tool === 'arrow') {
      // Restore snapshot, then draw arrow from start to current
      var img = new Image();
      img.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        drawArrow(state.arrowStart.x, state.arrowStart.y, p.x, p.y);
      };
      img.src = state.arrowSnapshot;
    } else if (state.tool === 'eraser') {
      erase(p.x, p.y);
      state.lastX = p.x; state.lastY = p.y;
    }
  }

  function endStroke(e) {
    if (!state.drawing) return;
    state.drawing = false;
    if (state.tool === 'arrow' && state.arrowStart) {
      var p = relPos(e || { clientX: state.lastX, clientY: state.lastY });
      drawArrow(state.arrowStart.x, state.arrowStart.y, p.x, p.y);
      state.arrowStart = null;
      state.arrowSnapshot = null;
    }
  }

  function drawArrow(x1, y1, x2, y2) {
    applyStrokeStyle();
    var headLen = Math.max(10, state.size * 3);
    var angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  function erase(x, y) {
    var r = Math.max(state.size * 3, 14);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  // ===== Text stickers (DOM textareas that float over the canvas) =====
  function startTextBox(e) {
    e.preventDefault();
    var p = relPos(e);
    var ta = document.createElement('textarea');
    ta.className = 'anno-text-sticker';
    ta.style.position = 'absolute';
    ta.style.left = p.x + 'px';
    ta.style.top = p.y + 'px';
    ta.style.color = state.color;
    ta.placeholder = 'Type, Enter to commit';
    overlay.appendChild(ta);
    state.textBoxes.push(ta);
    setTimeout(function() { ta.focus(); }, 0);
    ta.addEventListener('keydown', function(ev) {
      // Enter commits, Shift+Enter for newline
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        commitTextBox(ta);
      } else if (ev.key === 'Escape') {
        ta.parentNode.removeChild(ta);
      }
      ev.stopPropagation();
    });
    ta.addEventListener('blur', function() {
      if (ta.value.trim()) commitTextBox(ta);
      else if (ta.parentNode) ta.parentNode.removeChild(ta);
    });
  }

  function commitTextBox(ta) {
    var rect = ta.getBoundingClientRect();
    var canvasRect = canvas.getBoundingClientRect();
    var x = rect.left - canvasRect.left;
    var y = rect.top - canvasRect.top;
    pushUndo();
    var lines = ta.value.split('\\n');
    ctx.fillStyle = state.color;
    ctx.font = 'bold ' + (14 + state.size * 2) + 'px "Inter", sans-serif';
    ctx.textBaseline = 'top';
    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x + 4, y + 4 + i * (18 + state.size * 2));
    }
    if (ta.parentNode) ta.parentNode.removeChild(ta);
    var idx = state.textBoxes.indexOf(ta);
    if (idx >= 0) state.textBoxes.splice(idx, 1);
  }

  // ===== Enter / exit annotation mode =====
  function enterAnnotation() {
    if (!checkAdminMode()) return;
    show(overlay);
    document.body.classList.add('anno-active');
    resizeCanvas();
    setActiveTool('pen');
    setActiveColor(state.color);
    setActiveSize(state.size);
    // Lock scroll while annotating so canvas stays aligned with the page
    document.body.style.overflow = 'hidden';
    toast('Annotation mode • Esc to exit • Ctrl+C to copy', 2200);
  }

  function exitAnnotation() {
    hide(overlay);
    document.body.classList.remove('anno-active');
    // Clear any floating text boxes
    state.textBoxes.forEach(function(tb) { if (tb.parentNode) tb.parentNode.removeChild(tb); });
    state.textBoxes = [];
    // Wipe the canvas — every session starts fresh
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.undoStack = [];
    state.redoStack = [];
    document.body.style.overflow = '';
  }

  // ===== Screenshot + copy to clipboard =====
  function loadHtml2Canvas(cb) {
    if (window.html2canvas) return cb(window.html2canvas);
    if (window.__h2cPromise) return window.__h2cPromise.then(cb);
    window.__h2cPromise = new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.async = true;
      s.onload = function() { resolve(window.html2canvas); };
      s.onerror = reject;
      document.head.appendChild(s);
      setTimeout(function() { if (!window.html2canvas) reject(new Error('timeout')); }, 8000);
    });
    window.__h2cPromise.then(cb, function(err) {
      toast('Screenshot library failed to load. Use browser screenshot instead.', 3000);
    });
  }

  function captureComposite(onBlob) {
    toast('Capturing...', 1000);
    // Hide the toolbar during capture so it doesn't appear in the screenshot
    var toolbarEl = document.getElementById('anno-toolbar');
    var toastEl = document.getElementById('anno-toast');
    var prevToolbarVis = toolbarEl.style.visibility;
    var prevToastVis = toastEl.style.visibility;
    toolbarEl.style.visibility = 'hidden';
    toastEl.style.visibility = 'hidden';

    loadHtml2Canvas(function(h2c) {
      // Capture the page WITHOUT the annotation canvas (we'll overlay it manually)
      var annoOverlay = document.getElementById('anno-overlay');
      annoOverlay.style.display = 'none';

      h2c(document.body, {
        backgroundColor: null,
        scale: 1,
        logging: false,
        useCORS: true,
        ignoreElements: function(el) {
          return el.id === 'anno-root' || el.id === 'anno-overlay' || el.classList.contains('anno-trigger');
        }
      }).then(function(pageCanvas) {
        annoOverlay.style.display = '';
        toolbarEl.style.visibility = prevToolbarVis;
        toastEl.style.visibility = prevToastVis;

        // Composite: page + annotations on top
        var out = document.createElement('canvas');
        var dpr = window.devicePixelRatio || 1;
        out.width = pageCanvas.width;
        out.height = pageCanvas.height;
        var outCtx = out.getContext('2d');
        outCtx.drawImage(pageCanvas, 0, 0);
        // Draw the annotation canvas at matching scale
        outCtx.drawImage(canvas, 0, 0, out.width, out.height);
        out.toBlob(onBlob, 'image/png');
      }, function() {
        annoOverlay.style.display = '';
        toolbarEl.style.visibility = prevToolbarVis;
        toastEl.style.visibility = prevToastVis;
        toast('Screenshot failed', 2000);
      });
    });
  }

  function copyToClipboard() {
    captureComposite(function(blob) {
      if (!blob) { toast('Capture failed', 2000); return; }
      if (!navigator.clipboard || !navigator.clipboard.write || !window.ClipboardItem) {
        toast('Clipboard API unavailable — downloading instead', 2400);
        downloadBlob(blob);
        return;
      }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(function() { toast('✓ Copied to clipboard — paste into Claude', 2200); })
        .catch(function() {
          toast('Clipboard write denied — downloading instead', 2400);
          downloadBlob(blob);
        });
    });
  }

  function downloadBlob(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'donor-map-annotated-' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    toast('Downloaded', 1500);
  }

  // ===== Wiring =====
  function wire() {
    root = document.getElementById('anno-root');
    trigger = document.getElementById('anno-trigger');
    overlay = document.getElementById('anno-overlay');
    toolbar = document.getElementById('anno-toolbar');
    canvas = document.getElementById('anno-canvas');
    console.log('[anno] wire called. root=', !!root, 'trigger=', !!trigger, 'canvas=', !!canvas);
    if (!root || !canvas) return;
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    trigger.onclick = enterAnnotation;
    document.getElementById('anno-done').onclick = exitAnnotation;
    document.getElementById('anno-clear').onclick = clearAll;
    document.getElementById('anno-undo').onclick = undo;
    document.getElementById('anno-redo').onclick = redo;
    document.getElementById('anno-copy').onclick = copyToClipboard;
    document.getElementById('anno-download').onclick = function() {
      captureComposite(function(blob) { if (blob) downloadBlob(blob); });
    };

    // Tool buttons
    document.querySelectorAll('.anno-tool').forEach(function(b) {
      b.onclick = function() { setActiveTool(b.getAttribute('data-tool')); };
    });
    document.querySelectorAll('.anno-color').forEach(function(b) {
      b.onclick = function() { setActiveColor(b.getAttribute('data-color')); };
    });
    document.querySelectorAll('.anno-size').forEach(function(b) {
      b.onclick = function() { setActiveSize(b.getAttribute('data-size')); };
    });

    // Canvas drawing events (mouse + touch)
    canvas.addEventListener('mousedown', startStroke);
    canvas.addEventListener('mousemove', continueStroke);
    canvas.addEventListener('mouseup', endStroke);
    canvas.addEventListener('mouseleave', endStroke);
    canvas.addEventListener('touchstart', startStroke, { passive: false });
    canvas.addEventListener('touchmove', continueStroke, { passive: false });
    canvas.addEventListener('touchend', endStroke);

    window.addEventListener('resize', function() {
      if (document.body.classList.contains('anno-active')) resizeCanvas();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      if (!checkAdminMode()) return;
      // Alt+A opens/closes annotation
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (document.body.classList.contains('anno-active')) exitAnnotation();
        else enterAnnotation();
        return;
      }
      if (!document.body.classList.contains('anno-active')) return;

      // Ignore if user is typing in a text box
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

      if (e.key === 'Escape') { e.preventDefault(); exitAnnotation(); }
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { e.preventDefault(); copyToClipboard(); }
      else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); setActiveTool('pen'); }
      else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); setActiveTool('highlight'); }
      else if (e.key === 'a' || e.key === 'A') { e.preventDefault(); setActiveTool('arrow'); }
      else if (e.key === 't' || e.key === 'T') { e.preventDefault(); setActiveTool('text'); }
      else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setActiveTool('eraser'); }
      else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); clearAll(); }
    });

    // Watch body class for admin-mode changes (handles login/logout)
    var bodyObs = new MutationObserver(syncTriggerVisibility);
    bodyObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    syncTriggerVisibility();

    // Belt-and-suspenders: poll every 500ms for the first 3s in case the
    // AdminBar auth init is slow or the body class was set before our
    // observer attached.
    var pollCount = 0;
    var poll = setInterval(function() {
      pollCount++;
      syncTriggerVisibility();
      if (pollCount >= 6) clearInterval(poll);
    }, 500);
  }

  wire();
  document.addEventListener('nav', function() { setTimeout(wire, 100); });
})();
} catch(err) {
  console.error('[anno] IIFE crashed:', err && err.message, err && err.stack);
}
`

AnnotationOverlay.css = `
/* Trigger button — fixed bottom-right corner, admin-only visible */
.anno-trigger {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 99998;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #0a0a0a;
  color: #fbbf24;
  border: 2px solid #fbbf24;
  box-shadow: 3px 3px 0 #fbbf24;
  font-family: "Inter", sans-serif;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}

.anno-trigger:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #fbbf24;
}

.anno-trigger:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #fbbf24;
}

.anno-trigger-icon {
  font-size: 16px;
  line-height: 1;
}

/* Overlay: fills viewport, sits above everything */
.anno-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99999;
  pointer-events: none;
}

.anno-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  pointer-events: auto;
  touch-action: none;
}

/* Toolbar — centered top, brutalist */
.anno-toolbar {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  padding: 8px 10px;
  background: #0a0a0a;
  border: 2px solid #fbbf24;
  box-shadow: 4px 4px 0 rgba(251, 191, 36, 0.5);
  pointer-events: auto;
  font-family: "Inter", sans-serif;
  flex-wrap: wrap;
  max-width: calc(100vw - 32px);
}

.anno-tool-group {
  display: flex;
  gap: 4px;
  padding: 0 6px;
  border-right: 1px solid #333;
}

.anno-tool-group:last-child { border-right: none; }

.anno-tool, .anno-action, .anno-size {
  width: 32px;
  height: 32px;
  background: #1a1a1a;
  border: 1px solid #333;
  color: #eee;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
  font-family: inherit;
  padding: 0;
}

.anno-tool:hover, .anno-action:hover, .anno-size:hover {
  background: #fbbf24;
  color: #0a0a0a;
  border-color: #fbbf24;
}

.anno-tool-active, .anno-size-active {
  background: #fbbf24;
  color: #0a0a0a;
  border-color: #fbbf24;
}

.anno-color {
  width: 22px;
  height: 22px;
  border: 2px solid #333;
  cursor: pointer;
  padding: 0;
  transition: all 0.12s;
}

.anno-color:hover {
  transform: scale(1.15);
  border-color: #fff;
}

.anno-color-active {
  border-color: #fff;
  box-shadow: 0 0 0 2px #fbbf24;
}

.anno-action-primary {
  width: auto;
  padding: 0 12px;
  background: #fbbf24;
  color: #0a0a0a;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.06em;
  gap: 4px;
}

.anno-action-primary:hover {
  background: #fff;
}

.anno-action-done {
  width: auto;
  padding: 0 12px;
  background: #e63946;
  color: #fff;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.06em;
}

.anno-action-done:hover {
  background: #fff;
  color: #0a0a0a;
}

/* Text sticker */
.anno-text-sticker {
  position: absolute;
  background: rgba(255, 255, 255, 0.95);
  border: 2px dashed #fbbf24;
  padding: 4px 6px;
  font-family: "Inter", sans-serif;
  font-size: 16px;
  font-weight: 700;
  outline: none;
  resize: none;
  min-width: 120px;
  min-height: 28px;
  z-index: 100000;
}

/* Toast */
.anno-toast {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: #0a0a0a;
  color: #fbbf24;
  padding: 10px 18px;
  border: 2px solid #fbbf24;
  box-shadow: 3px 3px 0 rgba(251, 191, 36, 0.4);
  font-family: "Inter", sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  opacity: 0;
  transition: opacity 0.15s, transform 0.15s;
  pointer-events: none;
  white-space: nowrap;
}

.anno-toast-show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* Prevent page scroll bleed under canvas when active */
body.anno-active {
  overflow: hidden !important;
}
`

export default (() => AnnotationOverlay) satisfies QuartzComponentConstructor

// ===========================
//  Mazilla — Content Script
// ===========================

(function () {
  'use strict';

  const MAZILLA_ATTR = 'data-mazilla-id';
  const HIGHLIGHT_CLASS = 'mazilla-highlight';
  const PICKING_CLASS = 'mazilla-picking';

  let isPicking = false;
  let hoveredEl = null;
  let overlay = null;

  // ── Inject styles ──────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('mazilla-styles')) return;
    const style = document.createElement('style');
    style.id = 'mazilla-styles';
    style.textContent = `
      .mazilla-picking * {
        cursor: crosshair !important;
      }
      .mazilla-hover-overlay {
        position: fixed;
        pointer-events: none;
        border: 2px solid #00C2A8;
        background: rgba(0, 194, 168, 0.08);
        border-radius: 4px;
        z-index: 2147483647;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.25);
        transition: all 0.05s;
      }
      .mazilla-hover-overlay::after {
        content: attr(data-label);
        position: absolute;
        bottom: calc(100% + 6px);
        left: 0;
        background: #00C2A8;
        color: #031a17;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mazilla-banner {
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        background: #00C2A8;
        color: #031a17;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        font-weight: 700;
        padding: 8px 20px;
        border-radius: 0 0 10px 10px;
        z-index: 2147483647;
        pointer-events: none;
        box-shadow: 0 4px 20px rgba(0,194,168,0.4);
        letter-spacing: 0.3px;
      }
      [data-mazilla-id] {
        outline: 1.5px dashed rgba(0, 194, 168, 0.5) !important;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  injectStyles();

  // ── Build a unique CSS selector for an element ─────────────────────────────
  function buildSelector(el) {
    // Check for existing mazilla id
    if (el.getAttribute(MAZILLA_ATTR)) {
      return `[${MAZILLA_ATTR}="${el.getAttribute(MAZILLA_ATTR)}"]`;
    }

    // Try id
    if (el.id && /^[a-zA-Z]/.test(el.id)) {
      return '#' + CSS.escape(el.id);
    }

    // Build path
    const parts = [];
    let current = el;
    while (current && current !== document.body) {
      let seg = current.tagName.toLowerCase();
      if (current.id && /^[a-zA-Z]/.test(current.id)) {
        seg = '#' + CSS.escape(current.id);
        parts.unshift(seg);
        break;
      }
      // use nth-of-type for uniqueness
      const siblings = Array.from(current.parentElement?.children || []).filter(
        (c) => c.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        seg += `:nth-of-type(${idx})`;
      }
      parts.unshift(seg);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  // ── Get a human-readable label ─────────────────────────────────────────────
  function getLabel(el) {
    return (
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      el.textContent.trim().slice(0, 40) ||
      el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : '')
    );
  }

  // ── Overlay management ─────────────────────────────────────────────────────
  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'mazilla-hover-overlay';
    document.body.appendChild(overlay);
  }

  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function updateOverlay(el) {
    if (!overlay) createOverlay();
    const rect = el.getBoundingClientRect();
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.setAttribute('data-label', getLabel(el) + ' — ' + el.tagName.toLowerCase());
  }

  // ── Banner ─────────────────────────────────────────────────────────────────
  let banner = null;
  function showBanner(text) {
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'mazilla-banner';
      document.body.appendChild(banner);
    }
    banner.textContent = text;
  }
  function removeBanner() {
    if (banner) { banner.remove(); banner = null; }
  }

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  function onMouseMove(e) {
    if (!isPicking) return;
    const el = e.target;
    if (el === overlay || el === banner) return;
    hoveredEl = el;
    updateOverlay(el);
  }

  function onClick(e) {
    if (!isPicking) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const el = hoveredEl || e.target;
    if (!el || el === overlay || el === banner) return;

    // Assign a stable mazilla id
    const mazillaId = 'mz-' + Math.random().toString(36).slice(2, 8);
    el.setAttribute(MAZILLA_ATTR, mazillaId);

    const selector = buildSelector(el);
    const label = getLabel(el);

    stopPicking();

    // Report back to sidebar
    chrome.runtime.sendMessage({
      type: 'MAZILLA_ELEMENT_PICKED',
      selector,
      label,
    });
  }

  function onKeyDown(e) {
    if (!isPicking) return;
    if (e.key === 'Escape') {
      stopPicking();
      chrome.runtime.sendMessage({ type: 'MAZILLA_PICK_CANCELLED' });
    }
  }

  // ── Pick mode ──────────────────────────────────────────────────────────────
  function startPicking() {
    isPicking = true;
    document.body.classList.add(PICKING_CLASS);
    showBanner('Mazilla — Click any element to select it   [ Esc to cancel ]');
    createOverlay();
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  }

  function stopPicking() {
    isPicking = false;
    document.body.classList.remove(PICKING_CLASS);
    removeBanner();
    removeOverlay();
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  }

  // ── Click execution ────────────────────────────────────────────────────────
  function doClick(selector) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        el.click();
        // Visual flash feedback
        const orig = el.style.outline;
        el.style.outline = '2px solid #00C2A8';
        setTimeout(() => { el.style.outline = orig; }, 200);
        chrome.runtime.sendMessage({ type: 'MAZILLA_CLICK_RESULT', found: true });
      } else {
        chrome.runtime.sendMessage({ type: 'MAZILLA_CLICK_RESULT', found: false });
      }
    } catch (err) {
      chrome.runtime.sendMessage({ type: 'MAZILLA_CLICK_RESULT', found: false });
    }
  }

  // ── Form capture ───────────────────────────────────────────────────────────
  function captureForm() {
    const forms = document.querySelectorAll('form');
    if (forms.length === 0) {
      chrome.runtime.sendMessage({ type: 'MAZILLA_FORM_CAPTURED', fields: [], url: window.location.href });
      return;
    }

    const form = forms[0]; // get first form
    const fields = [];
    form.querySelectorAll('input, textarea, select').forEach((field) => {
      if (field.name || field.id) {
        fields.push({
          selector: buildSelector(field),
          type: field.tagName.toLowerCase(),
          name: field.name || field.id,
          value: field.value || '',
          label: getLabel(field),
        });
      }
    });

    chrome.runtime.sendMessage({
      type: 'MAZILLA_FORM_CAPTURED',
      formName: form.name || 'Form',
      url: window.location.href,
      fields,
    });
  }

  // ── Form filling ───────────────────────────────────────────────────────────
  function fillForm(formData) {
    let filledCount = 0;
    formData.fields.forEach((field) => {
      try {
        const el = document.querySelector(field.selector);
        if (el) {
          if (el.tagName.toLowerCase() === 'select') {
            el.value = field.value;
          } else {
            el.value = field.value;
          }
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        }
      } catch (_) {}
    });

    chrome.runtime.sendMessage({
      type: 'MAZILLA_FORM_FILLED',
      filledCount,
    });
  }

  // ── Macro recording ───────────────────────────────────────────────────────
  let isRecording = false;
  const recordedClicks = [];

  function startRecording() {
    isRecording = true;
    recordedClicks.length = 0;
    document.addEventListener('click', recordClick, true);
    showBanner('Mazilla — Recording macro   [ Stop in sidebar ]');
  }

  function stopRecording() {
    isRecording = false;
    document.removeEventListener('click', recordClick, true);
    removeBanner();
  }

  function recordClick(e) {
    if (!isRecording) return;
    const el = e.target;
    if (!el || el === banner) return;

    const selector = buildSelector(el);
    const label = getLabel(el);
    const event = {
      type: 'click',
      selector,
      label,
      timestamp: Date.now(),
    };
    recordedClicks.push(event);

    chrome.runtime.sendMessage({
      type: 'MAZILLA_RECORDING_EVENT',
      event,
    });
  }

  // ── Macro playback ─────────────────────────────────────────────────────────
  function playMacro(macro) {
    let clickCount = 0;
    let index = 0;

    function executeNext() {
      if (index >= macro.events.length) {
        chrome.runtime.sendMessage({
          type: 'MAZILLA_MACRO_PLAYED',
          clickCount,
        });
        return;
      }

      const event = macro.events[index];
      index++;

      if (event.type === 'click') {
        try {
          const el = document.querySelector(event.selector);
          if (el) {
            el.click();
            clickCount++;
            const orig = el.style.outline;
            el.style.outline = '2px solid #00C2A8';
            setTimeout(() => { el.style.outline = orig; }, 150);
          }
        } catch (_) {}
      }

      setTimeout(executeNext, 300);
    }

    executeNext();
  }

  // ── Message listener ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg.type) {
      case 'MAZILLA_START_PICK':
        startPicking();
        break;
      case 'MAZILLA_CANCEL_PICK':
        stopPicking();
        break;
      case 'MAZILLA_DO_CLICK':
        doClick(msg.selector);
        break;
      case 'MAZILLA_CLEAR_TARGET':
        // Remove all mazilla id attributes
        document.querySelectorAll('[' + MAZILLA_ATTR + ']').forEach((el) => {
          el.removeAttribute(MAZILLA_ATTR);
        });
        break;
      case 'MAZILLA_LOAD_JOB':
        // Highlight existing selector briefly
        try {
          const el = document.querySelector(msg.selector);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const orig = el.style.outline;
            el.style.outline = '3px solid #00C2A8';
            setTimeout(() => { el.style.outline = orig; }, 1500);
          }
        } catch (_) {}
        break;
      case 'MAZILLA_CAPTURE_FORM':
        captureForm();
        break;
      case 'MAZILLA_FILL_FORM':
        fillForm(msg.form);
        break;
      case 'MAZILLA_START_RECORDING':
        startRecording();
        break;
      case 'MAZILLA_STOP_RECORDING':
        stopRecording();
        break;
      case 'MAZILLA_PLAY_MACRO':
        playMacro(msg.macro);
        break;
    }
    sendResponse && sendResponse({ ok: true });
  });
})();

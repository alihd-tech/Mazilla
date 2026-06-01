// ===========================
//  Mazilla — Sidebar Logic
// ===========================

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    isPicking: false,
    targetSelector: null,
    targetLabel: null,
    intervalMs: 2000,
    maxClicks: 0,
    isRunning: false,
    clickCount: 0,
    startTime: null,
    savedJobs: [],
    timerId: null,
    countdownTimer: null,
    nextClickIn: 0,
    elapsedTimer: null,
    savedForms: [],
    savedMacros: [],
    savedClipboard: [],
    isRecording: false,
    recordedEvents: [],
    labelFilters: { jobs: null, forms: null, macros: null },
  };

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const pickZone       = $('pick-zone');
  const pickLabel      = $('pick-label');
  const pickSub        = $('pick-sub');
  const pickBtn        = $('pick-btn');
  const clearBtn       = $('clear-btn');
  const selectorDisplay = $('selector-display');
  const selectorCode   = $('selector-code');
  const copySelector   = $('copy-selector');
  const intervalInput  = $('interval-input');
  const intervalUnit   = $('interval-unit');
  const maxClicksInput = $('max-clicks');
  const startBtn       = $('start-btn');
  const stopBtn        = $('stop-btn');
  const statusDot      = $('status-dot');
  const statusText     = $('status-text');
  const statsRow       = $('stats-row');
  const statClicks     = $('stat-clicks');
  const statNext       = $('stat-next');
  const statElapsed    = $('stat-elapsed');
  const savedJobsList  = $('saved-jobs-list');
  const saveJobBtn     = $('save-job-btn');
  // Forms refs
  const captureFormBtn = $('capture-form-btn');
  const formsList      = $('forms-list');
  const formsHint      = $('forms-hint');
  // Macros refs
  const recordMacroBtn = $('record-macro-btn');
  const stopRecordBtn  = $('stop-record-btn');
  const macroStatus    = $('macro-status');
  const macroEvents    = $('macro-events');
  const macrosList     = $('macros-list');
  const macrosHint     = $('macros-hint');
  const clipboardNameInput  = $('clipboard-name-input');
  const clipboardValueInput = $('clipboard-value-input');
  const clipboardAddBtn     = $('clipboard-add-btn');
  const clipboardList       = $('clipboard-list');
  const clipboardHint         = $('clipboard-hint');
  const themeBtn       = $('theme-btn');

  // ── Theme ──────────────────────────────────────────────────────────────────
  const THEME_STORAGE_KEY = 'mazilla_theme';

  function applyTheme(theme) {
    const resolved = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', resolved);
    if (themeBtn) {
      themeBtn.title = resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
      themeBtn.setAttribute('aria-label', themeBtn.title);
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    chrome.storage.local.set({ [THEME_STORAGE_KEY]: next });
  }

  function loadPersistedTheme() {
    chrome.storage.local.get(THEME_STORAGE_KEY, (result) => {
      applyTheme(result[THEME_STORAGE_KEY] || 'dark');
    });
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }
  loadPersistedTheme();

  // ── Tab Navigation ─────────────────────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const panelId = 'tab-' + btn.dataset.tab;
      document.getElementById(panelId).classList.add('active');
    });
  });

  // ── Preset interval buttons ────────────────────────────────────────────────
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const ms = parseInt(btn.dataset.value, 10);
      // fill in the input
      if (ms < 1000) {
        intervalUnit.value = '1'; // ms
        intervalInput.value = ms;
      } else if (ms < 60000) {
        intervalUnit.value = '1000'; // seconds
        intervalInput.value = ms / 1000;
      } else {
        intervalUnit.value = '60000'; // minutes
        intervalInput.value = ms / 60000;
      }
      state.intervalMs = ms;
    });
  });

  // Sync custom input → state.intervalMs
  function syncInterval() {
    const val = parseFloat(intervalInput.value) || 2;
    const unit = parseInt(intervalUnit.value, 10);
    state.intervalMs = Math.max(100, Math.round(val * unit));
    // deselect presets
    document.querySelectorAll('.preset-btn').forEach((b) => {
      b.classList.toggle('active', parseInt(b.dataset.value, 10) === state.intervalMs);
    });
  }
  intervalInput.addEventListener('input', syncInterval);
  intervalUnit.addEventListener('change', syncInterval);

  // Sync max clicks
  maxClicksInput.addEventListener('input', () => {
    state.maxClicks = parseInt(maxClicksInput.value, 10) || 0;
  });

  // ── Picking ────────────────────────────────────────────────────────────────
  pickBtn.addEventListener('click', () => {
    if (state.isPicking) {
      cancelPicking();
    } else {
      startPicking();
    }
  });

  function startPicking() {
    state.isPicking = true;
    pickBtn.textContent = 'Cancel Picking';
    pickBtn.classList.remove('btn-primary');
    pickBtn.classList.add('btn-danger');
    pickZone.classList.add('active');
    pickLabel.textContent = 'Picking mode active…';
    pickSub.textContent = 'Click any element on the page';
    // tell content script
    sendToContent({ type: 'MAZILLA_START_PICK' });
  }

  function cancelPicking() {
    state.isPicking = false;
    pickBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="3" stroke="currentColor" stroke-width="1.3"/>
      <line x1="6.5" y1="1" x2="6.5" y2="3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="6.5" y1="10" x2="6.5" y2="12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="1" y1="6.5" x2="3" y2="6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="10" y1="6.5" x2="12" y2="6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg> Pick Element`;
    pickBtn.classList.add('btn-primary');
    pickBtn.classList.remove('btn-danger');
    pickZone.classList.remove('active');
    if (!state.targetSelector) {
      pickLabel.textContent = 'No element selected';
      pickSub.textContent = 'Click "Pick Element" to target a button';
    }
    sendToContent({ type: 'MAZILLA_CANCEL_PICK' });
  }

  function setTarget(selector, label) {
    state.targetSelector = selector;
    state.targetLabel = label;
    state.isPicking = false;

    pickLabel.textContent = label || selector;
    pickSub.textContent = 'Element selected and ready';
    pickZone.classList.remove('active');
    pickZone.classList.add('has-target');

    selectorCode.textContent = selector;
    selectorDisplay.style.display = 'block';

    // reset pick button
    pickBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="3" stroke="currentColor" stroke-width="1.3"/>
      <line x1="6.5" y1="1" x2="6.5" y2="3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="6.5" y1="10" x2="6.5" y2="12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="1" y1="6.5" x2="3" y2="6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="10" y1="6.5" x2="12" y2="6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg> Change Element`;
    pickBtn.classList.add('btn-primary');
    pickBtn.classList.remove('btn-danger');

    clearBtn.disabled = false;
    startBtn.disabled = false;
    saveJobBtn.disabled = false;
  }

  clearBtn.addEventListener('click', () => {
    state.targetSelector = null;
    state.targetLabel = null;
    pickZone.classList.remove('has-target');
    pickLabel.textContent = 'No element selected';
    pickSub.textContent = 'Click "Pick Element" to target a button';
    selectorDisplay.style.display = 'none';
    clearBtn.disabled = true;
    startBtn.disabled = true;
    saveJobBtn.disabled = true;
    sendToContent({ type: 'MAZILLA_CLEAR_TARGET' });

    pickBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="3" stroke="currentColor" stroke-width="1.3"/>
      <line x1="6.5" y1="1" x2="6.5" y2="3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="6.5" y1="10" x2="6.5" y2="12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="1" y1="6.5" x2="3" y2="6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="10" y1="6.5" x2="12" y2="6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg> Pick Element`;
  });

  // ── Copy selector ──────────────────────────────────────────────────────────
  copySelector.addEventListener('click', () => {
    if (!state.targetSelector) return;
    navigator.clipboard.writeText(state.targetSelector).then(() => {
      copySelector.classList.add('copied');
      setTimeout(() => copySelector.classList.remove('copied'), 1500);
    });
  });

  // ── Start / Stop ───────────────────────────────────────────────────────────
  startBtn.addEventListener('click', startAutoclick);
  stopBtn.addEventListener('click', stopAutoclick);

  function startAutoclick() {
    if (!state.targetSelector || state.isRunning) return;
    syncInterval();
    state.isRunning = true;
    state.clickCount = 0;
    state.startTime = Date.now();
    state.nextClickIn = state.intervalMs;

    setStatus('running', `Running — clicking every ${formatMs(state.intervalMs)}`);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    pickBtn.disabled = true;
    clearBtn.disabled = true;
    statsRow.style.display = 'grid';
    updateStats();

    // Kick off the first click after interval
    scheduleNextClick();

    // Elapsed counter
    state.elapsedTimer = setInterval(() => {
      const s = Math.floor((Date.now() - state.startTime) / 1000);
      statElapsed.textContent = s + 's';
    }, 1000);

    // Countdown
    let remaining = state.intervalMs;
    state.countdownTimer = setInterval(() => {
      remaining -= 250;
      if (remaining <= 0) remaining = state.intervalMs;
      statNext.textContent = (remaining / 1000).toFixed(1) + 's';
    }, 250);
  }

  function scheduleNextClick() {
    if (!state.isRunning) return;
    state.timerId = setTimeout(() => {
      if (!state.isRunning) return;
      doClick();
      state.clickCount++;
      updateStats();

      if (state.maxClicks > 0 && state.clickCount >= state.maxClicks) {
        stopAutoclick();
        setStatus('idle', `Done — reached ${state.clickCount} click(s)`);
        return;
      }
      scheduleNextClick();
    }, state.intervalMs);
  }

  function doClick() {
    sendToContent({ type: 'MAZILLA_DO_CLICK', selector: state.targetSelector });
  }

  function stopAutoclick() {
    state.isRunning = false;
    clearTimeout(state.timerId);
    clearInterval(state.countdownTimer);
    clearInterval(state.elapsedTimer);

    startBtn.disabled = false;
    stopBtn.disabled = true;
    pickBtn.disabled = false;
    clearBtn.disabled = !state.targetSelector;
    setStatus('idle', `Stopped after ${state.clickCount} click(s)`);
    statNext.textContent = '--';
  }

  function updateStats() {
    statClicks.textContent = state.clickCount;
  }

  function setStatus(kind, msg) {
    statusText.textContent = msg;
    statusDot.className = 'status-dot';
    if (kind === 'running') statusDot.classList.add('running');
    if (kind === 'error') statusDot.classList.add('error');
  }

  // ── Save / Load Jobs ───────────────────────────────────────────────────────
  saveJobBtn.addEventListener('click', () => {
    if (!state.targetSelector) return;
    const name = prompt('Job name:', state.targetLabel || 'My Job');
    if (!name) return;
    const job = {
      id: Date.now(),
      name,
      selector: state.targetSelector,
      label: state.targetLabel,
      intervalMs: state.intervalMs,
      maxClicks: state.maxClicks,
      labels: [],
    };
    state.savedJobs.push(job);
    persistJobs();
    renderJobs();
  });

  function renderJobs() {
    state.savedJobs = normalizeSavedItems(state.savedJobs);
    clearStaleLabelFilter('jobs', state.savedJobs);
    if (state.savedJobs.length === 0) {
      savedJobsList.innerHTML = '<p class="empty-msg">No saved jobs yet.</p>';
      return;
    }
    const filtered = filterByLabel(state.savedJobs, 'jobs');
    const playIcon = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 2L10 6L2.5 10V2Z" fill="currentColor"/>
    </svg>`;
    let html = renderLabelFilterBar('jobs', state.savedJobs);
    if (filtered.length === 0) {
      html += '<p class="empty-msg">No jobs match this label.</p>';
    } else {
      filtered.forEach((job) => {
        ensureLabels(job);
        html += buildSavedItemRow({
          id: job.id,
          name: job.name,
          labels: job.labels,
          meta: `${escapeHtml(job.selector)} · every ${formatMs(job.intervalMs)}`,
          primaryBtnClass: 'run-job',
          primaryBtnTitle: 'Load this job',
          primaryIcon: playIcon,
          deleteBtnClass: 'del-job',
        });
      });
    }
    savedJobsList.innerHTML = html;
    bindLabelFilterBar(savedJobsList, 'jobs', renderJobs);
    bindSavedItemActions(savedJobsList, {
      primarySelector: '.run-job',
      deleteSelector: '.del-job',
      onPrimary: loadJob,
      onRename: renameJob,
      onLabels: editJobLabels,
      onDelete: deleteJob,
    });
  }

  function renameJob(id) {
    const job = state.savedJobs.find((j) => j.id === id);
    if (!job) return;
    const name = promptRename(job.name, 'job');
    if (!name) return;
    job.name = name;
    persistJobs();
    renderJobs();
  }

  function editJobLabels(id) {
    const job = state.savedJobs.find((j) => j.id === id);
    if (!job) return;
    const labels = promptEditLabels(ensureLabels(job).labels);
    if (labels === null) return;
    job.labels = labels;
    persistJobs();
    renderJobs();
  }

  function loadJob(id) {
    const job = state.savedJobs.find((j) => j.id === id);
    if (!job) return;
    state.intervalMs = job.intervalMs;
    state.maxClicks = job.maxClicks;
    maxClicksInput.value = job.maxClicks;

    // update interval UI
    if (job.intervalMs < 1000) {
      intervalUnit.value = '1';
      intervalInput.value = job.intervalMs;
    } else if (job.intervalMs < 60000) {
      intervalUnit.value = '1000';
      intervalInput.value = job.intervalMs / 1000;
    } else {
      intervalUnit.value = '60000';
      intervalInput.value = job.intervalMs / 60000;
    }

    // Tell content to highlight + set selector
    sendToContent({ type: 'MAZILLA_LOAD_JOB', selector: job.selector });
    setTarget(job.selector, job.label || job.name);
  }

  function deleteJob(id) {
    state.savedJobs = state.savedJobs.filter((j) => j.id !== id);
    persistJobs();
    renderJobs();
  }

  // ── Storage persistence ────────────────────────────────────────────────────
  function persistJobs() {
    chrome.storage.local.set({ mazilla_jobs: state.savedJobs });
  }

  function loadPersistedJobs() {
    chrome.storage.local.get('mazilla_jobs', (result) => {
      if (result.mazilla_jobs) {
        state.savedJobs = normalizeSavedItems(result.mazilla_jobs);
        renderJobs();
      }
    });
  }

  // ── Message bus (sidebar → content) ───────────────────────────────────────
  function sendToContent(msg) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, msg).catch(() => {
          // tab might not have content script yet
        });
      }
    });
  }

  // ── Message bus (content → sidebar) ───────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'MAZILLA_ELEMENT_PICKED') {
      setTarget(msg.selector, msg.label);
    }
    if (msg.type === 'MAZILLA_CLICK_RESULT') {
      if (!msg.found) {
        setStatus('error', 'Element not found on page!');
      }
    }
    if (msg.type === 'MAZILLA_FORM_CAPTURED') {
      const form = {
        id: Date.now(),
        name: msg.formName || 'Form ' + (state.savedForms.length + 1),
        url: msg.url,
        fields: msg.fields,
        labels: [],
      };
      state.savedForms.push(form);
      persistForms();
      renderForms();
      alert('Form captured with ' + msg.fields.length + ' field(s)!');
    }
    if (msg.type === 'MAZILLA_RECORDING_EVENT') {
      state.recordedEvents.push(msg.event);
      const eventList = macroEvents;
      if (eventList.innerHTML.includes('empty-msg')) {
        eventList.innerHTML = '';
      }
      const eventEl = document.createElement('div');
      eventEl.className = 'macro-event';
      eventEl.textContent = msg.event.type + ': ' + (msg.event.label || msg.event.selector || '');
      eventList.appendChild(eventEl);
    }
    if (msg.type === 'MAZILLA_MACRO_PLAYED') {
      alert('Macro played! ' + msg.clickCount + ' click(s) executed.');
    }
    if (msg.type === 'MAZILLA_CLIPBOARD_INSERTED') {
      if (!msg.success) {
        alert('Could not insert — click an input or textarea on the page first, then try again.');
      }
    }
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function formatMs(ms) {
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000) + 's';
    return (ms / 60000).toFixed(1) + 'min';
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const ICON_EDIT = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M8.2 1.8l2 2-6.5 6.5H2v-2L8.2 1.8z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`;
  const ICON_TAG = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 6.3L5.9 2.5H8l2 2v2.1L5.4 11 2 7.6V6.3z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`;

  function ensureLabels(item) {
    if (!Array.isArray(item.labels)) item.labels = [];
    return item;
  }

  function normalizeSavedItems(items) {
    return (items || []).map((item) => ensureLabels(item));
  }

  function parseLabelsInput(input) {
    return [...new Set(
      input.split(',').map((s) => s.trim()).filter(Boolean)
    )];
  }

  function promptRename(currentName, itemKind) {
    const name = prompt(`Rename ${itemKind}:`, currentName);
    if (name === null) return null;
    const trimmed = name.trim();
    return trimmed || null;
  }

  function promptEditLabels(currentLabels) {
    const input = prompt('Labels (comma-separated):', currentLabels.join(', '));
    if (input === null) return null;
    return parseLabelsInput(input);
  }

  function renderLabelChipsHtml(labels) {
    if (!labels || labels.length === 0) return '';
    return `<div class="job-labels">${labels
      .map((l) => `<span class="label-chip">${escapeHtml(l)}</span>`)
      .join('')}</div>`;
  }

  function collectUniqueLabels(items) {
    const set = new Set();
    items.forEach((item) => {
      ensureLabels(item).labels.forEach((l) => set.add(l));
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  function filterByLabel(items, filterKey) {
    const active = state.labelFilters[filterKey];
    if (!active) return items;
    return items.filter((item) => ensureLabels(item).labels.includes(active));
  }

  function clearStaleLabelFilter(filterKey, items) {
    const active = state.labelFilters[filterKey];
    if (!active) return;
    if (!collectUniqueLabels(items).includes(active)) {
      state.labelFilters[filterKey] = null;
    }
  }

  function renderLabelFilterBar(filterKey, items) {
    const allLabels = collectUniqueLabels(items);
    if (allLabels.length === 0) return '';
    const active = state.labelFilters[filterKey];
    let html = '<div class="label-filter-bar"><span class="label-filter-title">Labels</span>';
    html += `<button type="button" class="label-filter-chip${active === null ? ' active' : ''}" data-filter-key="${filterKey}" data-filter-label="">All</button>`;
    allLabels.forEach((label) => {
      const isActive = active === label;
      html += `<button type="button" class="label-filter-chip${isActive ? ' active' : ''}" data-filter-key="${filterKey}" data-filter-label="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
    });
    html += '</div>';
    return html;
  }

  function bindLabelFilterBar(container, filterKey, onFilterChange) {
    container.querySelectorAll('.label-filter-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const label = btn.dataset.filterLabel;
        state.labelFilters[filterKey] = label === '' ? null : label;
        onFilterChange();
      });
    });
  }

  function bindSavedItemActions(container, handlers) {
    if (handlers.onPrimary) {
      container.querySelectorAll(handlers.primarySelector).forEach((btn) => {
        btn.addEventListener('click', () => handlers.onPrimary(parseInt(btn.dataset.id, 10)));
      });
    }
    container.querySelectorAll('.rename-item').forEach((btn) => {
      btn.addEventListener('click', () => handlers.onRename(parseInt(btn.dataset.id, 10)));
    });
    container.querySelectorAll('.label-item').forEach((btn) => {
      btn.addEventListener('click', () => handlers.onLabels(parseInt(btn.dataset.id, 10)));
    });
    container.querySelectorAll(handlers.deleteSelector).forEach((btn) => {
      btn.addEventListener('click', () => handlers.onDelete(parseInt(btn.dataset.id, 10)));
    });
  }

  function buildSavedItemRow({ id, name, meta, labels, primaryBtnClass, primaryBtnTitle, primaryIcon, deleteBtnClass }) {
    return `
      <div class="job-item" data-id="${id}">
        <div class="job-info">
          <div class="job-name">${escapeHtml(name)}</div>
          ${renderLabelChipsHtml(labels)}
          <div class="job-meta">${meta}</div>
        </div>
        <div class="job-actions">
          <button class="job-btn ${primaryBtnClass}" title="${primaryBtnTitle}" data-id="${id}">
            ${primaryIcon}
          </button>
          <button class="job-btn rename-item" title="Rename" data-id="${id}">${ICON_EDIT}</button>
          <button class="job-btn label-item" title="Edit labels" data-id="${id}">${ICON_TAG}</button>
          <button class="job-btn ${deleteBtnClass}" title="Delete" data-id="${id}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>`;
  }

  // ── FORMS FUNCTIONALITY ────────────────────────────────────────────────────
  captureFormBtn.addEventListener('click', () => {
    sendToContent({ type: 'MAZILLA_CAPTURE_FORM' });
  });

  function renderForms() {
    state.savedForms = normalizeSavedItems(state.savedForms);
    clearStaleLabelFilter('forms', state.savedForms);
    if (state.savedForms.length === 0) {
      formsList.innerHTML = '<p class="empty-msg">No saved form templates yet.</p>';
      formsHint.textContent = 'No forms captured yet';
      return;
    }
    formsHint.textContent = `${state.savedForms.length} form(s) saved`;
    const filtered = filterByLabel(state.savedForms, 'forms');
    const fillIcon = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6L4.5 8L9.5 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    let html = renderLabelFilterBar('forms', state.savedForms);
    if (filtered.length === 0) {
      html += '<p class="empty-msg">No forms match this label.</p>';
    } else {
      filtered.forEach((form) => {
        ensureLabels(form);
        const fieldCount = form.fields.length;
        const urlSnippet = form.url.length > 30 ? form.url.slice(0, 30) + '…' : form.url;
        html += buildSavedItemRow({
          id: form.id,
          name: form.name,
          labels: form.labels,
          meta: `${fieldCount} field(s) · ${escapeHtml(urlSnippet)}`,
          primaryBtnClass: 'fill-form',
          primaryBtnTitle: 'Fill this form on current page',
          primaryIcon: fillIcon,
          deleteBtnClass: 'del-form',
        });
      });
    }
    formsList.innerHTML = html;
    bindLabelFilterBar(formsList, 'forms', renderForms);
    bindSavedItemActions(formsList, {
      primarySelector: '.fill-form',
      deleteSelector: '.del-form',
      onPrimary: fillForm,
      onRename: renameForm,
      onLabels: editFormLabels,
      onDelete: deleteForm,
    });
  }

  function renameForm(id) {
    const form = state.savedForms.find((f) => f.id === id);
    if (!form) return;
    const name = promptRename(form.name, 'form');
    if (!name) return;
    form.name = name;
    persistForms();
    renderForms();
  }

  function editFormLabels(id) {
    const form = state.savedForms.find((f) => f.id === id);
    if (!form) return;
    const labels = promptEditLabels(ensureLabels(form).labels);
    if (labels === null) return;
    form.labels = labels;
    persistForms();
    renderForms();
  }

  function fillForm(id) {
    const form = state.savedForms.find((f) => f.id === id);
    if (!form) return;
    sendToContent({ type: 'MAZILLA_FILL_FORM', form });
  }

  function deleteForm(id) {
    state.savedForms = state.savedForms.filter((f) => f.id !== id);
    persistForms();
    renderForms();
  }

  function persistForms() {
    chrome.storage.local.set({ mazilla_forms: state.savedForms });
  }

  function loadPersistedForms() {
    chrome.storage.local.get('mazilla_forms', (result) => {
      if (result.mazilla_forms) {
        state.savedForms = normalizeSavedItems(result.mazilla_forms);
        renderForms();
      }
    });
  }

  // ── CLIPBOARD FUNCTIONALITY ────────────────────────────────────────────────
  const ICON_INSERT = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 6h8M6 2v8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;
  const ICON_COPY = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M3 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.2"/>
  </svg>`;

  clipboardAddBtn.addEventListener('click', addClipboardItem);

  function addClipboardItem() {
    const name = clipboardNameInput.value.trim();
    const value = clipboardValueInput.value;
    if (!value) {
      clipboardValueInput.focus();
      return;
    }
    state.savedClipboard.push({
      id: Date.now(),
      name: name || 'Value ' + (state.savedClipboard.length + 1),
      value,
    });
    clipboardNameInput.value = '';
    clipboardValueInput.value = '';
    persistClipboard();
    renderClipboard();
  }

  function renderClipboard() {
    if (state.savedClipboard.length === 0) {
      clipboardList.innerHTML = '<p class="empty-msg">No saved values yet. Add one above to get started.</p>';
      clipboardHint.textContent = 'Focus a field on the page, then insert';
      return;
    }
    clipboardHint.textContent = `${state.savedClipboard.length} value(s) saved`;
    let html = '';
    state.savedClipboard.forEach((item) => {
      const preview = item.value.length > 40 ? item.value.slice(0, 40) + '…' : item.value;
      html += `
        <div class="job-item clipboard-item" data-id="${item.id}">
          <div class="job-info">
            <div class="job-name">${escapeHtml(item.name)}</div>
            <div class="job-meta clipboard-preview">${escapeHtml(preview)}</div>
          </div>
          <div class="job-actions">
            <button class="job-btn insert-clipboard" title="Insert into focused field" data-id="${item.id}">
              ${ICON_INSERT}
            </button>
            <button class="job-btn copy-clipboard" title="Copy to system clipboard" data-id="${item.id}">
              ${ICON_COPY}
            </button>
            <button class="job-btn rename-clipboard" title="Rename" data-id="${item.id}">${ICON_EDIT}</button>
            <button class="job-btn del-clipboard" title="Delete" data-id="${item.id}">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>`;
    });
    clipboardList.innerHTML = html;

    clipboardList.querySelectorAll('.insert-clipboard').forEach((btn) => {
      btn.addEventListener('click', () => insertClipboardValue(parseInt(btn.dataset.id, 10)));
    });
    clipboardList.querySelectorAll('.copy-clipboard').forEach((btn) => {
      btn.addEventListener('click', () => copyClipboardValue(parseInt(btn.dataset.id, 10)));
    });
    clipboardList.querySelectorAll('.rename-clipboard').forEach((btn) => {
      btn.addEventListener('click', () => renameClipboardItem(parseInt(btn.dataset.id, 10)));
    });
    clipboardList.querySelectorAll('.del-clipboard').forEach((btn) => {
      btn.addEventListener('click', () => deleteClipboardItem(parseInt(btn.dataset.id, 10)));
    });
  }

  function insertClipboardValue(id) {
    const item = state.savedClipboard.find((c) => c.id === id);
    if (!item) return;
    sendToContent({ type: 'MAZILLA_INSERT_CLIPBOARD', value: item.value });
  }

  function copyClipboardValue(id) {
    const item = state.savedClipboard.find((c) => c.id === id);
    if (!item) return;
    navigator.clipboard.writeText(item.value).catch(() => {
      alert('Could not copy to clipboard.');
    });
  }

  function renameClipboardItem(id) {
    const item = state.savedClipboard.find((c) => c.id === id);
    if (!item) return;
    const name = promptRename(item.name, 'value');
    if (!name) return;
    item.name = name;
    persistClipboard();
    renderClipboard();
  }

  function deleteClipboardItem(id) {
    state.savedClipboard = state.savedClipboard.filter((c) => c.id !== id);
    persistClipboard();
    renderClipboard();
  }

  function persistClipboard() {
    chrome.storage.local.set({ mazilla_clipboard: state.savedClipboard });
  }

  function loadPersistedClipboard() {
    chrome.storage.local.get('mazilla_clipboard', (result) => {
      if (result.mazilla_clipboard) {
        state.savedClipboard = result.mazilla_clipboard;
        renderClipboard();
      }
    });
  }

  // ── MACROS FUNCTIONALITY ───────────────────────────────────────────────────
  recordMacroBtn.addEventListener('click', () => {
    state.isRecording = true;
    state.recordedEvents = [];
    recordMacroBtn.style.display = 'none';
    stopRecordBtn.style.display = 'block';
    stopRecordBtn.disabled = false;
    macroStatus.style.display = 'block';
    macroEvents.innerHTML = '<p class="empty-msg">Recording events...</p>';
    sendToContent({ type: 'MAZILLA_START_RECORDING' });
  });

  stopRecordBtn.addEventListener('click', () => {
    state.isRecording = false;
    recordMacroBtn.style.display = 'block';
    stopRecordBtn.style.display = 'none';
    sendToContent({ type: 'MAZILLA_STOP_RECORDING' });
    if (state.recordedEvents.length > 0) {
      const name = prompt('Macro name:', 'My Macro');
      if (name) {
        saveMacro(name);
      }
    } else {
      alert('No events recorded.');
    }
  });

  function saveMacro(name) {
    const macro = {
      id: Date.now(),
      name,
      events: state.recordedEvents,
      timestamp: new Date().toISOString(),
      labels: [],
    };
    state.savedMacros.push(macro);
    persistMacros();
    renderMacros();
    macroStatus.style.display = 'none';
  }

  function renderMacros() {
    state.savedMacros = normalizeSavedItems(state.savedMacros);
    clearStaleLabelFilter('macros', state.savedMacros);
    if (state.savedMacros.length === 0) {
      macrosList.innerHTML = '<p class="empty-msg">No saved macros yet.</p>';
      macrosHint.textContent = 'No macros saved yet';
      return;
    }
    macrosHint.textContent = `${state.savedMacros.length} macro(s) saved`;
    const filtered = filterByLabel(state.savedMacros, 'macros');
    const playIcon = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3 2L10 6L3 10V2Z" fill="currentColor"/>
    </svg>`;
    let html = renderLabelFilterBar('macros', state.savedMacros);
    if (filtered.length === 0) {
      html += '<p class="empty-msg">No macros match this label.</p>';
    } else {
      html += filtered.map((macro) => buildSavedItemRow({
        id: macro.id,
        name: macro.name,
        labels: macro.labels,
        meta: `${macro.events.length} event(s) · ${new Date(macro.timestamp).toLocaleDateString()}`,
        primaryBtnClass: 'run-macro',
        primaryBtnTitle: 'Play this macro',
        primaryIcon: playIcon,
        deleteBtnClass: 'del-macro',
      })).join('');
    }
    macrosList.innerHTML = html;
    bindLabelFilterBar(macrosList, 'macros', renderMacros);
    bindSavedItemActions(macrosList, {
      primarySelector: '.run-macro',
      deleteSelector: '.del-macro',
      onPrimary: playMacro,
      onRename: renameMacro,
      onLabels: editMacroLabels,
      onDelete: deleteMacro,
    });
  }

  function renameMacro(id) {
    const macro = state.savedMacros.find((m) => m.id === id);
    if (!macro) return;
    const name = promptRename(macro.name, 'macro');
    if (!name) return;
    macro.name = name;
    persistMacros();
    renderMacros();
  }

  function editMacroLabels(id) {
    const macro = state.savedMacros.find((m) => m.id === id);
    if (!macro) return;
    const labels = promptEditLabels(ensureLabels(macro).labels);
    if (labels === null) return;
    macro.labels = labels;
    persistMacros();
    renderMacros();
  }

  function playMacro(id) {
    const macro = state.savedMacros.find((m) => m.id === id);
    if (!macro) return;
    sendToContent({ type: 'MAZILLA_PLAY_MACRO', macro });
  }

  function deleteMacro(id) {
    state.savedMacros = state.savedMacros.filter((m) => m.id !== id);
    persistMacros();
    renderMacros();
  }

  function persistMacros() {
    chrome.storage.local.set({ mazilla_macros: state.savedMacros });
  }

  function loadPersistedMacros() {
    chrome.storage.local.get('mazilla_macros', (result) => {
      if (result.mazilla_macros) {
        state.savedMacros = normalizeSavedItems(result.mazilla_macros);
        renderMacros();
      }
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  loadPersistedJobs();
  loadPersistedForms();
  loadPersistedMacros();
  loadPersistedClipboard();
  renderJobs();
  renderForms();
  renderMacros();
  renderClipboard();
  stopBtn.disabled = true;
})();

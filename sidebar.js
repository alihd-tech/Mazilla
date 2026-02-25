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
    isRecording: false,
    recordedEvents: [],
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
    };
    state.savedJobs.push(job);
    persistJobs();
    renderJobs();
  });

  function renderJobs() {
    if (state.savedJobs.length === 0) {
      savedJobsList.innerHTML = '<p class="empty-msg">No saved jobs yet.</p>';
      return;
    }
    savedJobsList.innerHTML = '';
    state.savedJobs.forEach((job) => {
      const div = document.createElement('div');
      div.className = 'job-item';
      div.innerHTML = `
        <div class="job-info">
          <div class="job-name">${escapeHtml(job.name)}</div>
          <div class="job-meta">${escapeHtml(job.selector)} · every ${formatMs(job.intervalMs)}</div>
        </div>
        <div class="job-actions">
          <button class="job-btn run-job" title="Load this job" data-id="${job.id}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 2L10 6L2.5 10V2Z" fill="currentColor"/>
            </svg>
          </button>
          <button class="job-btn del-job" title="Delete" data-id="${job.id}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </button>
        </div>`;
      savedJobsList.appendChild(div);
    });

    savedJobsList.querySelectorAll('.run-job').forEach((btn) => {
      btn.addEventListener('click', () => loadJob(parseInt(btn.dataset.id, 10)));
    });
    savedJobsList.querySelectorAll('.del-job').forEach((btn) => {
      btn.addEventListener('click', () => deleteJob(parseInt(btn.dataset.id, 10)));
    });
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
        state.savedJobs = result.mazilla_jobs;
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
        name: msg.formName || 'Form ' + state.savedForms.length,
        url: msg.url,
        fields: msg.fields,
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

  // ── FORMS FUNCTIONALITY ────────────────────────────────────────────────────
  captureFormBtn.addEventListener('click', () => {
    sendToContent({ type: 'MAZILLA_CAPTURE_FORM' });
  });

  function renderForms() {
    if (state.savedForms.length === 0) {
      formsList.innerHTML = '<p class="empty-msg">No saved form templates yet.</p>';
      formsHint.textContent = 'No forms captured yet';
      return;
    }
    formsList.innerHTML = '';
    formsHint.textContent = `${state.savedForms.length} form(s) saved`;
    state.savedForms.forEach((form) => {
      const fieldCount = form.fields.length;
      const div = document.createElement('div');
      div.className = 'job-item';
      div.innerHTML = `
        <div class="job-info">
          <div class="job-name">${escapeHtml(form.name)}</div>
          <div class="job-meta">${fieldCount} field(s) · URL: ${escapeHtml(form.url.slice(0, 30))}</div>
        </div>
        <div class="job-actions">
          <button class="job-btn fill-form" title="Fill this form on current page" data-id="${form.id}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L4.5 8L9.5 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="job-btn del-form" title="Delete" data-id="${form.id}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </button>
        </div>`;
      formsList.appendChild(div);
    });

    formsList.querySelectorAll('.fill-form').forEach((btn) => {
      btn.addEventListener('click', () => fillForm(parseInt(btn.dataset.id, 10)));
    });
    formsList.querySelectorAll('.del-form').forEach((btn) => {
      btn.addEventListener('click', () => deleteForm(parseInt(btn.dataset.id, 10)));
    });
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
        state.savedForms = result.mazilla_forms;
        renderForms();
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
    };
    state.savedMacros.push(macro);
    persistMacros();
    renderMacros();
    macroStatus.style.display = 'none';
  }

  function renderMacros() {
    if (state.savedMacros.length === 0) {
      macrosList.innerHTML = '<p class="empty-msg">No saved macros yet.</p>';
      macrosHint.textContent = 'No macros saved yet';
      return;
    }
    macrosList.innerHTML = '';
    macrosHint.textContent = `${state.savedMacros.length} macro(s) saved`;
    state.savedMacros.forEach((macro) => {
      const div = document.createElement('div');
      div.className = 'job-item';
      div.innerHTML = `
        <div class="job-info">
          <div class="job-name">${escapeHtml(macro.name)}</div>
          <div class="job-meta">${macro.events.length} event(s) · ${new Date(macro.timestamp).toLocaleDateString()}</div>
        </div>
        <div class="job-actions">
          <button class="job-btn run-macro" title="Play this macro" data-id="${macro.id}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 2L10 6L3 10V2Z" fill="currentColor"/>
            </svg>
          </button>
          <button class="job-btn del-macro" title="Delete" data-id="${macro.id}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </button>
        </div>`;
      macrosList.appendChild(div);
    });

    macrosList.querySelectorAll('.run-macro').forEach((btn) => {
      btn.addEventListener('click', () => playMacro(parseInt(btn.dataset.id, 10)));
    });
    macrosList.querySelectorAll('.del-macro').forEach((btn) => {
      btn.addEventListener('click', () => deleteMacro(parseInt(btn.dataset.id, 10)));
    });
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
        state.savedMacros = result.mazilla_macros;
        renderMacros();
      }
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  loadPersistedJobs();
  loadPersistedForms();
  loadPersistedMacros();
  renderJobs();
  renderForms();
  renderMacros();
  stopBtn.disabled = true;
})();

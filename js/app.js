/**
 * app.js - Main controller: routing, modals, forms, global search, and event delegation.
 */
(function (global) {
  'use strict';

  const Store = global.StudyStore;
  const Analytics = global.StudyAnalytics;
  const UI = global.StudyUI;
  const Views = global.StudyViews;

  const today = Store.getTodayStr();
  const [ty, tm] = today.split('-').map(Number);

  const uiState = {
    currentView: 'dashboard',
    expandedModules: new Set(),
    modulesFilterStatus: 'All',
    modulesFilterPriority: 'All',
    topicsFilterModule: 'All',
    topicsFilterStatus: 'All',
    topicsFilterPriority: 'All',
    topicsFilterDue: 'All',
    topicsSort: 'dueDate',
    pendingFilterModule: 'All',
    pendingFilterPriority: 'All',
    pendingFilterStatus: 'All',
    pendingFilterDue: 'All',
    pendingSort: 'dueDate',
    studyLogTab: 'sessions',
    calYear: ty,
    calMonth: tm - 1,
    calSelectedDate: today
  };

  function applyTheme(theme) {
    const t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    const sun = document.getElementById('theme-icon-sun');
    const moon = document.getElementById('theme-icon-moon');
    if (sun && moon) {
      sun.classList.toggle('hidden', t === 'light');
      moon.classList.toggle('hidden', t === 'dark');
    }
  }

  function setView(viewName) {
    if (!Views[viewName]) viewName = 'dashboard';
    uiState.currentView = viewName;
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    closeMobileSidebar();
    render();
  }

  function openMobileSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-backdrop').classList.add('open');
  }

  function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('open');
  }

  function render() {
    const state = Store.getState();
    const stats = Analytics.calculateStats(state);
    applyTheme(state.settings.theme);

    // Update overdue badge
    const badge = document.getElementById('nav-overdue-badge');
    if (badge) {
      badge.textContent = String(stats.overdueTopics);
      badge.classList.toggle('hidden', stats.overdueTopics === 0);
    }

    UI.destroyCharts();
    const renderer = Views[uiState.currentView] || Views.dashboard;
    const result = renderer(state, stats, uiState);
    const main = document.getElementById('main-content');
    main.innerHTML = result.html;

    bindViewInputs();
    if (typeof result.afterRender === 'function') {
      result.afterRender();
    }
  }

  function bindViewInputs() {
    const bindSelect = (id, key) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          uiState[key] = e.target.value;
          render();
        });
      }
    };

    bindSelect('mod-filter-status', 'modulesFilterStatus');
    bindSelect('mod-filter-priority', 'modulesFilterPriority');
    bindSelect('top-filter-module', 'topicsFilterModule');
    bindSelect('top-filter-status', 'topicsFilterStatus');
    bindSelect('top-filter-priority', 'topicsFilterPriority');
    bindSelect('top-filter-due', 'topicsFilterDue');
    bindSelect('top-sort', 'topicsSort');
    bindSelect('pend-filter-module', 'pendingFilterModule');
    bindSelect('pend-filter-priority', 'pendingFilterPriority');
    bindSelect('pend-filter-status', 'pendingFilterStatus');
    bindSelect('pend-filter-due', 'pendingFilterDue');
    bindSelect('pend-sort', 'pendingSort');

    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userName = document.getElementById('set-username').value.trim();
        const dailyGoalHours = Number(document.getElementById('set-daily-goal').value);
        const weeklyGoalHours = Number(document.getElementById('set-weekly-goal').value);
        const theme = document.getElementById('set-theme').value;
        if (!userName || dailyGoalHours <= 0 || weeklyGoalHours <= 0) {
          UI.showToast('Please enter valid goal values.', 'error');
          return;
        }
        Store.updateSettings({ userName, dailyGoalHours, weeklyGoalHours, theme });
        UI.showToast('Preferences saved.', 'success');
      });
    }

    const importInput = document.getElementById('import-json-input');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            Store.importJSON(reader.result);
            UI.showToast('Backup imported successfully!', 'success');
          } catch (err) {
            UI.showToast(`Import failed: ${err.message}`, 'error');
          }
        };
        reader.onerror = () => UI.showToast('Could not read selected file.', 'error');
        reader.readAsText(file);
        e.target.value = '';
      });
    }
  }

  // --- Modals ---
  function openModuleModal(existingId = null) {
    const state = Store.getState();
    const mod = existingId ? state.modules.find((m) => m.id === existingId) : null;
    const colors = [
      { value: '#4f46e5', label: 'Indigo' },
      { value: '#0ea5e9', label: 'Sky Blue' },
      { value: '#10b981', label: 'Emerald' },
      { value: '#f59e0b', label: 'Amber' },
      { value: '#ec4899', label: 'Pink' },
      { value: '#8b5cf6', label: 'Purple' },
      { value: '#ef4444', label: 'Red' }
    ];

    UI.openModal(mod ? 'Edit Module' : 'Create New Module', `
      <form id="module-form">
        <div class="form-group">
          <label for="mod-name">Module Name *</label>
          <input id="mod-name" class="form-control" type="text" required value="${UI.escapeHtml(mod ? mod.name : '')}" placeholder="e.g. System Design" />
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="mod-category">Subject / Category</label>
            <input id="mod-category" class="form-control" type="text" value="${UI.escapeHtml(mod ? mod.category : 'General')}" placeholder="e.g. Computer Science" />
          </div>
          <div class="form-group">
            <label for="mod-priority">Priority</label>
            <select id="mod-priority" class="form-control">
              ${['Low', 'Medium', 'High'].map((p) => `<option value="${p}" ${(mod ? mod.priority : 'Medium') === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="mod-start">Start Date</label>
            <input id="mod-start" class="form-control" type="date" value="${mod ? mod.startDate : Store.getTodayStr()}" />
          </div>
          <div class="form-group">
            <label for="mod-target">Target Completion Date</label>
            <input id="mod-target" class="form-control" type="date" value="${mod ? mod.targetDate : ''}" />
          </div>
          <div class="form-group">
            <label for="mod-status">Status</label>
            <select id="mod-status" class="form-control">
              ${['Not Started', 'In Progress', 'Completed'].map((s) => `<option value="${s}" ${(mod ? mod.status : 'Not Started') === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="mod-color">Module Color</label>
            <select id="mod-color" class="form-control">
              ${colors.map((c) => `<option value="${c.value}" ${(mod ? mod.color : '#4f46e5') === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="mod-desc">Description</label>
          <textarea id="mod-desc" class="form-control" placeholder="What will you learn in this module?">${UI.escapeHtml(mod ? mod.description : '')}</textarea>
        </div>
        <div id="mod-form-error" class="form-error hidden"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">${mod ? 'Save Changes' : 'Create Module'}</button>
        </div>
      </form>
    `);

    document.getElementById('module-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('mod-name').value.trim();
      const errEl = document.getElementById('mod-form-error');
      if (!name) {
        errEl.textContent = 'Module name is required.';
        errEl.classList.remove('hidden');
        return;
      }
      const payload = {
        name,
        category: document.getElementById('mod-category').value.trim() || 'General',
        priority: document.getElementById('mod-priority').value,
        startDate: document.getElementById('mod-start').value,
        targetDate: document.getElementById('mod-target').value,
        status: document.getElementById('mod-status').value,
        color: document.getElementById('mod-color').value,
        description: document.getElementById('mod-desc').value.trim()
      };
      if (mod) {
        Store.updateModule(mod.id, payload);
        UI.showToast('Module updated.', 'success');
      } else {
        Store.addModule(payload);
        UI.showToast('Module created.', 'success');
      }
      UI.closeModal();
    });
  }

  function openModuleDetailModal(moduleId) {
    const state = Store.getState();
    const stats = Analytics.calculateStats(state);
    const ms = stats.moduleStats.find((item) => item.module.id === moduleId);
    if (!ms) return;
    const m = ms.module;
    const topics = state.topics.filter((t) => t.moduleId === m.id);

    UI.openModal(m.name, `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
        <span class="badge badge-neutral">${UI.escapeHtml(m.category)}</span>
        ${UI.priorityBadge(m.priority)}
        ${UI.statusBadge(m.status)}
      </div>
      ${m.description ? `<p style="margin:0 0 14px;color:var(--text-secondary);">${UI.escapeHtml(m.description)}</p>` : ''}
      <div class="form-grid" style="margin-bottom:14px;font-size:13px;">
        <div><strong>Start Date:</strong> ${m.startDate ? UI.formatDate(m.startDate) : 'Not set'}</div>
        <div><strong>Target Date:</strong> ${m.targetDate ? UI.formatDate(m.targetDate) : 'Not set'}</div>
        <div><strong>Progress:</strong> ${ms.completedTopics}/${ms.totalTopics} topics (${ms.completionPct}%)</div>
        <div><strong>Study Time:</strong> ${UI.formatDuration(ms.sessionMinutes)}</div>
      </div>
      <div class="progress-bar" style="margin-bottom:16px;"><div class="progress-fill" style="width:${ms.completionPct}%;background:${m.color}"></div></div>
      <h4 style="margin:0 0 8px;font-size:14px;">Topics (${topics.length})</h4>
      ${topics.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;">No topics added yet.</p>' : `
        <div class="item-list">
          ${topics.map((t) => `
            <div class="list-row" style="padding:8px 10px;">
              <div class="list-row-content">
                <div class="list-row-title" style="font-size:13px;">${UI.escapeHtml(t.name)}</div>
                <div class="list-row-meta">${UI.statusBadge(t.status)} ${UI.dueBadge(t, stats.todayStr)}</div>
              </div>
              <span style="font-size:12px;color:var(--text-muted);">${UI.formatDuration(t.actualMinutes)}</span>
            </div>
          `).join('')}
        </div>
      `}
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-action="close-modal">Close</button>
      </div>
    `);
  }

  function openTopicModal(existingId = null, defaultModuleId = null) {
    const state = Store.getState();
    if (state.modules.length === 0) {
      UI.showToast('Please create a module before adding a topic.', 'warning');
      openModuleModal();
      return;
    }
    const topic = existingId ? state.topics.find((t) => t.id === existingId) : null;
    const selectedModId = topic ? topic.moduleId : (defaultModuleId || state.modules[0].id);

    UI.openModal(topic ? 'Edit Topic' : 'Add New Topic', `
      <form id="topic-form">
        <div class="form-group">
          <label for="top-name">Topic Name *</label>
          <input id="top-name" class="form-control" type="text" required value="${UI.escapeHtml(topic ? topic.name : '')}" placeholder="e.g. Database Sharding" />
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="top-module">Parent Module *</label>
            <select id="top-module" class="form-control" required>
              ${state.modules.map((m) => `<option value="${m.id}" ${selectedModId === m.id ? 'selected' : ''}>${UI.escapeHtml(m.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="top-priority">Priority</label>
            <select id="top-priority" class="form-control">
              ${['Low', 'Medium', 'High'].map((p) => `<option value="${p}" ${(topic ? topic.priority : 'Medium') === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="top-status">Status</label>
            <select id="top-status" class="form-control">
              ${['Not Started', 'In Progress', 'Completed', 'On Hold'].map((s) => `<option value="${s}" ${(topic ? topic.status : 'Not Started') === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="top-est">Estimated Duration (mins)</label>
            <input id="top-est" class="form-control" type="number" min="0" value="${topic ? topic.estimatedMinutes : 60}" />
          </div>
          <div class="form-group">
            <label for="top-act">Actual Duration (mins)</label>
            <input id="top-act" class="form-control" type="number" min="0" value="${topic ? topic.actualMinutes : 0}" />
          </div>
          <div class="form-group">
            <label for="top-start">Start Date</label>
            <input id="top-start" class="form-control" type="date" value="${topic ? topic.startDate : ''}" />
          </div>
          <div class="form-group">
            <label for="top-due">Due Date</label>
            <input id="top-due" class="form-control" type="date" value="${topic ? topic.dueDate : ''}" />
          </div>
        </div>
        <div class="form-group">
          <label for="top-notes">Description / Personal Notes</label>
          <textarea id="top-notes" class="form-control" placeholder="Key concepts, links, or study checklist...">${UI.escapeHtml(topic ? topic.notes : '')}</textarea>
        </div>
        <div id="top-form-error" class="form-error hidden"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">${topic ? 'Save Changes' : 'Add Topic'}</button>
        </div>
      </form>
    `);

    document.getElementById('topic-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('top-name').value.trim();
      const moduleId = document.getElementById('top-module').value;
      const errEl = document.getElementById('top-form-error');
      if (!name || !moduleId) {
        errEl.textContent = 'Topic name and parent module are required.';
        errEl.classList.remove('hidden');
        return;
      }
      const payload = {
        name,
        moduleId,
        priority: document.getElementById('top-priority').value,
        status: document.getElementById('top-status').value,
        estimatedMinutes: Math.max(0, Number(document.getElementById('top-est').value) || 0),
        actualMinutes: Math.max(0, Number(document.getElementById('top-act').value) || 0),
        startDate: document.getElementById('top-start').value,
        dueDate: document.getElementById('top-due').value,
        notes: document.getElementById('top-notes').value.trim()
      };
      if (topic) {
        Store.updateTopic(topic.id, payload);
        UI.showToast('Topic updated.', 'success');
      } else {
        Store.addTopic(payload);
        UI.showToast('Topic added.', 'success');
      }
      UI.closeModal();
    });
  }

  function openSessionModal(existingId = null, prefill = {}) {
    const state = Store.getState();
    if (state.modules.length === 0 || state.topics.length === 0) {
      UI.showToast('Create at least one module and topic before logging a study session.', 'warning');
      return;
    }

    const ses = existingId ? state.sessions.find((s) => s.id === existingId) : null;
    const preTopic = prefill.topicId ? state.topics.find((t) => t.id === prefill.topicId) : null;
    const initModuleId = ses ? ses.moduleId : (preTopic ? preTopic.moduleId : state.modules[0].id);

    const renderTopicOptions = (modId, selectedTopicId) => {
      const modTopics = state.topics.filter((t) => t.moduleId === modId);
      if (modTopics.length === 0) {
        return `<option value="">No topics in this module</option>`;
      }
      return modTopics.map((t) => `<option value="${t.id}" ${t.id === selectedTopicId ? 'selected' : ''}>${UI.escapeHtml(t.name)}</option>`).join('');
    };

    const initTopicId = ses ? ses.topicId : (preTopic ? preTopic.id : (state.topics.find((t) => t.moduleId === initModuleId)?.id || ''));
    const initDate = ses ? ses.date : (prefill.date || Store.getTodayStr());
    const initStart = ses ? ses.startTime : '09:00';
    const initEnd = ses ? ses.endTime : '10:00';
    const initDur = ses ? ses.durationMinutes : Store.calculateDurationMinutes(initStart, initEnd);

    UI.openModal(ses ? 'Edit Study Session' : 'Log Study Session', `
      <form id="session-form">
        <div class="form-grid">
          <div class="form-group">
            <label for="ses-date">Date *</label>
            <input id="ses-date" class="form-control" type="date" required value="${initDate}" />
          </div>
          <div class="form-group">
            <label for="ses-status">Session Status</label>
            <select id="ses-status" class="form-control">
              ${['Completed', 'In Progress', 'Paused'].map((st) => `<option value="${st}" ${(ses ? ses.status : 'Completed') === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="ses-module">Module *</label>
            <select id="ses-module" class="form-control" required>
              ${state.modules.map((m) => `<option value="${m.id}" ${m.id === initModuleId ? 'selected' : ''}>${UI.escapeHtml(m.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="ses-topic">Topic *</label>
            <select id="ses-topic" class="form-control" required>
              ${renderTopicOptions(initModuleId, initTopicId)}
            </select>
          </div>
          <div class="form-group">
            <label for="ses-start">Start Time *</label>
            <input id="ses-start" class="form-control" type="time" required value="${initStart}" />
          </div>
          <div class="form-group">
            <label for="ses-end">End Time *</label>
            <input id="ses-end" class="form-control" type="time" required value="${initEnd}" />
          </div>
        </div>
        <div class="form-group">
          <label>Calculated Duration</label>
          <div id="ses-duration-preview" style="font-weight:700;color:var(--primary);padding:6px 0;">${UI.formatDuration(initDur)} (${initDur} mins)</div>
        </div>
        <div class="form-group">
          <label for="ses-notes">Study Notes</label>
          <textarea id="ses-notes" class="form-control" placeholder="What did you cover or accomplish?">${UI.escapeHtml(ses ? ses.notes : '')}</textarea>
        </div>
        <div id="ses-form-error" class="form-error hidden"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">${ses ? 'Save Session' : 'Log Session'}</button>
        </div>
      </form>
    `);

    const modSelect = document.getElementById('ses-module');
    const topSelect = document.getElementById('ses-topic');
    const startInput = document.getElementById('ses-start');
    const endInput = document.getElementById('ses-end');
    const durPreview = document.getElementById('ses-duration-preview');

    const updateDur = () => {
      const mins = Store.calculateDurationMinutes(startInput.value, endInput.value);
      durPreview.textContent = mins > 0
        ? `${UI.formatDuration(mins)} (${mins} mins)`
        : 'End time must be after start time';
      durPreview.style.color = mins > 0 ? 'var(--primary)' : 'var(--danger)';
    };

    modSelect.addEventListener('change', () => {
      topSelect.innerHTML = renderTopicOptions(modSelect.value, '');
    });
    startInput.addEventListener('change', updateDur);
    endInput.addEventListener('change', updateDur);

    document.getElementById('session-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const errEl = document.getElementById('ses-form-error');
      const date = document.getElementById('ses-date').value;
      const moduleId = modSelect.value;
      const topicId = topSelect.value;
      const startTime = startInput.value;
      const endTime = endInput.value;
      const durationMinutes = Store.calculateDurationMinutes(startTime, endTime);

      if (!date || !moduleId || !topicId) {
        errEl.textContent = 'Date, module, and topic are required.';
        errEl.classList.remove('hidden');
        return;
      }
      if (durationMinutes <= 0) {
        errEl.textContent = 'End time must be after start time.';
        errEl.classList.remove('hidden');
        return;
      }

      const payload = {
        date,
        moduleId,
        topicId,
        startTime,
        endTime,
        durationMinutes,
        status: document.getElementById('ses-status').value,
        notes: document.getElementById('ses-notes').value.trim()
      };

      if (ses) {
        Store.updateSession(ses.id, payload);
        UI.showToast('Study session updated.', 'success');
      } else {
        Store.addSession(payload);
        UI.showToast('Study session logged!', 'success');
      }
      UI.closeModal();
    });
  }

  // --- Global Search ---
  function initGlobalSearch() {
    const input = document.getElementById('global-search-input');
    const dropdown = document.getElementById('global-search-results');
    if (!input || !dropdown) return;

    const runSearch = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        return;
      }
      const state = Store.getState();
      const modMap = new Map(state.modules.map((m) => [m.id, m]));
      const matches = [];

      state.modules.forEach((m) => {
        if (m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) {
          matches.push({ type: 'module', id: m.id, title: m.name, meta: `Module • ${m.category}` });
        }
      });

      state.topics.forEach((t) => {
        if (t.name.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q)) {
          const mod = modMap.get(t.moduleId);
          matches.push({ type: 'topic', id: t.id, title: t.name, meta: `Topic in ${mod ? mod.name : 'Module'} • ${t.status}` });
        }
      });

      state.sessions.forEach((s) => {
        if (s.notes.toLowerCase().includes(q)) {
          const mod = modMap.get(s.moduleId);
          matches.push({ type: 'session', id: s.id, title: s.notes.slice(0, 50), meta: `Study Note on ${UI.formatDate(s.date)} • ${mod ? mod.name : ''}` });
        }
      });

      if (matches.length === 0) {
        dropdown.innerHTML = `<div class="search-result-item"><span class="search-result-meta">No matching modules, topics, or notes.</span></div>`;
      } else {
        dropdown.innerHTML = matches.slice(0, 10).map((item) => `
          <div class="search-result-item" data-search-type="${item.type}" data-search-id="${item.id}">
            <div class="search-result-title">${UI.escapeHtml(item.title)}</div>
            <div class="search-result-meta">${UI.escapeHtml(item.meta)}</div>
          </div>
        `).join('');
      }
      dropdown.classList.remove('hidden');
    };

    input.addEventListener('input', runSearch);
    input.addEventListener('focus', runSearch);

    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item');
      if (!item || !item.dataset.searchType) return;
      const { searchType, searchId } = item.dataset;
      dropdown.classList.add('hidden');
      input.value = '';
      if (searchType === 'module') {
        setView('modules');
        openModuleDetailModal(searchId);
      } else if (searchType === 'topic') {
        openTopicModal(searchId);
      } else if (searchType === 'session') {
        setView('study-log');
        openSessionModal(searchId);
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.global-search-wrap')) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // --- Event Delegation ---
  document.addEventListener('click', async (e) => {
    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) {
      setView(navBtn.dataset.nav);
      return;
    }

    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id;

    switch (action) {
      case 'close-modal':
        UI.closeModal();
        break;
      case 'new-module':
        openModuleModal();
        break;
      case 'edit-module':
        openModuleModal(id);
        break;
      case 'view-module':
        openModuleDetailModal(id);
        break;
      case 'delete-module': {
        const ok = await UI.confirmAction({
          title: 'Delete Module',
          message: 'Deleting this module will also delete all its topics and logged study sessions. Continue?',
          confirmText: 'Delete Module'
        });
        if (ok) {
          Store.deleteModule(id);
          UI.showToast('Module deleted.', 'info');
        }
        break;
      }
      case 'toggle-module-topics':
        if (uiState.expandedModules.has(id)) uiState.expandedModules.delete(id);
        else uiState.expandedModules.add(id);
        render();
        break;
      case 'new-topic':
        openTopicModal();
        break;
      case 'new-topic-in-module':
        openTopicModal(null, id);
        break;
      case 'edit-topic':
        openTopicModal(id);
        break;
      case 'delete-topic': {
        const ok = await UI.confirmAction({
          title: 'Delete Topic',
          message: 'Delete this topic and its associated study sessions?',
          confirmText: 'Delete Topic'
        });
        if (ok) {
          Store.deleteTopic(id);
          UI.showToast('Topic deleted.', 'info');
        }
        break;
      }
      case 'new-session':
        openSessionModal();
        break;
      case 'log-for-topic':
        openSessionModal(null, { topicId: id });
        break;
      case 'new-session-on-date':
        openSessionModal(null, { date: actionEl.dataset.date });
        break;
      case 'edit-session':
        openSessionModal(id);
        break;
      case 'delete-session': {
        const ok = await UI.confirmAction({
          title: 'Delete Study Session',
          message: 'Remove this study session from your log?',
          confirmText: 'Delete'
        });
        if (ok) {
          Store.deleteSession(id);
          UI.showToast('Study session deleted.', 'info');
        }
        break;
      }
      case 'study-log-tab':
        uiState.studyLogTab = actionEl.dataset.tab;
        render();
        break;
      case 'cal-prev':
        if (uiState.calMonth === 0) { uiState.calMonth = 11; uiState.calYear--; }
        else { uiState.calMonth--; }
        render();
        break;
      case 'cal-next':
        if (uiState.calMonth === 11) { uiState.calMonth = 0; uiState.calYear++; }
        else { uiState.calMonth++; }
        render();
        break;
      case 'cal-today': {
        const nowStr = Store.getTodayStr();
        const [y, m] = nowStr.split('-').map(Number);
        uiState.calYear = y;
        uiState.calMonth = m - 1;
        uiState.calSelectedDate = nowStr;
        render();
        break;
      }
      case 'cal-select-date':
        uiState.calSelectedDate = actionEl.dataset.date;
        render();
        break;
      case 'export-json':
        UI.downloadFile(`studytrack-backup-${Store.getTodayStr()}.json`, Store.exportJSON(), 'application/json');
        UI.showToast('JSON backup exported.', 'success');
        break;
      case 'export-csv':
        UI.downloadFile(`studytrack-report-${Store.getTodayStr()}.csv`, Store.exportCSV(), 'text/csv;charset=utf-8');
        UI.showToast('CSV report exported.', 'success');
        break;
      case 'load-sample':
        Store.loadSampleData();
        UI.showToast('Sample data loaded!', 'success');
        break;
      case 'reset-all': {
        const ok = await UI.confirmAction({
          title: 'Reset All Data',
          message: 'This will permanently erase all your modules, topics, and study sessions in LocalStorage. This cannot be undone.',
          confirmText: 'Erase Everything'
        });
        if (ok) {
          Store.resetAllData();
          UI.showToast('All application data has been reset.', 'info');
        }
        break;
      }
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.action === 'toggle-topic') {
      Store.toggleTopicComplete(el.dataset.id);
      UI.showToast('Topic status updated.', 'success');
    } else if (el.dataset.action === 'change-topic-status') {
      Store.updateTopic(el.dataset.id, { status: el.value });
      UI.showToast('Topic status updated.', 'success');
    }
  });

  // --- Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('sidebar-nav').addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-item');
      if (btn && btn.dataset.view) {
        setView(btn.dataset.view);
      }
    });

    document.getElementById('mobile-menu-btn').addEventListener('click', openMobileSidebar);
    document.getElementById('sidebar-close-btn').addEventListener('click', closeMobileSidebar);
    document.getElementById('sidebar-backdrop').addEventListener('click', closeMobileSidebar);

    document.getElementById('modal-close-btn').addEventListener('click', UI.closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') UI.closeModal();
    });

    document.getElementById('quick-add-topic-btn').addEventListener('click', () => openTopicModal());
    document.getElementById('quick-add-session-btn').addEventListener('click', () => openSessionModal());

    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
      const current = Store.getState().settings.theme;
      Store.updateSettings({ theme: current === 'dark' ? 'light' : 'dark' });
    });

    initGlobalSearch();
    Store.subscribe(() => render());
    render();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        UI.closeModal();
        const searchDrop = document.getElementById('global-search-results');
        if (searchDrop) searchDrop.classList.add('hidden');
      }
    });

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  });
})(window);

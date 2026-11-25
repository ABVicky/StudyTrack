/**
 * views.js - Renders all 8 application views and returns view-specific HTML & chart hooks.
 */
(function (global) {
  'use strict';

  const {
    escapeHtml,
    formatDuration,
    formatHours,
    formatDate,
    priorityBadge,
    statusBadge,
    dueBadge,
    renderChart
  } = global.StudyUI;

  const { isTopicOverdue, getDueBucket } = global.StudyAnalytics;

  function renderDashboard(state, stats) {
    const modMap = new Map(state.modules.map((m) => [m.id, m]));
    const emptyStateHtml = state.modules.length === 0
      ? `<div class="card" style="margin-bottom:20px;">
          <div class="empty-state">
            <h3>Start Your Learning Journey</h3>
            <p>Create your first module or load sample data to explore all dashboard analytics.</p>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
              <button class="btn btn-primary" data-action="new-module">+ Create First Module</button>
              <button class="btn btn-secondary" data-action="load-sample">Load Sample Data</button>
            </div>
          </div>
        </div>`
      : '';

    const html = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Welcome back, ${escapeHtml(state.settings.userName)} — ${formatDate(stats.todayStr)}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" data-action="new-module">+ New Module</button>
          <button class="btn btn-secondary btn-sm" data-action="new-topic">+ New Topic</button>
          <button class="btn btn-primary btn-sm" data-action="new-session">+ Log Study Session</button>
        </div>
      </div>

      ${emptyStateHtml}

      <div class="motivation-banner">
        <div class="motivation-text">
          <h2>Study Focus & Goals</h2>
          <p>${escapeHtml(stats.motivationalMessage)}</p>
        </div>
        <div class="goal-pills">
          <div class="goal-pill">
            <div class="goal-pill-head">
              <span>Daily Goal (${state.settings.dailyGoalHours}h)</span>
              <strong>${stats.dailyGoalPct}%</strong>
            </div>
            <div class="progress-bar"><div class="progress-fill ${stats.dailyGoalPct >= 100 ? 'success' : ''}" style="width:${stats.dailyGoalPct}%"></div></div>
          </div>
          <div class="goal-pill">
            <div class="goal-pill-head">
              <span>Weekly Goal (${state.settings.weeklyGoalHours}h)</span>
              <strong>${stats.weeklyGoalPct}%</strong>
            </div>
            <div class="progress-bar"><div class="progress-fill ${stats.weeklyGoalPct >= 100 ? 'success' : ''}" style="width:${stats.weeklyGoalPct}%"></div></div>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Modules</div>
          <div class="stat-value">${stats.totalModules}</div>
          <div class="stat-sub">${state.modules.filter((m) => m.status === 'Completed').length} completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Topics</div>
          <div class="stat-value">${stats.totalTopics}</div>
          <div class="stat-sub">${stats.overdueTopics} overdue</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Completed Topics</div>
          <div class="stat-value" style="color:var(--success)">${stats.completedTopics}</div>
          <div class="stat-sub">${stats.completionPct}% syllabus done</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pending Topics</div>
          <div class="stat-value" style="color:var(--warning)">${stats.pendingTopics}</div>
          <div class="stat-sub">${stats.inProgressTopics} currently in progress</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">In Progress</div>
          <div class="stat-value" style="color:var(--primary)">${stats.inProgressTopics}</div>
          <div class="stat-sub">Active learning topics</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Syllabus Completion</div>
          <div class="stat-value">${stats.completionPct}%</div>
          <div class="stat-sub">${stats.completedTopics} of ${stats.totalTopics} topics</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Study Hours</div>
          <div class="stat-value">${formatHours(stats.totalStudyMinutes)}</div>
          <div class="stat-sub">${state.sessions.length} logged sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Study Hours Today</div>
          <div class="stat-value">${formatHours(stats.todayStudyMinutes)}</div>
          <div class="stat-sub">Streak: ${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'} (Best: ${stats.longestStreak})</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div class="card-header" style="margin-bottom:8px;">
          <h3 class="card-title">Overall Syllabus Progress</h3>
          <span class="badge badge-primary">${stats.completionPct}% Complete</span>
        </div>
        <div class="progress-bar progress-bar-lg">
          <div class="progress-fill ${stats.completionPct === 100 ? 'success' : ''}" style="width:${stats.completionPct}%"></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Weekly Study Activity (Hours)</h3>
          </div>
          <div class="chart-box">
            <canvas id="dash-weekly-chart"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Module-wise Completion (%)</h3>
          </div>
          <div class="chart-box">
            <canvas id="dash-module-chart"></canvas>
          </div>
        </div>
      </div>

      <div class="grid-3">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Continue Learning</h3>
            <button class="btn btn-ghost btn-xs" data-nav="topics">View all</button>
          </div>
          ${stats.continueLearning.length === 0
            ? `<p style="color:var(--text-muted);font-size:13px;">No topics currently in progress.</p>`
            : `<div class="item-list">
                ${stats.continueLearning.map((t) => {
                  const mod = modMap.get(t.moduleId);
                  return `
                    <div class="list-row">
                      <div class="list-row-content">
                        <div class="list-row-title">
                          <span class="color-dot" style="background:${mod ? mod.color : '#4f46e5'}"></span>
                          <span>${escapeHtml(t.name)}</span>
                        </div>
                        <div class="list-row-meta">
                          <span>${escapeHtml(mod ? mod.name : '')}</span>
                          <span>${formatDuration(t.actualMinutes)} / ${formatDuration(t.estimatedMinutes)}</span>
                        </div>
                      </div>
                      <button class="btn btn-secondary btn-xs" data-action="log-for-topic" data-id="${t.id}">Log</button>
                    </div>`;
                }).join('')}
              </div>`}
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Upcoming & Overdue</h3>
            <button class="btn btn-ghost btn-xs" data-nav="pending">View all</button>
          </div>
          ${stats.upcomingAndOverdue.length === 0
            ? `<p style="color:var(--text-muted);font-size:13px;">No upcoming or overdue topics.</p>`
            : `<div class="item-list">
                ${stats.upcomingAndOverdue.map((t) => {
                  const mod = modMap.get(t.moduleId);
                  return `
                    <div class="list-row">
                      <div class="list-row-main">
                        <input type="checkbox" class="topic-check" data-action="toggle-topic" data-id="${t.id}" ${t.status === 'Completed' ? 'checked' : ''} />
                        <div class="list-row-content">
                          <div class="list-row-title">${escapeHtml(t.name)}</div>
                          <div class="list-row-meta">
                            <span>${escapeHtml(mod ? mod.name : '')}</span>
                            ${dueBadge(t, stats.todayStr)}
                          </div>
                        </div>
                      </div>
                    </div>`;
                }).join('')}
              </div>`}
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recently Completed</h3>
          </div>
          ${stats.recentlyCompleted.length === 0
            ? `<p style="color:var(--text-muted);font-size:13px;">Complete a topic to see it here.</p>`
            : `<div class="item-list">
                ${stats.recentlyCompleted.map((t) => {
                  const mod = modMap.get(t.moduleId);
                  return `
                    <div class="list-row">
                      <div class="list-row-content">
                        <div class="list-row-title">${escapeHtml(t.name)}</div>
                        <div class="list-row-meta">
                          <span>${escapeHtml(mod ? mod.name : '')}</span>
                          <span>Done ${formatDate(t.completionDate)}</span>
                        </div>
                      </div>
                      <span class="badge badge-success">Done</span>
                    </div>`;
                }).join('')}
              </div>`}
        </div>
      </div>
    `;

    const afterRender = () => {
      renderChart('dash-weekly-chart', {
        type: 'bar',
        data: {
          labels: stats.weeklyActivity.map((d) => d.label),
          datasets: [{
            label: 'Hours Studied',
            data: stats.weeklyActivity.map((d) => Number((d.minutes / 60).toFixed(2))),
            backgroundColor: '#4f46e5',
            borderRadius: 6
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });

      renderChart('dash-module-chart', {
        type: 'bar',
        data: {
          labels: stats.moduleStats.map((ms) => ms.module.name),
          datasets: [{
            label: 'Completion %',
            data: stats.moduleStats.map((ms) => ms.completionPct),
            backgroundColor: stats.moduleStats.map((ms) => ms.module.color || '#4f46e5'),
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, max: 100 } }
        }
      });
    };

    return { html, afterRender };
  }

  function renderModules(state, stats, uiState) {
    const filterStatus = uiState.modulesFilterStatus || 'All';
    const filterPriority = uiState.modulesFilterPriority || 'All';
    const expanded = uiState.expandedModules || new Set();

    const filtered = stats.moduleStats.filter((ms) => {
      if (filterStatus !== 'All' && ms.module.status !== filterStatus) return false;
      if (filterPriority !== 'All' && ms.module.priority !== filterPriority) return false;
      return true;
    });

    const html = `
      <div class="page-header">
        <div>
          <h1 class="page-title">My Modules</h1>
          <p class="page-subtitle">Organize your subjects, track syllabus completion, and manage module topics.</p>
        </div>
        <button class="btn btn-primary" data-action="new-module">+ Add Module</button>
      </div>

      <div class="filter-bar">
        <label style="font-size:12px;font-weight:600;color:var(--text-muted)">Status:</label>
        <select id="mod-filter-status">
          <option value="All" ${filterStatus === 'All' ? 'selected' : ''}>All Statuses</option>
          <option value="Not Started" ${filterStatus === 'Not Started' ? 'selected' : ''}>Not Started</option>
          <option value="In Progress" ${filterStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Completed" ${filterStatus === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
        <label style="font-size:12px;font-weight:600;color:var(--text-muted)">Priority:</label>
        <select id="mod-filter-priority">
          <option value="All" ${filterPriority === 'All' ? 'selected' : ''}>All Priorities</option>
          <option value="High" ${filterPriority === 'High' ? 'selected' : ''}>High</option>
          <option value="Medium" ${filterPriority === 'Medium' ? 'selected' : ''}>Medium</option>
          <option value="Low" ${filterPriority === 'Low' ? 'selected' : ''}>Low</option>
        </select>
      </div>

      ${filtered.length === 0
        ? `<div class="empty-state">
            <h3>No Modules Found</h3>
            <p>Create a study module to organize your topics and track progress.</p>
            <button class="btn btn-primary" data-action="new-module">+ Add Module</button>
          </div>`
        : `<div class="modules-grid">
            ${filtered.map((ms) => {
              const m = ms.module;
              const isOpen = expanded.has(m.id);
              const modTopics = state.topics.filter((t) => t.moduleId === m.id);
              return `
                <div class="module-card">
                  <div class="module-accent" style="background:${escapeHtml(m.color)}"></div>
                  <div class="module-card-body">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                      <div>
                        <span class="badge badge-neutral" style="margin-bottom:6px;">${escapeHtml(m.category)}</span>
                        <h3 style="margin:0;font-size:16px;font-weight:700;">${escapeHtml(m.name)}</h3>
                      </div>
                      <div style="display:flex;gap:4px;">
                        ${priorityBadge(m.priority)}
                        ${statusBadge(m.status)}
                      </div>
                    </div>
                    ${m.description ? `<p style="margin:0;color:var(--text-secondary);font-size:13px;">${escapeHtml(m.description)}</p>` : ''}
                    <div>
                      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;color:var(--text-secondary);">
                        <span>${ms.completedTopics}/${ms.totalTopics} topics completed</span>
                        <strong>${ms.completionPct}%</strong>
                      </div>
                      <div class="progress-bar">
                        <div class="progress-fill ${ms.completionPct === 100 ? 'success' : ''}" style="width:${ms.completionPct}%;background:${ms.completionPct === 100 ? '' : escapeHtml(m.color)}"></div>
                      </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);flex-wrap:wrap;gap:8px;">
                      <span>Logged: <strong>${formatDuration(ms.sessionMinutes)}</strong></span>
                      <span>Target: <strong>${m.targetDate ? formatDate(m.targetDate) : 'Not set'}</strong></span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:4px;border-top:1px solid var(--border);">
                      <button class="btn btn-secondary btn-xs" data-action="toggle-module-topics" data-id="${m.id}">
                        ${isOpen ? 'Hide Topics' : `Topics (${modTopics.length})`}
                      </button>
                      <div style="display:flex;gap:6px;">
                        <button class="btn btn-ghost btn-xs" data-action="new-topic-in-module" data-id="${m.id}">+ Topic</button>
                        <button class="btn btn-ghost btn-xs" data-action="view-module" data-id="${m.id}">Details</button>
                        <button class="btn btn-ghost btn-xs" data-action="edit-module" data-id="${m.id}">Edit</button>
                        <button class="btn btn-ghost btn-xs" style="color:var(--danger)" data-action="delete-module" data-id="${m.id}">Delete</button>
                      </div>
                    </div>
                  </div>
                  ${isOpen ? `
                    <div class="module-topics-drawer">
                      ${modTopics.length === 0
                        ? `<div style="font-size:12.5px;color:var(--text-muted);">No topics in this module yet.</div>`
                        : modTopics.map((t) => `
                          <div class="list-row" style="padding:8px 10px;">
                            <div class="list-row-main">
                              <input type="checkbox" class="topic-check" data-action="toggle-topic" data-id="${t.id}" ${t.status === 'Completed' ? 'checked' : ''} />
                              <div class="list-row-content">
                                <div class="list-row-title ${t.status === 'Completed' ? 'completed-text' : ''}" style="font-size:13px;">${escapeHtml(t.name)}</div>
                                <div class="list-row-meta">
                                  ${statusBadge(t.status)}
                                  ${dueBadge(t, stats.todayStr)}
                                </div>
                              </div>
                            </div>
                            <button class="btn btn-ghost btn-xs" data-action="edit-topic" data-id="${t.id}">Edit</button>
                          </div>
                        `).join('')}
                    </div>
                  ` : ''}
                </div>`;
            }).join('')}
          </div>`}
    `;

    return { html };
  }

  function renderTopics(state, stats, uiState) {
    const modMap = new Map(state.modules.map((m) => [m.id, m]));
    let fMod = uiState.topicsFilterModule || 'All';
    if (fMod !== 'All' && !modMap.has(fMod)) {
      fMod = 'All';
      uiState.topicsFilterModule = 'All';
    }
    const fStatus = uiState.topicsFilterStatus || 'All';
    const fPriority = uiState.topicsFilterPriority || 'All';
    const fDue = uiState.topicsFilterDue || 'All';
    const sortBy = uiState.topicsSort || 'dueDate';

    let list = state.topics.filter((t) => {
      if (fMod !== 'All' && t.moduleId !== fMod) return false;
      if (fStatus !== 'All' && t.status !== fStatus) return false;
      if (fPriority !== 'All' && t.priority !== fPriority) return false;
      if (fDue !== 'All') {
        const bucket = getDueBucket(t, stats.todayStr);
        if (fDue === 'overdue' && bucket !== 'overdue') return false;
        if (fDue === 'today' && bucket !== 'today') return false;
        if (fDue === 'week' && !['today', 'tomorrow', 'week'].includes(bucket)) return false;
      }
      return true;
    });

    const prioRank = { High: 0, Medium: 1, Low: 2 };
    list = [...list].sort((a, b) => {
      if (sortBy === 'priority') return (prioRank[a.priority] ?? 9) - (prioRank[b.priority] ?? 9);
      if (sortBy === 'recent') return b.createdAt.localeCompare(a.createdAt);
      if (sortBy === 'alpha') return a.name.localeCompare(b.name);
      // dueDate
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    const html = `
      <div class="page-header">
        <div>
          <h1 class="page-title">All Topics</h1>
          <p class="page-subtitle">Track every syllabus topic, notes, due dates, and estimated vs actual study time.</p>
        </div>
        <button class="btn btn-primary" data-action="new-topic">+ Add Topic</button>
      </div>

      <div class="filter-bar">
        <select id="top-filter-module">
          <option value="All">All Modules</option>
          ${state.modules.map((m) => `<option value="${m.id}" ${fMod === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}
        </select>
        <select id="top-filter-status">
          <option value="All" ${fStatus === 'All' ? 'selected' : ''}>All Statuses</option>
          <option value="Not Started" ${fStatus === 'Not Started' ? 'selected' : ''}>Not Started</option>
          <option value="In Progress" ${fStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Completed" ${fStatus === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="On Hold" ${fStatus === 'On Hold' ? 'selected' : ''}>On Hold</option>
        </select>
        <select id="top-filter-priority">
          <option value="All" ${fPriority === 'All' ? 'selected' : ''}>All Priorities</option>
          <option value="High" ${fPriority === 'High' ? 'selected' : ''}>High</option>
          <option value="Medium" ${fPriority === 'Medium' ? 'selected' : ''}>Medium</option>
          <option value="Low" ${fPriority === 'Low' ? 'selected' : ''}>Low</option>
        </select>
        <select id="top-filter-due">
          <option value="All" ${fDue === 'All' ? 'selected' : ''}>Any Due Date</option>
          <option value="overdue" ${fDue === 'overdue' ? 'selected' : ''}>Overdue</option>
          <option value="today" ${fDue === 'today' ? 'selected' : ''}>Due Today</option>
          <option value="week" ${fDue === 'week' ? 'selected' : ''}>Due This Week</option>
        </select>
        <select id="top-sort">
          <option value="dueDate" ${sortBy === 'dueDate' ? 'selected' : ''}>Sort: Due Date</option>
          <option value="priority" ${sortBy === 'priority' ? 'selected' : ''}>Sort: Priority</option>
          <option value="recent" ${sortBy === 'recent' ? 'selected' : ''}>Sort: Recently Added</option>
          <option value="alpha" ${sortBy === 'alpha' ? 'selected' : ''}>Sort: Alphabetical</option>
        </select>
      </div>

      ${list.length === 0
        ? `<div class="empty-state">
            <h3>No Topics Found</h3>
            <p>${state.modules.length === 0 ? 'Create a module first, then add topics to it.' : 'Try adjusting your filters or add a new topic.'}</p>
            <button class="btn btn-primary" data-action="${state.modules.length === 0 ? 'new-module' : 'new-topic'}">
              ${state.modules.length === 0 ? '+ Create Module' : '+ Add Topic'}
            </button>
          </div>`
        : `<div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:36px;"></th>
                  <th>Topic</th>
                  <th>Module</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Est. / Actual</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${list.map((t) => {
                  const mod = modMap.get(t.moduleId);
                  return `
                    <tr>
                      <td><input type="checkbox" class="topic-check" data-action="toggle-topic" data-id="${t.id}" ${t.status === 'Completed' ? 'checked' : ''} /></td>
                      <td>
                        <div style="font-weight:600;${t.status === 'Completed' ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${escapeHtml(t.name)}</div>
                        ${t.notes ? `<div style="font-size:12px;color:var(--text-muted);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.notes)}</div>` : ''}
                      </td>
                      <td>
                        <span style="display:inline-flex;align-items:center;gap:6px;">
                          <span class="color-dot" style="background:${mod ? mod.color : '#4f46e5'}"></span>
                          <span>${escapeHtml(mod ? mod.name : 'Unknown')}</span>
                        </span>
                      </td>
                      <td>${priorityBadge(t.priority)}</td>
                      <td>
                        <select class="form-control" style="padding:3px 6px;font-size:12px;width:auto;" data-action="change-topic-status" data-id="${t.id}">
                          ${['Not Started', 'In Progress', 'Completed', 'On Hold'].map((st) => `<option value="${st}" ${t.status === st ? 'selected' : ''}>${st}</option>`).join('')}
                        </select>
                      </td>
                      <td>${dueBadge(t, stats.todayStr)}</td>
                      <td style="white-space:nowrap;">${formatDuration(t.estimatedMinutes)} / <strong>${formatDuration(t.actualMinutes)}</strong></td>
                      <td style="text-align:right;white-space:nowrap;">
                        <button class="btn btn-ghost btn-xs" data-action="log-for-topic" data-id="${t.id}">Log</button>
                        <button class="btn btn-ghost btn-xs" data-action="edit-topic" data-id="${t.id}">Edit</button>
                        <button class="btn btn-ghost btn-xs" style="color:var(--danger)" data-action="delete-topic" data-id="${t.id}">Delete</button>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`}
    `;

    return { html };
  }

  function renderStudyLog(state, stats, uiState) {
    const modMap = new Map(state.modules.map((m) => [m.id, m]));
    const topMap = new Map(state.topics.map((t) => [t.id, t]));
    const tab = uiState.studyLogTab || 'sessions';

    const sortedSessions = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

    // Per-day totals
    const dayTotals = Object.entries(stats.minutesByDate)
      .sort((a, b) => b[0].localeCompare(a[0]));

    const html = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Daily Study Log</h1>
          <p class="page-subtitle">Log focused study sessions and review daily, weekly, and monthly totals.</p>
        </div>
        <button class="btn btn-primary" data-action="new-session">+ Log Study Session</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Today</div>
          <div class="stat-value">${formatHours(stats.todayStudyMinutes)}</div>
          <div class="stat-sub">${stats.dailyGoalPct}% of daily goal</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Last 7 Days</div>
          <div class="stat-value">${formatHours(stats.weeklyStudyMinutes)}</div>
          <div class="stat-sub">${stats.weeklyGoalPct}% of weekly goal</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Last 30 Days</div>
          <div class="stat-value">${formatHours(stats.monthlyStudyMinutes)}</div>
          <div class="stat-sub">Rolling monthly total</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Overall Total</div>
          <div class="stat-value">${formatHours(stats.totalStudyMinutes)}</div>
          <div class="stat-sub">${state.sessions.length} total sessions</div>
        </div>
      </div>

      <div class="filter-bar">
        <button class="btn btn-sm ${tab === 'sessions' ? 'btn-primary' : 'btn-secondary'}" data-action="study-log-tab" data-tab="sessions">Session History (${sortedSessions.length})</button>
        <button class="btn btn-sm ${tab === 'daily' ? 'btn-primary' : 'btn-secondary'}" data-action="study-log-tab" data-tab="daily">By Day (${dayTotals.length})</button>
        <button class="btn btn-sm ${tab === 'modules' ? 'btn-primary' : 'btn-secondary'}" data-action="study-log-tab" data-tab="modules">By Module</button>
        <button class="btn btn-sm ${tab === 'topics' ? 'btn-primary' : 'btn-secondary'}" data-action="study-log-tab" data-tab="topics">By Topic</button>
      </div>

      ${tab === 'sessions' ? (
        sortedSessions.length === 0
          ? `<div class="empty-state">
              <h3>No Study Sessions Logged</h3>
              <p>Record your first study session to start tracking daily hours and streaks.</p>
              <button class="btn btn-primary" data-action="new-session">+ Log Study Session</button>
            </div>`
          : `<div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Module</th>
                    <th>Topic</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedSessions.map((s) => {
                    const mod = modMap.get(s.moduleId);
                    const top = topMap.get(s.topicId);
                    return `
                      <tr>
                        <td style="white-space:nowrap;">${formatDate(s.date)}</td>
                        <td>
                          <span style="display:inline-flex;align-items:center;gap:6px;">
                            <span class="color-dot" style="background:${mod ? mod.color : '#4f46e5'}"></span>
                            <span>${escapeHtml(mod ? mod.name : 'Unknown')}</span>
                          </span>
                        </td>
                        <td style="font-weight:600;">${escapeHtml(top ? top.name : 'Unknown')}</td>
                        <td style="white-space:nowrap;">${escapeHtml(s.startTime)} – ${escapeHtml(s.endTime)}</td>
                        <td><strong>${formatDuration(s.durationMinutes)}</strong></td>
                        <td>${statusBadge(s.status)}</td>
                        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.notes || '—')}</td>
                        <td style="text-align:right;white-space:nowrap;">
                          <button class="btn btn-ghost btn-xs" data-action="edit-session" data-id="${s.id}">Edit</button>
                          <button class="btn btn-ghost btn-xs" style="color:var(--danger)" data-action="delete-session" data-id="${s.id}">Delete</button>
                        </td>
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>`
      ) : ''}

      ${tab === 'daily' ? `
        <div class="card">
          <div class="item-list">
            ${dayTotals.length === 0 ? '<p style="color:var(--text-muted);">No daily study records yet.</p>' : dayTotals.map(([date, mins]) => `
              <div class="list-row">
                <div class="list-row-content">
                  <div class="list-row-title">${formatDate(date)}</div>
                  <div class="list-row-meta">${state.sessions.filter((s) => s.date === date).length} session(s)</div>
                </div>
                <strong>${formatDuration(mins)}</strong>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${tab === 'modules' ? `
        <div class="card">
          <div class="item-list">
            ${stats.moduleStats.length === 0 ? '<p style="color:var(--text-muted);">No modules yet.</p>' : stats.moduleStats.map((ms) => `
              <div class="list-row">
                <div class="list-row-content">
                  <div class="list-row-title">
                    <span class="color-dot" style="background:${ms.module.color}"></span>
                    <span>${escapeHtml(ms.module.name)}</span>
                  </div>
                  <div class="list-row-meta">${ms.completedTopics}/${ms.totalTopics} topics completed</div>
                </div>
                <strong>${formatDuration(ms.sessionMinutes)}</strong>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${tab === 'topics' ? `
        <div class="card">
          <div class="item-list">
            ${state.topics.length === 0 ? '<p style="color:var(--text-muted);">No topics yet.</p>' : state.topics.map((t) => {
              const mod = modMap.get(t.moduleId);
              const logged = stats.minutesByTopic[t.id] || 0;
              return `
                <div class="list-row">
                  <div class="list-row-content">
                    <div class="list-row-title">${escapeHtml(t.name)}</div>
                    <div class="list-row-meta">${escapeHtml(mod ? mod.name : '')}</div>
                  </div>
                  <strong>${formatDuration(logged)}</strong>
                </div>`;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;

    return { html };
  }

  function renderCalendar(state, stats, uiState) {
    const year = uiState.calYear;
    const month = uiState.calMonth; // 0-indexed
    const selectedDate = uiState.calSelectedDate || stats.todayStr;
    const modMap = new Map(state.modules.map((m) => [m.id, m]));
    const topMap = new Map(state.topics.map((t) => [t.id, t]));

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const cells = [];
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const dt = new Date(year, month - 1, d);
      cells.push({ dateStr: toLocalDateStr(dt), dayNum: d, otherMonth: true });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      cells.push({ dateStr: toLocalDateStr(dt), dayNum: d, otherMonth: false });
    }
    // Trailing padding to 42 cells (6 weeks) or 35
    const totalCells = cells.length <= 35 ? 35 : 42;
    let nextD = 1;
    while (cells.length < totalCells) {
      const dt = new Date(year, month + 1, nextD++);
      cells.push({ dateStr: toLocalDateStr(dt), dayNum: dt.getDate(), otherMonth: true });
    }

    // Selected date items
    const dayTopics = state.topics.filter((t) => t.dueDate === selectedDate || t.startDate === selectedDate || t.completionDate === selectedDate);
    const daySessions = state.sessions.filter((s) => s.date === selectedDate);

    const html = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Calendar & Study Schedule</h1>
          <p class="page-subtitle">View topic deadlines, scheduled starts, completions, and daily study sessions.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="btn btn-secondary btn-sm" data-action="cal-prev">&larr; Prev</button>
          <button class="btn btn-secondary btn-sm" data-action="cal-today">Today</button>
          <button class="btn btn-secondary btn-sm" data-action="cal-next">Next &rarr;</button>
        </div>
      </div>

      <div class="calendar-layout">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${escapeHtml(monthLabel)}</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11.5px;">
              <span class="cal-chip completed">Completed</span>
              <span class="cal-chip pending">Due / Scheduled</span>
              <span class="cal-chip overdue">Overdue</span>
              <span class="cal-chip session">Session</span>
            </div>
          </div>
          <div class="calendar-grid">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => `<div class="calendar-weekday">${w}</div>`).join('')}
            ${cells.map((c) => {
              const dueHere = state.topics.filter((t) => t.dueDate === c.dateStr);
              const sessHere = state.sessions.filter((s) => s.date === c.dateStr);
              const isToday = c.dateStr === stats.todayStr;
              const isSel = c.dateStr === selectedDate;
              return `
                <div class="calendar-cell ${c.otherMonth ? 'other-month' : ''} ${isSel ? 'selected' : ''}" data-action="cal-select-date" data-date="${c.dateStr}">
                  <div class="calendar-day-num ${isToday ? 'today-num' : ''}">
                    <span>${c.dayNum}</span>
                    ${isToday ? '<span class="badge badge-primary" style="font-size:10px;padding:0 5px;">Today</span>' : ''}
                  </div>
                  <div class="calendar-dots">
                    ${dueHere.slice(0, 2).map((t) => {
                      const cls = t.status === 'Completed' ? 'completed' : isTopicOverdue(t, stats.todayStr) ? 'overdue' : 'pending';
                      return `<div class="cal-chip ${cls}" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</div>`;
                    }).join('')}
                    ${sessHere.length > 0 ? `<div class="cal-chip session">${sessHere.length} session${sessHere.length > 1 ? 's' : ''}</div>` : ''}
                    ${dueHere.length > 2 ? `<div style="font-size:10px;color:var(--text-muted)">+${dueHere.length - 2} more</div>` : ''}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${formatDate(selectedDate)}</h3>
            <button class="btn btn-primary btn-xs" data-action="new-session-on-date" data-date="${selectedDate}">+ Log Session</button>
          </div>

          <h4 style="margin:0 0 8px;font-size:13px;color:var(--text-secondary);">Topics (${dayTopics.length})</h4>
          ${dayTopics.length === 0
            ? `<p style="font-size:12.5px;color:var(--text-muted);margin-bottom:16px;">No topics scheduled or due on this date.</p>`
            : `<div class="item-list" style="margin-bottom:16px;">
                ${dayTopics.map((t) => {
                  const mod = modMap.get(t.moduleId);
                  return `
                    <div class="list-row" style="padding:8px 10px;">
                      <div class="list-row-content">
                        <div class="list-row-title" style="font-size:13px;">${escapeHtml(t.name)}</div>
                        <div class="list-row-meta">
                          <span>${escapeHtml(mod ? mod.name : '')}</span>
                          ${dueBadge(t, stats.todayStr)}
                        </div>
                      </div>
                    </div>`;
                }).join('')}
              </div>`}

          <h4 style="margin:0 0 8px;font-size:13px;color:var(--text-secondary);">Study Sessions (${daySessions.length})</h4>
          ${daySessions.length === 0
            ? `<p style="font-size:12.5px;color:var(--text-muted);">No study sessions logged on this date.</p>`
            : `<div class="item-list">
                ${daySessions.map((s) => {
                  const top = topMap.get(s.topicId);
                  return `
                    <div class="list-row" style="padding:8px 10px;">
                      <div class="list-row-content">
                        <div class="list-row-title" style="font-size:13px;">${escapeHtml(top ? top.name : 'Unknown')}</div>
                        <div class="list-row-meta">${s.startTime}–${s.endTime} &bull; ${formatDuration(s.durationMinutes)}</div>
                      </div>
                    </div>`;
                }).join('')}
              </div>`}
        </div>
      </div>
    `;

    return { html };
  }

  function toLocalDateStr(dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function renderPending(state, stats, uiState) {
    const modMap = new Map(state.modules.map((m) => [m.id, m]));
    let fMod = uiState.pendingFilterModule || 'All';
    if (fMod !== 'All' && !modMap.has(fMod)) {
      fMod = 'All';
      uiState.pendingFilterModule = 'All';
    }
    const fPriority = uiState.pendingFilterPriority || 'All';
    const fStatus = uiState.pendingFilterStatus || 'All';
    const fDue = uiState.pendingFilterDue || 'All';
    const sortBy = uiState.pendingSort || 'dueDate';

    const pending = state.topics.filter((t) => {
      if (t.status === 'Completed') return false;
      if (fMod !== 'All' && t.moduleId !== fMod) return false;
      if (fPriority !== 'All' && t.priority !== fPriority) return false;
      if (fStatus !== 'All' && t.status !== fStatus) return false;
      if (fDue !== 'All' && getDueBucket(t, stats.todayStr) !== fDue) return false;
      return true;
    });

    const prioRank = { High: 0, Medium: 1, Low: 2 };
    pending.sort((a, b) => {
      if (sortBy === 'priority') return (prioRank[a.priority] ?? 9) - (prioRank[b.priority] ?? 9);
      if (sortBy === 'recent') return b.createdAt.localeCompare(a.createdAt);
      if (sortBy === 'alpha') return a.name.localeCompare(b.name);
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    const groups = [
      { key: 'overdue', title: 'Overdue', badge: 'badge-danger' },
      { key: 'today', title: 'Due Today', badge: 'badge-warning' },
      { key: 'tomorrow', title: 'Due Tomorrow', badge: 'badge-info' },
      { key: 'week', title: 'Due This Week', badge: 'badge-primary' },
      { key: 'upcoming', title: 'Upcoming', badge: 'badge-neutral' },
      { key: 'none', title: 'No Due Date', badge: 'badge-neutral' }
    ];

    const html = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Pending & Due Topics</h1>
          <p class="page-subtitle">Stay on top of overdue, today's, and upcoming study tasks.</p>
        </div>
        <button class="btn btn-primary" data-action="new-topic">+ Add Topic</button>
      </div>

      <div class="filter-bar">
        <select id="pend-filter-module">
          <option value="All">All Modules</option>
          ${state.modules.map((m) => `<option value="${m.id}" ${fMod === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}
        </select>
        <select id="pend-filter-priority">
          <option value="All" ${fPriority === 'All' ? 'selected' : ''}>All Priorities</option>
          <option value="High" ${fPriority === 'High' ? 'selected' : ''}>High</option>
          <option value="Medium" ${fPriority === 'Medium' ? 'selected' : ''}>Medium</option>
          <option value="Low" ${fPriority === 'Low' ? 'selected' : ''}>Low</option>
        </select>
        <select id="pend-filter-status">
          <option value="All" ${fStatus === 'All' ? 'selected' : ''}>All Active Statuses</option>
          <option value="Not Started" ${fStatus === 'Not Started' ? 'selected' : ''}>Not Started</option>
          <option value="In Progress" ${fStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="On Hold" ${fStatus === 'On Hold' ? 'selected' : ''}>On Hold</option>
        </select>
        <select id="pend-filter-due">
          <option value="All" ${fDue === 'All' ? 'selected' : ''}>All Buckets</option>
          <option value="overdue" ${fDue === 'overdue' ? 'selected' : ''}>Overdue</option>
          <option value="today" ${fDue === 'today' ? 'selected' : ''}>Due Today</option>
          <option value="tomorrow" ${fDue === 'tomorrow' ? 'selected' : ''}>Due Tomorrow</option>
          <option value="week" ${fDue === 'week' ? 'selected' : ''}>Due This Week</option>
          <option value="upcoming" ${fDue === 'upcoming' ? 'selected' : ''}>Upcoming</option>
          <option value="none" ${fDue === 'none' ? 'selected' : ''}>No Due Date</option>
        </select>
        <select id="pend-sort">
          <option value="dueDate" ${sortBy === 'dueDate' ? 'selected' : ''}>Sort: Due Date</option>
          <option value="priority" ${sortBy === 'priority' ? 'selected' : ''}>Sort: Priority</option>
          <option value="recent" ${sortBy === 'recent' ? 'selected' : ''}>Sort: Recently Added</option>
          <option value="alpha" ${sortBy === 'alpha' ? 'selected' : ''}>Sort: Alphabetical</option>
        </select>
      </div>

      ${pending.length === 0
        ? `<div class="empty-state">
            <h3>All Caught Up!</h3>
            <p>No pending topics match your current filters.</p>
          </div>`
        : `<div class="item-list" style="gap:16px;">
            ${groups.map((g) => {
              const items = pending.filter((t) => getDueBucket(t, stats.todayStr) === g.key);
              if (items.length === 0) return '';
              return `
                <div class="card">
                  <div class="card-header">
                    <h3 class="card-title">${g.title}</h3>
                    <span class="badge ${g.badge}">${items.length}</span>
                  </div>
                  <div class="item-list">
                    ${items.map((t) => {
                      const mod = modMap.get(t.moduleId);
                      return `
                        <div class="list-row">
                          <div class="list-row-main">
                            <input type="checkbox" class="topic-check" data-action="toggle-topic" data-id="${t.id}" />
                            <div class="list-row-content">
                              <div class="list-row-title">
                                <span class="color-dot" style="background:${mod ? mod.color : '#4f46e5'}"></span>
                                <span>${escapeHtml(t.name)}</span>
                                ${priorityBadge(t.priority)}
                                ${statusBadge(t.status)}
                              </div>
                              <div class="list-row-meta">
                                <span>${escapeHtml(mod ? mod.name : '')}</span>
                                <span>${t.dueDate ? `Due ${formatDate(t.dueDate)}` : 'No due date'}</span>
                                <span>Est: ${formatDuration(t.estimatedMinutes)}</span>
                              </div>
                            </div>
                          </div>
                          <div class="list-row-actions">
                            <button class="btn btn-secondary btn-xs" data-action="log-for-topic" data-id="${t.id}">Log</button>
                            <button class="btn btn-ghost btn-xs" data-action="edit-topic" data-id="${t.id}">Edit</button>
                          </div>
                        </div>`;
                    }).join('')}
                  </div>
                </div>`;
            }).join('')}
          </div>`}
    `;

    return { html };
  }

  function renderAnalytics(state, stats) {
    const html = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Analytics & Reports</h1>
          <p class="page-subtitle">All insights are computed locally from your modules, topics, and study sessions.</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Syllabus Completion</div>
          <div class="stat-value">${stats.completionPct}%</div>
          <div class="stat-sub">${stats.completedTopics} completed / ${stats.totalTopics} total</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pending / Overdue</div>
          <div class="stat-value">${stats.pendingTopics}</div>
          <div class="stat-sub" style="color:var(--danger)">${stats.overdueTopics} overdue</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Weekly Study Hours</div>
          <div class="stat-value">${formatHours(stats.weeklyStudyMinutes)}</div>
          <div class="stat-sub">Today: ${formatHours(stats.todayStudyMinutes)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Monthly Study Hours</div>
          <div class="stat-value">${formatHours(stats.monthlyStudyMinutes)}</div>
          <div class="stat-sub">All-time: ${formatHours(stats.totalStudyMinutes)}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Daily Study Hours (Last 14 Days)</h3></div>
          <div class="chart-box chart-box-lg"><canvas id="ana-daily-chart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">Weekly Study Hours (Last 8 Weeks)</h3></div>
          <div class="chart-box chart-box-lg"><canvas id="ana-weekly-chart"></canvas></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Estimated vs Actual Study Time (Hours by Module)</h3></div>
          <div class="chart-box chart-box-lg"><canvas id="ana-est-actual-chart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">Module-wise Progress (%)</h3></div>
          <div class="chart-box chart-box-lg"><canvas id="ana-mod-progress-chart"></canvas></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Most Studied Modules</h3></div>
          ${stats.mostStudiedModules.length === 0
            ? `<p style="color:var(--text-muted);font-size:13px;">Log study sessions to see top modules.</p>`
            : `<div class="item-list">
                ${stats.mostStudiedModules.map((ms) => `
                  <div class="list-row">
                    <div class="list-row-content">
                      <div class="list-row-title">
                        <span class="color-dot" style="background:${ms.module.color}"></span>
                        <span>${escapeHtml(ms.module.name)}</span>
                      </div>
                      <div class="list-row-meta">${ms.completionPct}% syllabus completed</div>
                    </div>
                    <strong>${formatDuration(ms.sessionMinutes)}</strong>
                  </div>
                `).join('')}
              </div>`}
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title">Most Studied Topics</h3></div>
          ${stats.mostStudiedTopics.length === 0
            ? `<p style="color:var(--text-muted);font-size:13px;">Log study sessions to see top topics.</p>`
            : `<div class="item-list">
                ${stats.mostStudiedTopics.map((item) => `
                  <div class="list-row">
                    <div class="list-row-content">
                      <div class="list-row-title">${escapeHtml(item.topic.name)}</div>
                      <div class="list-row-meta">${statusBadge(item.topic.status)}</div>
                    </div>
                    <strong>${formatDuration(item.minutes)}</strong>
                  </div>
                `).join('')}
              </div>`}
        </div>
      </div>
    `;

    const afterRender = () => {
      renderChart('ana-daily-chart', {
        type: 'bar',
        data: {
          labels: stats.twoWeekActivity.map((d) => d.label),
          datasets: [{
            label: 'Hours',
            data: stats.twoWeekActivity.map((d) => Number((d.minutes / 60).toFixed(2))),
            backgroundColor: '#4f46e5',
            borderRadius: 5
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });

      renderChart('ana-weekly-chart', {
        type: 'line',
        data: {
          labels: stats.weeklyTrend.map((w) => w.label),
          datasets: [{
            label: 'Hours',
            data: stats.weeklyTrend.map((w) => Number((w.minutes / 60).toFixed(2))),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });

      renderChart('ana-est-actual-chart', {
        type: 'bar',
        data: {
          labels: stats.moduleStats.map((ms) => ms.module.name),
          datasets: [
            {
              label: 'Estimated (hrs)',
              data: stats.moduleStats.map((ms) => Number((ms.estimatedMinutes / 60).toFixed(2))),
              backgroundColor: '#94a3b8',
              borderRadius: 5
            },
            {
              label: 'Actual (hrs)',
              data: stats.moduleStats.map((ms) => Number((ms.actualMinutes / 60).toFixed(2))),
              backgroundColor: '#10b981',
              borderRadius: 5
            }
          ]
        },
        options: { scales: { y: { beginAtZero: true } } }
      });

      renderChart('ana-mod-progress-chart', {
        type: 'bar',
        data: {
          labels: stats.moduleStats.map((ms) => ms.module.name),
          datasets: [{
            label: 'Completion %',
            data: stats.moduleStats.map((ms) => ms.completionPct),
            backgroundColor: stats.moduleStats.map((ms) => ms.module.color || '#4f46e5'),
            borderRadius: 5
          }]
        },
        options: {
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, max: 100 } }
        }
      });
    };

    return { html, afterRender };
  }

  function renderSettings(state) {
    const html = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings & Data Backup</h1>
          <p class="page-subtitle">Customize your study goals, appearance, and manage offline LocalStorage backups.</p>
        </div>
      </div>

      <div class="alert-box">
        <strong>Local Storage Notice:</strong> All your modules, topics, and study logs are stored locally in this browser's <code>LocalStorage</code>. Data is browser-specific and will be lost if you clear browser site data. Use <strong>Export JSON</strong> regularly to keep a backup.
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Study Goals & Profile</h3></div>
          <form id="settings-form">
            <div class="form-group">
              <label for="set-username">Your Name</label>
              <input id="set-username" class="form-control" type="text" value="${escapeHtml(state.settings.userName)}" required />
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="set-daily-goal">Daily Study Goal (Hours)</label>
                <input id="set-daily-goal" class="form-control" type="number" step="0.5" min="0.5" max="24" value="${state.settings.dailyGoalHours}" required />
              </div>
              <div class="form-group">
                <label for="set-weekly-goal">Weekly Study Goal (Hours)</label>
                <input id="set-weekly-goal" class="form-control" type="number" step="0.5" min="1" max="168" value="${state.settings.weeklyGoalHours}" required />
              </div>
            </div>
            <div class="form-group">
              <label for="set-theme">Theme Preference</label>
              <select id="set-theme" class="form-control">
                <option value="light" ${state.settings.theme === 'light' ? 'selected' : ''}>Light Mode</option>
                <option value="dark" ${state.settings.theme === 'dark' ? 'selected' : ''}>Dark Mode</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">Save Preferences</button>
          </form>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title">Data Management & Backup</h3></div>
          <div class="item-list">
            <div class="list-row">
              <div class="list-row-content">
                <div class="list-row-title">Export Full Backup (JSON)</div>
                <div class="list-row-meta">Download all modules, topics, sessions, and settings.</div>
              </div>
              <button class="btn btn-secondary btn-sm" data-action="export-json">Export JSON</button>
            </div>

            <div class="list-row">
              <div class="list-row-content">
                <div class="list-row-title">Import Backup (JSON)</div>
                <div class="list-row-meta">Restore from a previously exported JSON file.</div>
              </div>
              <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
                Import JSON
                <input type="file" id="import-json-input" accept=".json,application/json" class="hidden" />
              </label>
            </div>

            <div class="list-row">
              <div class="list-row-content">
                <div class="list-row-title">Export Study Report (CSV)</div>
                <div class="list-row-meta">Open in Excel, Numbers, or Google Sheets.</div>
              </div>
              <button class="btn btn-secondary btn-sm" data-action="export-csv">Export CSV</button>
            </div>

            <div class="list-row">
              <div class="list-row-content">
                <div class="list-row-title">Load Sample Data</div>
                <div class="list-row-meta">Populate sample modules, topics, and study sessions.</div>
              </div>
              <button class="btn btn-secondary btn-sm" data-action="load-sample">Load Sample</button>
            </div>

            <div class="list-row" style="border-color:var(--danger-soft);">
              <div class="list-row-content">
                <div class="list-row-title" style="color:var(--danger);">Reset All Data</div>
                <div class="list-row-meta">Permanently erase all modules, topics, and sessions.</div>
              </div>
              <button class="btn btn-danger btn-sm" data-action="reset-all">Reset Data</button>
            </div>
          </div>
        </div>
      </div>
    `;

    return { html };
  }

  global.StudyViews = {
    dashboard: renderDashboard,
    modules: renderModules,
    topics: renderTopics,
    'study-log': renderStudyLog,
    calendar: renderCalendar,
    pending: renderPending,
    analytics: renderAnalytics,
    settings: renderSettings
  };
})(window);

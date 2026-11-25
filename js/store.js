/**
 * store.js - LocalStorage persistence, state management, CRUD, and import/export.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'study_tracker_data_v1';
  const APP_VERSION = '1.0.0';

  function generateId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function getTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDaysStr(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + days);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  function defaultState() {
    return {
      version: APP_VERSION,
      settings: {
        theme: 'light',
        dailyGoalHours: 2,
        weeklyGoalHours: 14,
        userName: 'Learner'
      },
      modules: [],
      topics: [],
      sessions: []
    };
  }

  function sanitizeState(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid data format: root must be a JSON object.');
    }
    if (!Array.isArray(raw.modules) || !Array.isArray(raw.topics) || !Array.isArray(raw.sessions)) {
      throw new Error('Invalid data format: missing modules, topics, or sessions arrays.');
    }

    const base = defaultState();
    const settings = Object.assign({}, base.settings, raw.settings && typeof raw.settings === 'object' ? raw.settings : {});
    settings.theme = settings.theme === 'dark' ? 'dark' : 'light';
    settings.dailyGoalHours = Math.max(0.5, Math.min(24, Number(settings.dailyGoalHours) || 2));
    settings.weeklyGoalHours = Math.max(1, Math.min(168, Number(settings.weeklyGoalHours) || 14));
    settings.userName = typeof settings.userName === 'string' && settings.userName.trim() ? settings.userName.trim() : 'Learner';

    const modules = raw.modules
      .filter((m) => m && typeof m === 'object' && m.id && m.name)
      .map((m) => ({
        id: String(m.id),
        name: String(m.name),
        description: String(m.description || ''),
        category: String(m.category || 'General'),
        startDate: String(m.startDate || ''),
        targetDate: String(m.targetDate || ''),
        priority: ['Low', 'Medium', 'High'].includes(m.priority) ? m.priority : 'Medium',
        color: String(m.color || '#4f46e5'),
        status: ['Not Started', 'In Progress', 'Completed'].includes(m.status) ? m.status : 'Not Started',
        createdAt: String(m.createdAt || new Date().toISOString()),
        updatedAt: String(m.updatedAt || new Date().toISOString())
      }));

    const moduleIds = new Set(modules.map((m) => m.id));

    const topics = raw.topics
      .filter((t) => t && typeof t === 'object' && t.id && t.name && moduleIds.has(String(t.moduleId)))
      .map((t) => ({
        id: String(t.id),
        moduleId: String(t.moduleId),
        name: String(t.name),
        notes: String(t.notes || ''),
        estimatedMinutes: Math.max(0, Number(t.estimatedMinutes) || 0),
        actualMinutes: Math.max(0, Number(t.actualMinutes) || 0),
        priority: ['Low', 'Medium', 'High'].includes(t.priority) ? t.priority : 'Medium',
        startDate: String(t.startDate || ''),
        dueDate: String(t.dueDate || ''),
        completionDate: String(t.completionDate || ''),
        status: ['Not Started', 'In Progress', 'Completed', 'On Hold'].includes(t.status) ? t.status : 'Not Started',
        createdAt: String(t.createdAt || new Date().toISOString()),
        updatedAt: String(t.updatedAt || new Date().toISOString())
      }));

    const topicIds = new Set(topics.map((t) => t.id));

    const sessions = raw.sessions
      .filter((s) => s && typeof s === 'object' && s.id && s.date && moduleIds.has(String(s.moduleId)) && topicIds.has(String(s.topicId)))
      .map((s) => ({
        id: String(s.id),
        date: String(s.date),
        moduleId: String(s.moduleId),
        topicId: String(s.topicId),
        startTime: String(s.startTime || '09:00'),
        endTime: String(s.endTime || '10:00'),
        durationMinutes: Math.max(1, Number(s.durationMinutes) || 60),
        notes: String(s.notes || ''),
        status: ['Completed', 'In Progress', 'Paused'].includes(s.status) ? s.status : 'Completed',
        createdAt: String(s.createdAt || new Date().toISOString()),
        updatedAt: String(s.updatedAt || new Date().toISOString())
      }));

    return {
      version: String(raw.version || APP_VERSION),
      settings,
      modules,
      topics,
      sessions
    };
  }

  let state = loadState();
  const listeners = new Set();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return sanitizeState(parsed);
    } catch (err) {
      console.error('Failed to load LocalStorage state:', err);
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.error('Failed to save LocalStorage state:', err);
      return false;
    }
  }

  function notify() {
    saveState();
    listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (e) {
        console.error('Listener error:', e);
      }
    });
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function getState() {
    return state;
  }

  // --- Settings ---
  function updateSettings(partial) {
    state.settings = Object.assign({}, state.settings, partial);
    notify();
  }

  // --- Modules CRUD ---
  function addModule(data) {
    const now = new Date().toISOString();
    const mod = {
      id: generateId('mod'),
      name: data.name.trim(),
      description: (data.description || '').trim(),
      category: (data.category || 'General').trim(),
      startDate: data.startDate || getTodayStr(),
      targetDate: data.targetDate || '',
      priority: data.priority || 'Medium',
      color: data.color || '#4f46e5',
      status: data.status || 'Not Started',
      createdAt: now,
      updatedAt: now
    };
    state.modules.push(mod);
    notify();
    return mod;
  }

  function updateModule(id, partial) {
    const mod = state.modules.find((m) => m.id === id);
    if (!mod) return null;
    Object.assign(mod, partial, { updatedAt: new Date().toISOString() });
    notify();
    return mod;
  }

  function deleteModule(id) {
    state.modules = state.modules.filter((m) => m.id !== id);
    state.topics = state.topics.filter((t) => t.moduleId !== id);
    state.sessions = state.sessions.filter((s) => s.moduleId !== id);
    notify();
  }

  // --- Topics CRUD ---
  function addTopic(data) {
    const now = new Date().toISOString();
    const status = data.status || 'Not Started';
    const topic = {
      id: generateId('top'),
      moduleId: data.moduleId,
      name: data.name.trim(),
      notes: (data.notes || '').trim(),
      estimatedMinutes: Math.max(0, Number(data.estimatedMinutes) || 0),
      actualMinutes: Math.max(0, Number(data.actualMinutes) || 0),
      priority: data.priority || 'Medium',
      startDate: data.startDate || '',
      dueDate: data.dueDate || '',
      completionDate: status === 'Completed' ? (data.completionDate || getTodayStr()) : '',
      status,
      createdAt: now,
      updatedAt: now
    };
    state.topics.push(topic);
    syncModuleStatusFromTopics(topic.moduleId);
    notify();
    return topic;
  }

  function updateTopic(id, partial) {
    const topic = state.topics.find((t) => t.id === id);
    if (!topic) return null;
    const prevStatus = topic.status;
    const prevModuleId = topic.moduleId;
    Object.assign(topic, partial, { updatedAt: new Date().toISOString() });
    if (topic.status === 'Completed' && prevStatus !== 'Completed' && !topic.completionDate) {
      topic.completionDate = getTodayStr();
    } else if (topic.status !== 'Completed') {
      topic.completionDate = '';
    }
    if (topic.moduleId !== prevModuleId) {
      state.sessions.forEach((s) => {
        if (s.topicId === topic.id) {
          s.moduleId = topic.moduleId;
          s.updatedAt = new Date().toISOString();
        }
      });
      syncModuleStatusFromTopics(prevModuleId);
    }
    syncModuleStatusFromTopics(topic.moduleId);
    notify();
    return topic;
  }

  function toggleTopicComplete(id) {
    const topic = state.topics.find((t) => t.id === id);
    if (!topic) return null;
    if (topic.status === 'Completed') {
      topic.status = 'In Progress';
      topic.completionDate = '';
    } else {
      topic.status = 'Completed';
      topic.completionDate = getTodayStr();
    }
    topic.updatedAt = new Date().toISOString();
    syncModuleStatusFromTopics(topic.moduleId);
    notify();
    return topic;
  }

  function deleteTopic(id) {
    const topic = state.topics.find((t) => t.id === id);
    const modId = topic ? topic.moduleId : null;
    state.topics = state.topics.filter((t) => t.id !== id);
    state.sessions = state.sessions.filter((s) => s.topicId !== id);
    if (modId) syncModuleStatusFromTopics(modId);
    notify();
  }

  function syncModuleStatusFromTopics(moduleId) {
    const mod = state.modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const modTopics = state.topics.filter((t) => t.moduleId === moduleId);
    if (modTopics.length === 0) return;
    const allCompleted = modTopics.every((t) => t.status === 'Completed');
    const anyActive = modTopics.some((t) => t.status === 'In Progress' || t.status === 'Completed');
    if (allCompleted) {
      mod.status = 'Completed';
    } else if (anyActive && mod.status === 'Not Started') {
      mod.status = 'In Progress';
    } else if (!allCompleted && mod.status === 'Completed') {
      mod.status = 'In Progress';
    }
    mod.updatedAt = new Date().toISOString();
  }

  // --- Study Sessions CRUD ---
  function calculateDurationMinutes(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if ([sh, sm, eh, em].some(isNaN)) return 0;
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    return endMins > startMins ? endMins - startMins : 0;
  }

  function addSession(data) {
    const now = new Date().toISOString();
    const durationMinutes = data.durationMinutes > 0
      ? Number(data.durationMinutes)
      : calculateDurationMinutes(data.startTime, data.endTime);

    const session = {
      id: generateId('ses'),
      date: data.date || getTodayStr(),
      moduleId: data.moduleId,
      topicId: data.topicId,
      startTime: data.startTime || '09:00',
      endTime: data.endTime || '10:00',
      durationMinutes: Math.max(1, durationMinutes),
      notes: (data.notes || '').trim(),
      status: data.status || 'Completed',
      createdAt: now,
      updatedAt: now
    };
    state.sessions.push(session);

    // Update topic's actualMinutes & status if Not Started
    const topic = state.topics.find((t) => t.id === session.topicId);
    if (topic) {
      topic.actualMinutes = Math.max(0, (topic.actualMinutes || 0) + session.durationMinutes);
      if (topic.status === 'Not Started') {
        topic.status = 'In Progress';
      }
      topic.updatedAt = now;
      syncModuleStatusFromTopics(topic.moduleId);
    }

    notify();
    return session;
  }

  function updateSession(id, partial) {
    const session = state.sessions.find((s) => s.id === id);
    if (!session) return null;
    const oldDuration = session.durationMinutes;
    const oldTopicId = session.topicId;

    Object.assign(session, partial, { updatedAt: new Date().toISOString() });
    if (partial.startTime || partial.endTime) {
      const calc = calculateDurationMinutes(session.startTime, session.endTime);
      if (calc > 0 && !partial.durationMinutes) {
        session.durationMinutes = calc;
      }
    }

    if (oldTopicId === session.topicId) {
      const topic = state.topics.find((t) => t.id === session.topicId);
      if (topic) {
        const delta = session.durationMinutes - oldDuration;
        topic.actualMinutes = Math.max(0, (topic.actualMinutes || 0) + delta);
        topic.updatedAt = new Date().toISOString();
      }
    } else {
      const prevTopic = state.topics.find((t) => t.id === oldTopicId);
      if (prevTopic) {
        prevTopic.actualMinutes = Math.max(0, (prevTopic.actualMinutes || 0) - oldDuration);
      }
      const nextTopic = state.topics.find((t) => t.id === session.topicId);
      if (nextTopic) {
        nextTopic.actualMinutes = Math.max(0, (nextTopic.actualMinutes || 0) + session.durationMinutes);
      }
    }

    notify();
    return session;
  }

  function deleteSession(id) {
    const session = state.sessions.find((s) => s.id === id);
    if (!session) return;
    const topic = state.topics.find((t) => t.id === session.topicId);
    if (topic) {
      topic.actualMinutes = Math.max(0, (topic.actualMinutes || 0) - session.durationMinutes);
      topic.updatedAt = new Date().toISOString();
    }
    state.sessions = state.sessions.filter((s) => s.id !== id);
    notify();
  }

  // --- Data Management & Backup ---
  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(jsonText) {
    const parsed = JSON.parse(jsonText);
    const validated = sanitizeState(parsed);
    state = validated;
    notify();
    return state;
  }

  function exportCSV() {
    const modMap = new Map(state.modules.map((m) => [m.id, m.name]));
    const topMap = new Map(state.topics.map((t) => [t.id, t.name]));

    const escapeCsv = (val) => {
      const s = String(val == null ? '' : val);
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = [
      ['Type', 'Date', 'Module', 'Topic', 'Start Time', 'End Time', 'Duration (mins)', 'Status', 'Priority', 'Notes']
    ];

    state.sessions.forEach((s) => {
      rows.push([
        'Study Session',
        s.date,
        modMap.get(s.moduleId) || 'Unknown',
        topMap.get(s.topicId) || 'Unknown',
        s.startTime,
        s.endTime,
        s.durationMinutes,
        s.status,
        '',
        s.notes
      ]);
    });

    state.topics.forEach((t) => {
      rows.push([
        'Topic',
        t.dueDate || t.completionDate || '',
        modMap.get(t.moduleId) || 'Unknown',
        t.name,
        '',
        '',
        t.actualMinutes,
        t.status,
        t.priority,
        t.notes
      ]);
    });

    return rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
  }

  function resetAllData() {
    const theme = state.settings.theme;
    state = defaultState();
    state.settings.theme = theme;
    notify();
  }

  function loadSampleData() {
    const today = getTodayStr();
    const yesterday = addDaysStr(today, -1);
    const twoDaysAgo = addDaysStr(today, -2);
    const tomorrow = addDaysStr(today, 1);
    const in3Days = addDaysStr(today, 3);
    const in7Days = addDaysStr(today, 7);
    const now = new Date().toISOString();

    const m1 = {
      id: 'mod_sample_1',
      name: 'System Design & Architecture',
      description: 'Scalable distributed systems, caching, load balancing, and database sharding.',
      category: 'Computer Science',
      startDate: addDaysStr(today, -14),
      targetDate: addDaysStr(today, 14),
      priority: 'High',
      color: '#4f46e5',
      status: 'In Progress',
      createdAt: now,
      updatedAt: now
    };
    const m2 = {
      id: 'mod_sample_2',
      name: 'Frontend Mastery & Performance',
      description: 'Browser rendering pipeline, Core Web Vitals, accessibility, and state patterns.',
      category: 'Web Development',
      startDate: addDaysStr(today, -10),
      targetDate: addDaysStr(today, 20),
      priority: 'Medium',
      color: '#0ea5e9',
      status: 'In Progress',
      createdAt: now,
      updatedAt: now
    };
    const m3 = {
      id: 'mod_sample_3',
      name: 'Algorithms & Data Structures',
      description: 'Graphs, dynamic programming, trees, and complexity analysis.',
      category: 'Computer Science',
      startDate: addDaysStr(today, -20),
      targetDate: addDaysStr(today, 5),
      priority: 'High',
      color: '#10b981',
      status: 'In Progress',
      createdAt: now,
      updatedAt: now
    };

    const topics = [
      {
        id: 'top_sample_1', moduleId: m1.id, name: 'Consistent Hashing & Load Balancing',
        notes: 'Review virtual nodes and L4 vs L7 load balancers.', estimatedMinutes: 120, actualMinutes: 135,
        priority: 'High', startDate: addDaysStr(today, -10), dueDate: twoDaysAgo, completionDate: twoDaysAgo,
        status: 'Completed', createdAt: now, updatedAt: now
      },
      {
        id: 'top_sample_2', moduleId: m1.id, name: 'Database Replication & Sharding',
        notes: 'Focus on leader-follower lag and shard key selection.', estimatedMinutes: 150, actualMinutes: 90,
        priority: 'High', startDate: yesterday, dueDate: today, completionDate: '',
        status: 'In Progress', createdAt: now, updatedAt: now
      },
      {
        id: 'top_sample_3', moduleId: m1.id, name: 'Caching Strategies (Redis & CDN)',
        notes: 'Write-through vs write-behind, cache stampede prevention.', estimatedMinutes: 90, actualMinutes: 0,
        priority: 'Medium', startDate: today, dueDate: in3Days, completionDate: '',
        status: 'Not Started', createdAt: now, updatedAt: now
      },
      {
        id: 'top_sample_4', moduleId: m2.id, name: 'Critical Rendering Path & Reflows',
        notes: 'Measure layout thrashing using Chrome DevTools.', estimatedMinutes: 90, actualMinutes: 90,
        priority: 'Medium', startDate: addDaysStr(today, -6), dueDate: yesterday, completionDate: yesterday,
        status: 'Completed', createdAt: now, updatedAt: now
      },
      {
        id: 'top_sample_5', moduleId: m2.id, name: 'ARIA Landmarks & Keyboard Navigation',
        notes: 'Audit focus traps and roving tabindex patterns.', estimatedMinutes: 60, actualMinutes: 30,
        priority: 'Low', startDate: today, dueDate: tomorrow, completionDate: '',
        status: 'In Progress', createdAt: now, updatedAt: now
      },
      {
        id: 'top_sample_6', moduleId: m3.id, name: 'Dijkstra & Bellman-Ford Shortest Paths',
        notes: 'Practice negative edge weight handling.', estimatedMinutes: 120, actualMinutes: 45,
        priority: 'High', startDate: addDaysStr(today, -5), dueDate: yesterday, completionDate: '',
        status: 'In Progress', createdAt: now, updatedAt: now
      },
      {
        id: 'top_sample_7', moduleId: m3.id, name: 'Dynamic Programming on Trees',
        notes: 'Re-rooting technique and subtree DP.', estimatedMinutes: 180, actualMinutes: 0,
        priority: 'Medium', startDate: '', dueDate: in7Days, completionDate: '',
        status: 'On Hold', createdAt: now, updatedAt: now
      }
    ];

    const sessions = [
      {
        id: 'ses_sample_1', date: twoDaysAgo, moduleId: m1.id, topicId: 'top_sample_1',
        startTime: '18:00', endTime: '20:15', durationMinutes: 135,
        notes: 'Finished consistent hashing ring implementation and notes.', status: 'Completed',
        createdAt: now, updatedAt: now
      },
      {
        id: 'ses_sample_2', date: yesterday, moduleId: m2.id, topicId: 'top_sample_4',
        startTime: '09:30', endTime: '11:00', durationMinutes: 90,
        notes: 'Profiled sample app in Performance tab.', status: 'Completed',
        createdAt: now, updatedAt: now
      },
      {
        id: 'ses_sample_3', date: yesterday, moduleId: m3.id, topicId: 'top_sample_6',
        startTime: '19:00', endTime: '19:45', durationMinutes: 45,
        notes: 'Solved 2 graph shortest path problems.', status: 'Completed',
        createdAt: now, updatedAt: now
      },
      {
        id: 'ses_sample_4', date: today, moduleId: m1.id, topicId: 'top_sample_2',
        startTime: '08:00', endTime: '09:30', durationMinutes: 90,
        notes: 'Studied read replicas and quorum reads.', status: 'Completed',
        createdAt: now, updatedAt: now
      }
    ];

    state = {
      version: APP_VERSION,
      settings: Object.assign({}, state.settings),
      modules: [m1, m2, m3],
      topics,
      sessions
    };
    notify();
  }

  global.StudyStore = {
    STORAGE_KEY,
    APP_VERSION,
    getTodayStr,
    addDaysStr,
    getState,
    subscribe,
    updateSettings,
    addModule,
    updateModule,
    deleteModule,
    addTopic,
    updateTopic,
    toggleTopicComplete,
    deleteTopic,
    calculateDurationMinutes,
    addSession,
    updateSession,
    deleteSession,
    exportJSON,
    importJSON,
    exportCSV,
    resetAllData,
    loadSampleData
  };
})(window);

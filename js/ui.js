/**
 * ui.js - Shared UI utilities, badges, modals, confirmations, toasts, and Chart.js helpers.
 */
(function (global) {
  'use strict';

  const chartInstances = {};

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDuration(minutes) {
    const mins = Math.max(0, Math.round(Number(minutes) || 0));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  function formatHours(minutes) {
    const hrs = (Number(minutes) || 0) / 60;
    return `${hrs.toFixed(1)} hrs`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'No date';
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function priorityBadge(priority) {
    const map = {
      High: 'badge-danger',
      Medium: 'badge-warning',
      Low: 'badge-info'
    };
    return `<span class="badge ${map[priority] || 'badge-neutral'}">${escapeHtml(priority)}</span>`;
  }

  function statusBadge(status) {
    const map = {
      Completed: 'badge-success',
      'In Progress': 'badge-primary',
      'On Hold': 'badge-warning',
      'Not Started': 'badge-neutral'
    };
    return `<span class="badge ${map[status] || 'badge-neutral'}">${escapeHtml(status)}</span>`;
  }

  function dueBadge(topic, todayStr) {
    if (topic.status === 'Completed') {
      return `<span class="badge badge-success">Completed</span>`;
    }
    if (!topic.dueDate) {
      return `<span class="badge badge-neutral">No due date</span>`;
    }
    const bucket = global.StudyAnalytics.getDueBucket(topic, todayStr);
    if (bucket === 'overdue') {
      return `<span class="badge badge-danger">Overdue (${formatDate(topic.dueDate)})</span>`;
    }
    if (bucket === 'today') {
      return `<span class="badge badge-warning">Due Today</span>`;
    }
    if (bucket === 'tomorrow') {
      return `<span class="badge badge-info">Due Tomorrow</span>`;
    }
    return `<span class="badge badge-neutral">Due ${formatDate(topic.dueDate)}</span>`;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 3200);
  }

  function openModal(title, htmlContent) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    if (!overlay || !titleEl || !bodyEl) return;
    titleEl.textContent = title;
    bodyEl.innerHTML = htmlContent;
    overlay.classList.remove('hidden');
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    const bodyEl = document.getElementById('modal-body');
    if (overlay) overlay.classList.add('hidden');
    if (bodyEl) bodyEl.innerHTML = '';
  }

  function confirmAction({ title = 'Confirm Action', message, confirmText = 'Confirm', danger = true }) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirm-overlay');
      const titleEl = document.getElementById('confirm-title');
      const msgEl = document.getElementById('confirm-message');
      const okBtn = document.getElementById('confirm-ok-btn');
      const cancelBtn = document.getElementById('confirm-cancel-btn');

      titleEl.textContent = title;
      msgEl.textContent = message;
      okBtn.textContent = confirmText;
      okBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
      overlay.classList.remove('hidden');

      const cleanup = (result) => {
        overlay.classList.add('hidden');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        resolve(result);
      };

      const onOk = () => cleanup(true);
      const onCancel = () => cleanup(false);

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  function destroyCharts() {
    Object.keys(chartInstances).forEach((key) => {
      if (chartInstances[key]) {
        chartInstances[key].destroy();
        delete chartInstances[key];
      }
    });
  }

  function renderChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof global.Chart === 'undefined') return null;
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
    }
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#c0c6d4' : '#4b5563';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)';

    config.options = config.options || {};
    config.options.responsive = true;
    config.options.maintainAspectRatio = false;
    config.options.plugins = config.options.plugins || {};
    config.options.plugins.legend = Object.assign(
      { labels: { color: textColor, boxWidth: 12 } },
      config.options.plugins.legend || {}
    );
    if (config.options.scales) {
      Object.values(config.options.scales).forEach((scale) => {
        scale.ticks = Object.assign({ color: textColor }, scale.ticks || {});
        scale.grid = Object.assign({ color: gridColor }, scale.grid || {});
      });
    }

    chartInstances[canvasId] = new global.Chart(canvas.getContext('2d'), config);
    return chartInstances[canvasId];
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  global.StudyUI = {
    escapeHtml,
    formatDuration,
    formatHours,
    formatDate,
    priorityBadge,
    statusBadge,
    dueBadge,
    showToast,
    openModal,
    closeModal,
    confirmAction,
    destroyCharts,
    renderChart,
    downloadFile
  };
})(window);

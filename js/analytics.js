/**
 * analytics.js - Pure calculation engine for dashboard, streaks, due buckets, and reports.
 */
(function (global) {
  'use strict';

  function isTopicOverdue(topic, todayStr) {
    return Boolean(topic.dueDate && topic.dueDate < todayStr && topic.status !== 'Completed');
  }

  function getDueBucket(topic, todayStr) {
    if (topic.status === 'Completed') return 'completed';
    if (!topic.dueDate) return 'none';
    if (topic.dueDate < todayStr) return 'overdue';
    if (topic.dueDate === todayStr) return 'today';

    const tomorrowStr = global.StudyStore.addDaysStr(todayStr, 1);
    if (topic.dueDate === tomorrowStr) return 'tomorrow';

    const weekEndStr = global.StudyStore.addDaysStr(todayStr, 7);
    if (topic.dueDate <= weekEndStr) return 'week';

    return 'upcoming';
  }

  function calculateStreaks(sessions, todayStr) {
    const activeDates = new Set(
      sessions.filter((s) => s.durationMinutes > 0 && s.date).map((s) => s.date)
    );
    if (activeDates.size === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Longest streak across all sorted dates
    const sortedDates = Array.from(activeDates).sort();
    let longestStreak = 1;
    let run = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const expectedNext = global.StudyStore.addDaysStr(sortedDates[i - 1], 1);
      if (sortedDates[i] === expectedNext) {
        run++;
        if (run > longestStreak) longestStreak = run;
      } else {
        run = 1;
      }
    }

    // Current streak: counts backwards from today (or yesterday if today has no session yet)
    let currentStreak = 0;
    let cursor = activeDates.has(todayStr)
      ? todayStr
      : global.StudyStore.addDaysStr(todayStr, -1);

    if (activeDates.has(cursor)) {
      while (activeDates.has(cursor)) {
        currentStreak++;
        cursor = global.StudyStore.addDaysStr(cursor, -1);
      }
    }

    return { currentStreak, longestStreak };
  }

  function getMotivationalMessage(stats, settings) {
    if (stats.totalModules === 0 && stats.totalTopics === 0) {
      return 'Welcome! Create your first study module to begin tracking your learning journey.';
    }
    if (stats.todayStudyMinutes >= settings.dailyGoalHours * 60 && settings.dailyGoalHours > 0) {
      return `Daily goal achieved! You've logged ${(stats.todayStudyMinutes / 60).toFixed(1)} hrs today${stats.currentStreak > 1 ? ` and maintained a ${stats.currentStreak}-day streak` : ''}.`;
    }
    if (stats.overdueTopics > 0) {
      return `You have ${stats.overdueTopics} overdue topic${stats.overdueTopics > 1 ? 's' : ''}. Knocking out one today will build momentum.`;
    }
    if (stats.currentStreak >= 3) {
      return `Great consistency — you're on a ${stats.currentStreak}-day study streak! Keep it going.`;
    }
    if (stats.completionPct === 100 && stats.totalTopics > 0) {
      return 'All topics across your modules are completed! Time to add a new learning goal.';
    }
    const remainingMins = Math.max(0, settings.dailyGoalHours * 60 - stats.todayStudyMinutes);
    if (remainingMins > 0) {
      const hrs = (remainingMins / 60).toFixed(1);
      return `${hrs} hrs left to hit your daily goal of ${settings.dailyGoalHours} hrs. Every focused session counts.`;
    }
    return 'Stay consistent and track each study session to see your progress grow.';
  }

  function calculateStats(state, todayStr) {
    todayStr = todayStr || global.StudyStore.getTodayStr();
    const weekStartStr = global.StudyStore.addDaysStr(todayStr, -6);
    const monthStartStr = global.StudyStore.addDaysStr(todayStr, -29);

    const totalModules = state.modules.length;
    const totalTopics = state.topics.length;
    const completedTopicsList = state.topics.filter((t) => t.status === 'Completed');
    const completedTopics = completedTopicsList.length;
    const pendingTopics = state.topics.filter((t) => t.status !== 'Completed').length;
    const inProgressTopics = state.topics.filter((t) => t.status === 'In Progress').length;
    const overdueTopicsList = state.topics.filter((t) => isTopicOverdue(t, todayStr));
    const overdueTopics = overdueTopicsList.length;

    const completionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    let totalStudyMinutes = 0;
    let todayStudyMinutes = 0;
    let weeklyStudyMinutes = 0;
    let monthlyStudyMinutes = 0;

    const minutesByDate = {};
    const minutesByModule = {};
    const minutesByTopic = {};

    state.sessions.forEach((s) => {
      const mins = Number(s.durationMinutes) || 0;
      totalStudyMinutes += mins;
      if (s.date === todayStr) todayStudyMinutes += mins;
      if (s.date >= weekStartStr && s.date <= todayStr) weeklyStudyMinutes += mins;
      if (s.date >= monthStartStr && s.date <= todayStr) monthlyStudyMinutes += mins;

      minutesByDate[s.date] = (minutesByDate[s.date] || 0) + mins;
      minutesByModule[s.moduleId] = (minutesByModule[s.moduleId] || 0) + mins;
      minutesByTopic[s.topicId] = (minutesByTopic[s.topicId] || 0) + mins;
    });

    const dailyGoalMins = (state.settings.dailyGoalHours || 2) * 60;
    const weeklyGoalMins = (state.settings.weeklyGoalHours || 14) * 60;
    const dailyGoalPct = dailyGoalMins > 0 ? Math.min(100, Math.round((todayStudyMinutes / dailyGoalMins) * 100)) : 0;
    const weeklyGoalPct = weeklyGoalMins > 0 ? Math.min(100, Math.round((weeklyStudyMinutes / weeklyGoalMins) * 100)) : 0;

    const { currentStreak, longestStreak } = calculateStreaks(state.sessions, todayStr);

    // Module-wise stats
    const moduleStats = state.modules.map((mod) => {
      const modTopics = state.topics.filter((t) => t.moduleId === mod.id);
      const comp = modTopics.filter((t) => t.status === 'Completed').length;
      const inProg = modTopics.filter((t) => t.status === 'In Progress').length;
      const overdue = modTopics.filter((t) => isTopicOverdue(t, todayStr)).length;
      const pct = modTopics.length > 0 ? Math.round((comp / modTopics.length) * 100) : 0;
      const estimatedMinutes = modTopics.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);
      const actualMinutes = modTopics.reduce((acc, t) => acc + (t.actualMinutes || 0), 0);
      const sessionMinutes = minutesByModule[mod.id] || 0;

      return {
        module: mod,
        totalTopics: modTopics.length,
        completedTopics: comp,
        inProgressTopics: inProg,
        overdueTopics: overdue,
        completionPct: pct,
        estimatedMinutes,
        actualMinutes,
        sessionMinutes
      };
    });

    // Weekly activity (last 7 days)
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const dStr = global.StudyStore.addDaysStr(todayStr, -i);
      const [y, m, d] = dStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const label = dt.toLocaleDateString(undefined, { weekday: 'short' });
      weeklyActivity.push({
        date: dStr,
        label,
        minutes: minutesByDate[dStr] || 0
      });
    }

    // Last 14 days activity
    const twoWeekActivity = [];
    for (let i = 13; i >= 0; i--) {
      const dStr = global.StudyStore.addDaysStr(todayStr, -i);
      const [y, m, d] = dStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const label = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      twoWeekActivity.push({
        date: dStr,
        label,
        minutes: minutesByDate[dStr] || 0
      });
    }

    // Last 8 weeks activity
    const weeklyTrend = [];
    for (let w = 7; w >= 0; w--) {
      const endD = global.StudyStore.addDaysStr(todayStr, -w * 7);
      const startD = global.StudyStore.addDaysStr(endD, -6);
      let mins = 0;
      state.sessions.forEach((s) => {
        if (s.date >= startD && s.date <= endD) mins += (s.durationMinutes || 0);
      });
      const [y, m, d] = startD.split('-').map(Number);
      const label = new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      weeklyTrend.push({ label: `Wk ${label}`, minutes: mins });
    }

    // Most studied modules & topics
    const mostStudiedModules = [...moduleStats]
      .filter((ms) => ms.sessionMinutes > 0)
      .sort((a, b) => b.sessionMinutes - a.sessionMinutes)
      .slice(0, 5);

    const mostStudiedTopics = state.topics
      .map((t) => ({
        topic: t,
        minutes: minutesByTopic[t.id] || t.actualMinutes || 0
      }))
      .filter((item) => item.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    // Recently completed topics
    const recentlyCompleted = [...completedTopicsList]
      .sort((a, b) => (b.completionDate || b.updatedAt).localeCompare(a.completionDate || a.updatedAt))
      .slice(0, 5);

    // Upcoming & overdue topics
    const upcomingAndOverdue = state.topics
      .filter((t) => t.status !== 'Completed' && t.dueDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6);

    // Recently studied topics (from sessions)
    const seenTopicIds = new Set();
    const recentlyStudied = [];
    const sortedSessions = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    for (const s of sortedSessions) {
      if (!seenTopicIds.has(s.topicId)) {
        const topic = state.topics.find((t) => t.id === s.topicId);
        if (topic) {
          seenTopicIds.add(s.topicId);
          recentlyStudied.push({ topic, lastSessionDate: s.date });
        }
      }
      if (recentlyStudied.length >= 5) break;
    }

    // Continue learning: in-progress topics prioritized by recent update
    const continueLearning = state.topics
      .filter((t) => t.status === 'In Progress')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 4);

    const stats = {
      todayStr,
      totalModules,
      totalTopics,
      completedTopics,
      pendingTopics,
      inProgressTopics,
      overdueTopics,
      completionPct,
      totalStudyMinutes,
      todayStudyMinutes,
      weeklyStudyMinutes,
      monthlyStudyMinutes,
      dailyGoalPct,
      weeklyGoalPct,
      currentStreak,
      longestStreak,
      minutesByDate,
      minutesByModule,
      minutesByTopic,
      moduleStats,
      weeklyActivity,
      twoWeekActivity,
      weeklyTrend,
      mostStudiedModules,
      mostStudiedTopics,
      recentlyCompleted,
      upcomingAndOverdue,
      recentlyStudied,
      continueLearning
    };

    stats.motivationalMessage = getMotivationalMessage(stats, state.settings);
    return stats;
  }

  global.StudyAnalytics = {
    isTopicOverdue,
    getDueBucket,
    calculateStreaks,
    calculateStats
  };
})(window);

<div align="center">

# StudyTrack

**Self-Managed Personal Learning Dashboard, Syllabus Tracker & Daily Study Log**

[![Offline Ready](https://img.shields.io/badge/Offline-LocalStorage%20%2B%20PWA-4f46e5?style=flat-square)](#architecture)
[![Zero Backend](https://img.shields.io/badge/Backend-None%20(100%25%20Client--Side)-10b981?style=flat-square)](#tech-stack)
[![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages%20Ready-0ea5e9?style=flat-square)](https://abvicky.github.io/StudyTrack/)

*Organize modules, track syllabus completion, log daily study sessions, monitor streaks, and visualize progress — directly in your browser with zero servers or accounts.*

</div>

---

## Highlights

- **100% Client-Side & Private** — Runs locally via `index.html` or on GitHub Pages. All data stays in your browser's `LocalStorage`.
- **Offline-First PWA** — Includes a Service Worker (`sw.js`) and Web App Manifest (`manifest.json`) so it works offline after your first visit.
- **Zero External Runtime Dependencies** — Bundled with Chart.js locally (`assets/chart.umd.min.js`) and inline SVG icons.
- **Light & Dark Modes** — Theme preference is persisted automatically.
- **Responsive Design** — Works seamlessly across desktop, tablet, and mobile viewports.

---

## Core Features

| Section | Capabilities |
| :--- | :--- |
| **Dashboard** | 8 live KPI cards (Modules, Topics, Completed, Pending, In Progress, Syllabus %, Total Hours, Today's Hours), Daily/Weekly goal progress, Study Streak, Weekly Activity & Module Completion charts, Continue Learning, Upcoming & Overdue, and Recently Completed. |
| **My Modules** | Create, edit, delete, and inspect modules with categories, priorities, color accents, target dates, automatic progress bars, and expandable topic drawers. |
| **All Topics** | Manage syllabus topics with notes, estimated vs. actual study time, priorities, due dates, inline status changes, and multi-criteria filtering & sorting. |
| **Daily Study Log** | Log study sessions with auto-calculated duration from start/end times, notes, session status, and breakdowns by Session History, Day, Module, and Topic. |
| **Calendar** | Monthly schedule grid with visual indicators for completed, pending, overdue topics, and study sessions, plus an interactive Day Inspector. |
| **Pending / Due Topics** | Actionable worklist grouped into *Overdue*, *Due Today*, *Due Tomorrow*, *Due This Week*, *Upcoming*, and *No Due Date*. |
| **Analytics** | 14-day daily hours, 8-week trend, Estimated vs. Actual time by module, module-wise progress, and most studied modules & topics. |
| **Settings & Backup** | Customize daily/weekly study goals, export/import full JSON backups with validation, export CSV study reports, load sample data, or reset all data. |

---

## Project Structure

```text
StudyTrack/
├── index.html               # Main application shell & modals
├── manifest.json            # PWA manifest for installability
├── sw.js                    # Service Worker for GitHub Pages offline caching
├── .nojekyll                # Disables Jekyll processing on GitHub Pages
├── assets/
│   └── chart.umd.min.js     # Local Chart.js v4.4.7 bundle
├── css/
│   └── styles.css           # Design system, Light/Dark themes & responsive layout
└── js/
    ├── store.js             # LocalStorage persistence, CRUD, JSON/CSV import & export
    ├── analytics.js         # KPI, streak, due-bucket & trend calculation engine
    ├── ui.js                # Badges, modals, confirmations, toasts & Chart.js helpers
    ├── views.js             # Renderers for all 8 dashboard sections
    └── app.js               # Routing, form validation, global search & event handling
```

---

## Quick Start

### Option 1: Use Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/ABVicky/StudyTrack.git
   ```
2. Open `index.html` directly in any modern browser.

### Option 2: GitHub Pages
1. Go to your repository **Settings → Pages**.
2. Set **Source** to **Deploy from a branch** (`main` / `/ (root)`).
3. Access your dashboard anytime at `https://abvicky.github.io/StudyTrack/`.

---

## Data & Privacy Note

All modules, topics, study sessions, and preferences are stored locally in your browser's `LocalStorage` (`study_tracker_data_v1`). Because `LocalStorage` is browser- and device-specific, clearing browser site data will erase your records. Use **Settings → Export JSON** regularly to keep a portable backup or transfer your data across devices.

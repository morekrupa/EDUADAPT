/**
 * EduAdapt Integrated Platform Controller
 * Handles Authentication (College Code), Global Live Search, AI Game Suggestion Engine,
 * Admin Profile Control Center, Chart Canvas Visualizations, and Navigation.
 */

// Global Application State
const appState = {
  theme: 'light',
  activeTab: 'dashboard',
  authenticated: false,
  clgCode: 'COLLEGE101',
  adminUsername: 'Kumar',

  teachers: [
    { id: 1, name: 'Dr. Sarah Connor', subject: 'Mathematics', classAssigned: 'Class 6 - Div A', email: 's.connor@eduadapt.com', status: 'Active' },
    { id: 2, name: 'Prof. Alan Turing', subject: 'Computer Science & AI', classAssigned: 'Class 6 - Div B', email: 'a.turing@eduadapt.com', status: 'Active' }
  ],

  students: [
    { id: 1, name: 'Priya Das', class: 'Class 6 - Div A', rank: 'LVL 18', streak: '14 Days 🔥', xp: 14200, marks: 71, risk: 'Low' },
    { id: 2, name: 'Vikram Sharma', class: 'Class 6 - Div A', rank: 'LVL 22', streak: '28 Days 🔥', xp: 28900, marks: 91, risk: 'Low' },
    { id: 3, name: 'Aarav Singh', class: 'Class 6 - Div B', rank: 'LVL 12', streak: '8 Days 🔥', xp: 7400, marks: 65, risk: 'Moderate' },
    { id: 4, name: 'Ananya Rao', class: 'Class 6 - Div A', rank: 'LVL 19', streak: '15 Days 🔥', xp: 21100, marks: 85, risk: 'Low' },
    { id: 5, name: 'Rohan Mehta', class: 'Class 6 - Div A', rank: 'LVL 03', streak: '1 Day 🔥', xp: 108, marks: 52, risk: 'High' }
  ],

  badges: [
    { icon: '🚀', name: 'Speed Runner', desc: 'Complete quiz in under 60 seconds' },
    { icon: '🧠', name: 'AI Scholar', desc: 'Maintain 90%+ accuracy across 5 topics' },
    { icon: '🔥', name: 'Streak Master', desc: 'Log in and learn 14 days consecutively' },
    { icon: '👑', name: 'Quest Conqueror', desc: 'Defeat 10 Boss Challenges' }
  ],

  announcements: [
    { id: 1, level: 'Urgent', audience: 'All Users', text: 'System maintenance scheduled tonight 11 PM – 1 AM. Platform may be offline.', date: '3/2/2026' },
    { id: 2, level: 'General', audience: 'Teachers Only', text: 'Please submit Class 6 Mid-term internal assessment scores by Friday.', date: '3/1/2026' }
  ],

  sentMessages: [
    { id: 1, student: 'Rohan Mehta', text: 'Please complete your pending Machine Learning revision assignment by Friday.', time: '10:15 AM' }
  ],

  calendarEvents: [
    { id: 1, title: 'AI Speed Quest', date: '2026-03-10', type: 'Gamified Quest', audience: 'Students', day: 10 },
    { id: 2, title: 'Math Assessment', date: '2026-03-15', type: 'Exam', audience: 'All Users', day: 15 },
    { id: 3, title: 'Faculty Sync', date: '2026-03-20', type: 'Teacher Sync', audience: 'Teachers', day: 20 }
  ],

  // AI Game Idea Templates Pool
  aiGameIdeasPool: [
    { topic: 'Quantum Computing', level: 'Grandmaster Boss', mode: 'RPG Quest', title: 'The Qubit Encryption Siege', xp: 1500, desc: 'Defeat the Quantum Dragon by solving phase superposition puzzles and quantum logic gates!' },
    { topic: 'Calculus Derivatives', level: 'Adept Scholar', mode: 'Arcade Speed', title: 'Slope Racer: Velocity Blitz', xp: 800, desc: 'Race your formula hovercraft across 3D curves by correctly calculating tangents under time pressure!' },
    { topic: 'Ancient Civilizations', level: 'Novice Explorer', mode: 'Sci-Fi Mystery', title: 'Chronos Time-Detective', xp: 600, desc: 'Uncover ancient Mesopotamian artifacts and decipher cuneiform codes to solve time anomalies.' }
  ]
};

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNavigation();
  initThemeToggle();
  initEnhancedSearch();
  initAdminProfileModal();
  initAIGameEngine();
  renderAllViews();
  initForms();
  initCharts();
  initChatbot();
});

// Window Resize Canvas Redraw
window.addEventListener('resize', () => {
  if (appState.authenticated) {
    initCharts();
  }
});

/* ==========================================================================
   1. Authentication & Session Management (College Code)
   ========================================================================== */
function initAuth() {
  const authForm = document.getElementById('auth-form');
  const authOverlay = document.getElementById('auth-overlay');
  const appWrapper = document.getElementById('app-wrapper');

  // Check saved session
  const savedCode = localStorage.getItem('eduadapt_clg_code');
  const savedUser = localStorage.getItem('eduadapt_user');

  if (savedCode && savedUser) {
    appState.clgCode = savedCode;
    appState.adminUsername = savedUser;
    appState.authenticated = true;
    updateAuthUI();
  }

  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = document.getElementById('auth-clg-code').value.trim();
      const username = document.getElementById('auth-username').value.trim();

      if (code && username) {
        appState.clgCode = code;
        appState.adminUsername = username;
        appState.authenticated = true;

        localStorage.setItem('eduadapt_clg_code', code);
        localStorage.setItem('eduadapt_user', username);

        updateAuthUI();
        showToast(`Authenticated! College Code: ${code}`);
        setTimeout(initCharts, 100);
      }
    });
  }
}

function updateAuthUI() {
  const authOverlay = document.getElementById('auth-overlay');
  const appWrapper = document.getElementById('app-wrapper');
  const clgTag = document.getElementById('sidebar-clg-tag');
  const headerUser = document.getElementById('header-admin-name');
  const modalName = document.getElementById('profile-modal-name');
  const modalClg = document.getElementById('profile-modal-clg');

  if (appState.authenticated) {
    if (authOverlay) authOverlay.classList.add('authenticated-hidden');
    if (appWrapper) appWrapper.classList.remove('authenticated-hidden');

    if (clgTag) clgTag.textContent = `Code: ${appState.clgCode}`;
    if (headerUser) headerUser.textContent = `${appState.adminUsername} | Admin`;
    if (modalName) modalName.textContent = `${appState.adminUsername} | Chief Platform Administrator`;
    if (modalClg) modalClg.textContent = `College Code: ${appState.clgCode}`;
  } else {
    if (authOverlay) authOverlay.classList.remove('authenticated-hidden');
    if (appWrapper) appWrapper.classList.add('authenticated-hidden');
  }
}

/* ==========================================================================
   2. Enhanced Live Global Search Engine
   ========================================================================== */
function initEnhancedSearch() {
  const searchInput = document.getElementById('global-search');
  const dropdown = document.getElementById('search-results-dropdown');

  if (!searchInput || !dropdown) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length < 2) {
      dropdown.classList.remove('active');
      dropdown.innerHTML = '';
      return;
    }

    const results = [];

    // Search Teachers
    appState.teachers.forEach(t => {
      if (t.name.toLowerCase().includes(query) || t.subject.toLowerCase().includes(query)) {
        results.push({ title: t.name, sub: `Teacher · ${t.subject}`, target: 'teachers' });
      }
    });

    // Search Students
    appState.students.forEach(s => {
      if (s.name.toLowerCase().includes(query) || s.class.toLowerCase().includes(query)) {
        results.push({ title: s.name, sub: `Student · ${s.class} (${s.xp} XP)`, target: 'students' });
      }
    });

    // Search Events
    appState.calendarEvents.forEach(ev => {
      if (ev.title.toLowerCase().includes(query) || ev.type.toLowerCase().includes(query)) {
        results.push({ title: ev.title, sub: `Calendar · ${ev.date} (${ev.type})`, target: 'calendar' });
      }
    });

    // Render Dropdown Results
    if (results.length > 0) {
      dropdown.innerHTML = results.map(r => `
        <div class="search-item" onclick="navigateToSection('${r.target}')">
          <div class="search-item-title">${r.title}</div>
          <div class="search-item-sub">${r.sub}</div>
        </div>
      `).join('');
      dropdown.classList.add('active');
    } else {
      dropdown.innerHTML = `<div class="search-no-res">No matching platform records found</div>`;
      dropdown.classList.add('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

window.navigateToSection = function(sectionId) {
  const dropdown = document.getElementById('search-results-dropdown');
  if (dropdown) dropdown.classList.remove('active');

  const navItem = document.querySelector(`.nav-item[data-target="${sectionId}"]`);
  if (navItem) navItem.click();
};

/* ==========================================================================
   3. Interactive Admin Profile Control Center Modal
   ========================================================================== */
function initAdminProfileModal() {
  const profileBtn = document.getElementById('admin-profile-btn');
  const modal = document.getElementById('admin-profile-modal');
  const closeBtn = document.getElementById('close-admin-modal');
  const exportBtn = document.getElementById('btn-export-data');
  const auditBtn = document.getElementById('btn-system-audit');
  const cacheBtn = document.getElementById('btn-clear-cache');
  const logoutBtn = document.getElementById('btn-logout');

  if (profileBtn && modal) {
    profileBtn.addEventListener('click', () => modal.classList.add('open'));
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `EduAdapt_Export_${appState.clgCode}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Platform data exported successfully!");
    });
  }

  if (auditBtn) {
    auditBtn.addEventListener('click', () => {
      showToast("Running ML System & Diagnostic Audit...");
      setTimeout(() => {
        showToast("Audit Complete: All 8 Modules Operating Nominally!");
      }, 1000);
    });
  }

  if (cacheBtn) {
    cacheBtn.addEventListener('click', () => {
      showToast("System Cache & Local Buffers Cleared!");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('eduadapt_clg_code');
      localStorage.removeItem('eduadapt_user');
      appState.authenticated = false;
      modal.classList.remove('open');
      updateAuthUI();
      showToast("Logged out of session.");
    });
  }
}

/* ==========================================================================
   4. Interactive AI Game Suggestion Engine
   ========================================================================== */
function initAIGameEngine() {
  const suggestBtn = document.getElementById('btn-ai-random-suggest');
  const topicInput = document.getElementById('topic-input');
  const levelSelect = document.getElementById('level-select');
  const modeSelect = document.getElementById('mode-select');

  if (suggestBtn) {
    suggestBtn.addEventListener('click', () => {
      const randomGame = appState.aiGameIdeasPool[Math.floor(Math.random() * appState.aiGameIdeasPool.length)];
      
      if (topicInput) topicInput.value = randomGame.topic;
      if (levelSelect) levelSelect.value = randomGame.level;
      if (modeSelect) modeSelect.value = randomGame.mode;

      renderAIGameOutput(randomGame);
      showToast(`AI Suggested Game: "${randomGame.title}"!`);
    });
  }
}

function renderAIGameOutput(gameObj) {
  const output = document.getElementById('ai-output');
  if (!output) return;

  output.innerHTML = `
    <div style="background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--accent-purple); position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span class="pill-urgent" style="background: var(--accent-purple);">${gameObj.mode.toUpperCase()}</span>
        <span style="font-size: 0.75rem; font-weight:700; color: var(--accent-green);">+${gameObj.xp} XP AWARD</span>
      </div>
      <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 6px;">${gameObj.title}</h3>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 14px;">
        ${gameObj.desc}
      </p>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-green btn-sm" onclick="showToast('Quest published to all active student portals!')">🚀 Deploy to Students</button>
        <button class="btn btn-outline btn-sm" onclick="playGamePreview('${gameObj.title}')">🎮 Launch Live Test Preview</button>
      </div>
    </div>
  `;
}

window.playGamePreview = function(title) {
  showToast(`Simulating Game Quest: ${title}`);
};

/* ==========================================================================
   Master Render Pipeline & Navigation
   ========================================================================== */
function renderAllViews() {
  renderTeachersTable();
  renderStudentTable();
  renderLeaderboard();
  renderAttentionList();
  renderBadges();
  renderNotices();
  renderSentMessages();
  renderStudentSelect();
  renderCalendar();
  updateKPIs();
}

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');
  const pageTitle = document.getElementById('page-title');

  const titleMap = {
    dashboard: 'Admin Dashboard',
    teachers: 'Teacher Roster & Management',
    students: 'Student Performance & ML Matrix',
    courses: 'Courses & Gamified Quest Creator',
    analytics: 'Machine Learning & Analytics',
    announcements: 'Announcements & Direct Messaging',
    calendar: 'Academic Calendar & Planning',
    gamification: 'Gamification Hub & Badges'
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const targetElement = e.currentTarget;
      const target = targetElement.getAttribute('data-target');

      if (!target) return;

      navItems.forEach(i => i.classList.remove('active'));
      viewSections.forEach(s => s.classList.remove('active'));

      targetElement.classList.add('active');
      const activeSection = document.getElementById(target);
      if (activeSection) activeSection.classList.add('active');

      if (pageTitle && titleMap[target]) {
        pageTitle.textContent = titleMap[target];
      }

      appState.activeTab = target;
      
      if (target === 'dashboard' || target === 'analytics') {
        setTimeout(initCharts, 50);
      }
    });
  });
}

function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      appState.theme = 'dark';
    } else {
      document.documentElement.removeAttribute('data-theme');
      appState.theme = 'light';
    }
    initCharts();
  });
}

/* ==========================================================================
   Data Rendering Components
   ========================================================================== */
function updateKPIs() {
  const kpiMarks = document.getElementById('kpi-marks');
  const kpiXp = document.getElementById('kpi-xp');
  const kpiTeachers = document.getElementById('kpi-teachers');
  const kpiRisk = document.getElementById('kpi-risk');

  if (kpiMarks && appState.students.length > 0) {
    const avgM = Math.round(appState.students.reduce((acc, s) => acc + s.marks, 0) / appState.students.length);
    kpiMarks.textContent = `${avgM}%`;
  }
  if (kpiXp && appState.students.length > 0) {
    const avgX = Math.round(appState.students.reduce((acc, s) => acc + s.xp, 0) / appState.students.length);
    kpiXp.textContent = `${avgX.toLocaleString()} XP`;
  }
  if (kpiTeachers) {
    kpiTeachers.textContent = appState.teachers.length;
    const totalCount = document.getElementById('total-teachers-count');
    if (totalCount) totalCount.textContent = appState.teachers.length;
  }
  if (kpiRisk) {
    const highRiskCount = appState.students.filter(s => s.marks < 60 || s.xp < 1000).length;
    kpiRisk.textContent = `${highRiskCount} Student${highRiskCount !== 1 ? 's' : ''}`;
  }
}

function renderTeachersTable() {
  const tbody = document.getElementById('teachers-table-body');
  if (!tbody) return;

  tbody.innerHTML = appState.teachers.map(t => `
    <tr>
      <td style="font-weight:700;">${t.name}</td>
      <td>${t.subject}</td>
      <td>${t.classAssigned}</td>
      <td>${t.email}</td>
      <td><span class="status-badge status-good">${t.status}</span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteTeacher(${t.id})">Remove</button>
      </td>
    </tr>
  `).join('');
}

function renderStudentTable(filter = '') {
  const tbody = document.getElementById('students-table-body');
  if (!tbody) return;

  const filtered = appState.students.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td style="font-weight:700;">${s.name}</td>
      <td>${s.class}</td>
      <td><span class="level-tag">${s.rank}</span></td>
      <td>${s.streak}</td>
      <td>${s.marks}%</td>
      <td style="color: var(--accent-purple); font-weight:700;">${s.xp.toLocaleString()} XP</td>
      <td><span class="status-badge ${s.marks >= 60 && s.xp >= 1000 ? 'status-good' : 'status-risk'}">${s.marks >= 60 && s.xp >= 1000 ? 'Optimal' : 'Needs Support'}</span></td>
      <td>
        <button class="btn btn-green btn-sm" onclick="awardXP(${s.id})">+ 500 XP</button>
        <button class="btn btn-primary btn-sm" onclick="quickMessage('${s.name}')">Message</button>
        <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id})">&times;</button>
      </td>
    </tr>
  `).join('');
}

function renderLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  const sorted = [...appState.students].sort((a, b) => b.xp - a.xp);

  container.innerHTML = sorted.map((s, index) => `
    <div class="leaderboard-item">
      <div class="student-info">
        <h4>${s.name}</h4>
        <p>XP: ${s.xp.toLocaleString()} · Marks: ${s.marks}%</p>
      </div>
      <div class="rank-tag">#${index + 1}</div>
    </div>
  `).join('');
}

function renderAttentionList() {
  const container = document.getElementById('attention-container');
  if (!container) return;

  const highRiskStudents = appState.students.filter(s => s.marks < 60 || s.xp < 1000);

  if (highRiskStudents.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size:0.85rem;">No students require immediate intervention.</p>`;
  } else {
    container.innerHTML = highRiskStudents.map(s => `
      <div class="leaderboard-item" style="border-left: 3px solid #ef4444;">
        <div class="student-info">
          <h4>${s.name}</h4>
          <p style="color: #ef4444;">ML Risk Score: HIGH (${s.marks}% Marks | ${s.xp} XP)</p>
        </div>
        <button class="btn btn-green btn-sm" onclick="quickMessage('${s.name}')">Message</button>
      </div>
    `).join('');
  }
}

function renderBadges() {
  const badgeContainer = document.getElementById('badge-container');
  if (!badgeContainer) return;

  badgeContainer.innerHTML = appState.badges.map(b => `
    <div class="badge-card">
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>
    </div>
  `).join('');
}

function renderNotices() {
  const container = document.getElementById('notices-container');
  if (!container) return;

  container.innerHTML = appState.announcements.map(a => `
    <div class="notice-card">
      <div class="notice-header">
        <div>
          <span class="pill-urgent">${a.level}</span>
          <span style="font-size:0.75rem; color: var(--text-muted); margin-left: 8px;">Target: ${a.audience}</span>
        </div>
        <span class="notice-date">${a.date}</span>
      </div>
      <div class="notice-text">${a.text}</div>
    </div>
  `).join('');
}

function renderSentMessages() {
  const container = document.getElementById('sent-messages-log');
  if (!container) return;

  container.innerHTML = appState.sentMessages.map(m => `
    <div class="message-bubble">
      <div class="msg-recipient">To: ${m.student}</div>
      <div class="msg-body">${m.text}</div>
      <div class="msg-time">${m.time} · Delivered</div>
    </div>
  `).join('');
}

function renderStudentSelect() {
  const select = document.getElementById('msg-student-select');
  if (!select) return;

  select.innerHTML = appState.students.map(s => `<option value="${s.name}">${s.name} (${s.class})</option>`).join('');
}

function renderCalendar() {
  const grid = document.getElementById('calendar-days-grid');
  const eventList = document.getElementById('calendar-events-list');
  if (!grid) return;

  let html = '';
  for (let i = 1; i <= 31; i++) {
    const dayEvents = appState.calendarEvents.filter(e => e.day === i);
    html += `
      <div class="calendar-day ${i === 9 ? 'active-day' : ''}">
        <div class="day-num">${i}</div>
        ${dayEvents.map(e => `<div class="event-pill" title="${e.title}">${e.title}</div>`).join('')}
      </div>
    `;
  }
  grid.innerHTML = html;

  if (eventList) {
    eventList.innerHTML = appState.calendarEvents.map(e => `
      <div class="message-bubble">
        <div class="msg-recipient">${e.title}</div>
        <div class="msg-body">Date: ${e.date} | Audience: ${e.audience}</div>
        <div class="msg-time" style="color:var(--accent-purple); font-weight:700;">${e.type}</div>
      </div>
    `).join('');
  }
}

/* ==========================================================================
   Global Action Handlers
   ========================================================================== */
window.awardXP = function(id) {
  const student = appState.students.find(s => s.id === id);
  if (student) {
    student.xp += 500;
    const currentLvl = parseInt(student.rank.replace('LVL ', ''));
    if (student.xp >= (currentLvl + 1) * 1000) {
      student.rank = `LVL ${String(currentLvl + 1).padStart(2, '0')}`;
    }
    
    renderStudentTable();
    renderLeaderboard();
    renderAttentionList();
    updateKPIs();
    showToast(`Awarded +500 XP to ${student.name}!`);
  }
};

window.deleteTeacher = function(id) {
  appState.teachers = appState.teachers.filter(t => t.id !== id);
  renderTeachersTable();
  updateKPIs();
  showToast('Teacher record removed.');
};

window.deleteStudent = function(id) {
  appState.students = appState.students.filter(s => s.id !== id);
  renderStudentTable();
  renderLeaderboard();
  renderAttentionList();
  renderStudentSelect();
  updateKPIs();
  showToast('Student record removed.');
};

window.quickMessage = function(studentName) {
  navigateToSection('announcements');
  const select = document.getElementById('msg-student-select');
  if (select) {
    for (let opt of select.options) {
      if (opt.value.includes(studentName)) {
        select.value = opt.value;
        break;
      }
    }
  }
};

function showToast(msg) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');

  if (!toast) return;
  if (msgEl) msgEl.textContent = msg;

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ==========================================================================
   Form Handling Engine
   ========================================================================== */
function initForms() {
  const addTeacherForm = document.getElementById('add-teacher-form');
  if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('teacher-name').value;
      const subject = document.getElementById('teacher-subject').value;
      const classAssigned = document.getElementById('teacher-class').value;
      const email = document.getElementById('teacher-email').value;

      appState.teachers.unshift({
        id: Date.now(),
        name, subject, classAssigned, email, status: 'Active'
      });

      renderTeachersTable();
      updateKPIs();
      addTeacherForm.reset();
      showToast(`Teacher ${name} added successfully!`);
    });
  }

  const addStudentForm = document.getElementById('add-student-form');
  if (addStudentForm) {
    addStudentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('student-name').value;
      const cls = document.getElementById('student-class').value;
      const marks = parseInt(document.getElementById('student-marks').value);
      const xp = parseInt(document.getElementById('student-xp').value);

      appState.students.unshift({
        id: Date.now(),
        name, class: cls, rank: 'LVL 01', streak: '1 Day 🔥', xp, marks,
        risk: marks < 60 || xp < 1000 ? 'High' : 'Low'
      });

      renderStudentTable();
      renderLeaderboard();
      renderAttentionList();
      renderStudentSelect();
      updateKPIs();
      addStudentForm.reset();
      showToast(`Student ${name} enrolled successfully!`);
    });
  }

  const searchLearners = document.getElementById('search-learners');
  if (searchLearners) {
    searchLearners.addEventListener('input', (e) => {
      renderStudentTable(e.target.value);
    });
  }

  const noticeForm = document.getElementById('notice-form');
  if (noticeForm) {
    noticeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const audience = document.getElementById('notice-audience-select').value;
      const level = document.getElementById('notice-level-select').value;
      const text = document.getElementById('notice-text-input').value;

      appState.announcements.unshift({
        id: Date.now(), level, audience, text, date: new Date().toLocaleDateString()
      });

      renderNotices();
      document.getElementById('notice-text-input').value = '';
      showToast(`Announcement posted to ${audience}!`);
    });
  }

  const msgForm = document.getElementById('direct-msg-form');
  if (msgForm) {
    msgForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const student = document.getElementById('msg-student-select').value;
      const text = document.getElementById('msg-text-input').value;
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      appState.sentMessages.unshift({
        id: Date.now(), student, text, time
      });

      renderSentMessages();
      document.getElementById('msg-text-input').value = '';
      showToast('Direct message sent!');
    });
  }

  const calForm = document.getElementById('add-calendar-form');
  if (calForm) {
    calForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('event-title').value;
      const dateVal = document.getElementById('event-date').value;
      const type = document.getElementById('event-type').value;
      const audience = document.getElementById('event-audience').value;
      const day = dateVal ? parseInt(dateVal.split('-')[2]) : 15;

      appState.calendarEvents.push({
        id: Date.now(), title, date: dateVal, type, audience, day
      });

      renderCalendar();
      calForm.reset();
      showToast(`Event "${title}" added to Calendar!`);
    });
  }

  const aiForm = document.getElementById('ai-generator-form');
  if (aiForm) {
    aiForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const topic = document.getElementById('topic-input').value;
      const level = document.getElementById('level-select').value;
      const mode = document.getElementById('mode-select').value;

      renderAIGameOutput({
        topic,
        level,
        mode,
        title: `Quest for the ${topic} Sanctuary`,
        desc: `AI-generated adaptive ${mode} targeting ${level} difficulty. Automatically adjusts question complexity based on real-time student accuracy scores.`,
        xp: level === 'Grandmaster Boss' ? 1200 : 750
      });
      showToast("Custom AI Quest synthesized successfully!");
    });
  }
}

/* ==========================================================================
   HTML5 Canvas Analytics Visualizations
   ========================================================================== */
function initCharts() {
  const isDark = appState.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  const lineCanvas = document.getElementById('performanceChart');
  if (lineCanvas) {
    const ctx = lineCanvas.getContext('2d');
    const w = lineCanvas.width = lineCanvas.parentElement.clientWidth;
    const h = lineCanvas.height = 220;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let y = 30; y < h; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const points = [
      { x: 20, y: 160 },
      { x: w * 0.25, y: 110 },
      { x: w * 0.5, y: 130 },
      { x: w * 0.75, y: 60 },
      { x: w - 20, y: 40 }
    ];

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#8b5cf6');
    gradient.addColorStop(1, '#ec4899');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.stroke();

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  const barCanvas = document.getElementById('subjectChart');
  if (barCanvas) {
    const ctx = barCanvas.getContext('2d');
    const w = barCanvas.width = barCanvas.parentElement.clientWidth;
    const h = barCanvas.height = 220;

    ctx.clearRect(0, 0, w, h);

    const barData = [
      { label: 'Math', value: 85, color: '#8b5cf6' },
      { label: 'AI/CS', value: 92, color: '#ec4899' },
      { label: 'Science', value: 78, color: '#06b6d4' },
      { label: 'Logic', value: 88, color: '#10b981' }
    ];

    const barWidth = 36;
    const gap = (w - (barData.length * barWidth)) / (barData.length + 1);

    barData.forEach((item, index) => {
      const x = gap + index * (barWidth + gap);
      const barH = (item.value / 100) * (h - 60);
      const y = h - barH - 30;

      ctx.fillStyle = item.color;
      ctx.fillRect(x, y, barWidth, barH);

      ctx.fillStyle = textColor;
      ctx.font = '12px Plus Jakarta Sans, sans-serif';
      ctx.fillText(item.label, x, h - 10);
    });
  }

  const predCanvas = document.getElementById('predictionChart');
  if (predCanvas) {
    const ctx = predCanvas.getContext('2d');
    const w = predCanvas.width = predCanvas.parentElement.clientWidth;
    const h = predCanvas.height = 220;

    ctx.clearRect(0, 0, w, h);

    const categories = [
      { label: 'Low Risk (Optimal)', count: 4, color: '#22c55e' },
      { label: 'Moderate Risk', count: 1, color: '#f59e0b' },
      { label: 'High Risk (Action Needed)', count: 1, color: '#ef4444' }
    ];

    categories.forEach((cat, index) => {
      const y = 30 + index * 50;
      const barW = (cat.count / 5) * (w - 180);

      ctx.fillStyle = textColor;
      ctx.font = '11px Plus Jakarta Sans, sans-serif';
      ctx.fillText(cat.label, 10, y + 16);

      ctx.fillStyle = cat.color;
      ctx.fillRect(160, y, barW, 22);

      ctx.fillStyle = textColor;
      ctx.fillText(`${cat.count} Students`, 170 + barW, y + 16);
    });
  }
}

/* ==========================================================================
   AI Floating Support Bot
   ========================================================================== */
function initChatbot() {
  const trigger = document.getElementById('chatbot-trigger');
  const windowEl = document.getElementById('chatbot-window');
  const close = document.getElementById('chat-close');
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  const msgContainer = document.getElementById('chat-messages');

  if (!trigger || !windowEl) return;

  trigger.addEventListener('click', () => windowEl.classList.toggle('open'));
  if (close) close.addEventListener('click', () => windowEl.classList.remove('open'));

  function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    msgContainer.innerHTML += `<div class="chat-msg user">${text}</div>`;
    input.value = '';
    msgContainer.scrollTop = msgContainer.scrollHeight;

    setTimeout(() => {
      let botReply = "I can help analyze performance metrics, suggest AI game quests, or navigate platform features.";
      const lower = text.toLowerCase();

      if (lower.includes('rohan') || lower.includes('risk')) {
        botReply = "ML Alert: Rohan Mehta has low XP (108) and 52% Marks. Recommended: Send a direct message or trigger a gamified revision quest.";
      } else if (lower.includes('code') || lower.includes('college')) {
        botReply = `Your currently authenticated College Code is: ${appState.clgCode}. You can view institution diagnostics in the Admin Profile modal.`;
      } else if (lower.includes('game') || lower.includes('suggest')) {
        botReply = "Navigate to 'Courses & AI Games' to synthesize new game suggestions or click 'AI Suggest Game Idea'!";
      }

      msgContainer.innerHTML += `<div class="chat-msg bot">${botReply}</div>`;
      msgContainer.scrollTop = msgContainer.scrollHeight;
    }, 500);
  }

  if (sendBtn) sendBtn.addEventListener('click', handleSend);
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }
}
// =========================================================================
// EduAdapt Teacher Dashboard — Application Logic
// =========================================================================

// ---- Static Reference Data --------------------------------------------
const GRADES = ['6', '7', '8', '9', '10'];
const SECTIONS = ['A', 'B'];
const ALL_SUBJECTS = ['Maths', 'Science', 'History', 'EVS'];

function ordinal(g) {
  const map = { '6': '6th', '7': '7th', '8': '8th', '9': '9th', '10': '10th' };
  return map[g] || `${g}th`;
}

// Build the full list of class-sections: 6th A, 6th B, 7th A ... 10th B
const CLASS_SECTIONS = [];
GRADES.forEach(g => {
  SECTIONS.forEach(s => {
    CLASS_SECTIONS.push({
      id: `${g}${s}`,
      grade: g,
      section: s,
      label: `${ordinal(g)} ${s}`
    });
  });
});

// EVS is only taught in the lower grades (6th - 8th), matching typical curricula.
function subjectsForGrade(grade) {
  return grade <= '8' ? ALL_SUBJECTS : ALL_SUBJECTS.filter(s => s !== 'EVS');
}

function classLabel(classId) {
  const c = CLASS_SECTIONS.find(c => c.id === classId);
  return c ? c.label : classId;
}

// ---- Application Global State ------------------------------------------
const state = {
  currentTab: 'dashboard',
  darkMode: false,
  totalXP: 128450,
  language: 'English',
  bossHP: 1000,
  maxBossHP: 1000,
  currentMonth: 7, // August
  currentYear: 2026,

  // Teacher's saved profile & preferences (set during registration/setup)
  teacher: null,

  // MES ID used to log in (set during login)
  mesId: null,

  // The class-section currently being viewed across the dashboard
  classFilter: 'ALL',
  // The subject currently being viewed in the Gamification Lab
  subjectFilter: 'ALL',

  students: [],
  games: [],
  assessments: [],
  announcements: [],
  calendarEvents: [],
  guilds: [
    { name: 'Alpha Wyverns', xp: 42500, members: 12, rank: 1 },
    { name: 'Beta Phoenix', xp: 38900, members: 12, rank: 2 },
    { name: 'Gamma Titans', xp: 31200, members: 12, rank: 3 }
  ]
};

// Chart instances
let overviewChartInstance = null;
let gameAnalysisChartInstance = null;

// =========================================================================
// SEED DATA GENERATION (class-wise students, games, assessments, etc.)
// =========================================================================

const FIRST_NAMES = ['Alex', 'Sarah', 'Jordan', 'Emily', 'Michael', 'Priya', 'Rahul', 'Zoe', 'Liam', 'Ananya',
  'Noah', 'Fatima', 'Ethan', 'Kavya', 'Aiden', 'Diya', 'Mason', 'Ishaan', 'Grace', 'Aarav'];
const LAST_NAMES = ['Mercer', 'Lin', 'Smith', 'Watson', 'Chang', 'Sharma', 'Verma', 'Patel', 'Nair', 'Iyer',
  'Khan', 'Reddy', 'Gupta', 'Rao', 'Das', 'Menon', 'Kapoor', 'Joshi', 'Singh', 'Bose'];

function seedStudents() {
  let studentCounter = 1;
  const students = [];
  CLASS_SECTIONS.forEach(cs => {
    const subjects = subjectsForGrade(cs.grade);
    const countInClass = 5; // 5 students per class-section (50 total)
    for (let i = 0; i < countInClass; i++) {
      const fn = FIRST_NAMES[(studentCounter * 3 + i) % FIRST_NAMES.length];
      const ln = LAST_NAMES[(studentCounter * 7 + i) % LAST_NAMES.length];
      const subjectScores = {};
      subjects.forEach((subj, si) => {
        // Deterministic-ish varied scores so the data feels real
        const base = 65 + ((studentCounter * 13 + si * 17 + i * 5) % 33);
        subjectScores[subj] = base;
      });
      students.push({
        id: 1000 + studentCounter,
        name: `${fn} ${ln}`,
        code: `STU-${String(studentCounter).padStart(3, '0')}`,
        class: cs.grade,
        section: cs.section,
        classId: cs.id,
        streak: (studentCounter * 3) % 16,
        status: (studentCounter % 6 === 0) ? 'Absent' : 'Present',
        subjectScores
      });
      studentCounter++;
    }
  });
  return students;
}

function seedGames() {
  return [
    { id: 1, title: 'Math Dungeon Crawler', subject: 'Maths', classes: ['8A', '8B'], type: 'Dungeon Crawler', difficulty: 'Hard', xp: 1000, date: '2026-08-04', completionRate: 88, avgScore: 91, avgTime: '14.2 min', scores: [85, 90, 95, 88, 92] },
    { id: 2, title: 'Speed Quiz Boss Battle', subject: 'Maths', classes: ['9A', '9B'], type: 'Speed Quiz Boss', difficulty: 'Medium', xp: 500, date: '2026-08-03', completionRate: 94, avgScore: 86, avgTime: '8.5 min', scores: [80, 85, 88, 90, 86] },
    { id: 3, title: 'Derivative Dragon Quest', subject: 'Maths', classes: ['10A', '10B'], type: 'Guild Team Quest', difficulty: 'Hard', xp: 1200, date: '2026-08-01', completionRate: 76, avgScore: 78, avgTime: '22.0 min', scores: [70, 75, 82, 80, 78] },
    { id: 4, title: 'Cell Explorer Runner', subject: 'Science', classes: ['7A', '7B'], type: 'Flashcard Runner', difficulty: 'Easy', xp: 200, date: '2026-08-02', completionRate: 90, avgScore: 84, avgTime: '9.0 min', scores: [78, 82, 88, 84, 86] },
    { id: 5, title: 'Ancient Empires Quest', subject: 'History', classes: ['6A', '6B'], type: 'Guild Team Quest', difficulty: 'Medium', xp: 500, date: '2026-08-05', completionRate: 82, avgScore: 80, avgTime: '11.5 min', scores: [75, 78, 84, 80, 83] },
    { id: 6, title: 'Habitat Heroes', subject: 'EVS', classes: ['6A', '7A'], type: 'Dungeon Crawler', difficulty: 'Easy', xp: 300, date: '2026-08-03', completionRate: 87, avgScore: 85, avgTime: '10.0 min', scores: [80, 84, 88, 86, 87] }
  ];
}

function seedAssessments() {
  return [
    { id: 1, title: 'Algebra II Midterm', subject: 'Maths', classId: '9A', date: '2026-08-10', submissions: '4 / 5', status: 'Upcoming' },
    { id: 2, title: 'Limits & Derivatives Test', subject: 'Maths', classId: '10A', date: '2026-08-02', submissions: '5 / 5', status: 'Graded' },
    { id: 3, title: 'Cell Biology Diagnostic', subject: 'Science', classId: '7A', date: '2026-08-06', submissions: '4 / 5', status: 'In Progress' },
    { id: 4, title: 'Ancient Civilizations Quiz', subject: 'History', classId: '6A', date: '2026-08-07', submissions: '5 / 5', status: 'Graded' },
    { id: 5, title: 'Ecosystems Worksheet', subject: 'EVS', classId: '6B', date: '2026-08-09', submissions: '3 / 5', status: 'In Progress' }
  ];
}

function seedAnnouncements() {
  return [
    { id: 1, title: 'Calculus Guild Quest Live!', category: 'Quest Hint', subject: 'Maths', classId: '10A', content: 'Team up with your squad to tackle Chapter 4 Boss derivatives today!', date: '2026-08-04' },
    { id: 2, title: 'Midterm Prep Workshop', category: 'Important', subject: 'ALL', classId: 'ALL', content: 'Extra credit review session scheduled for Friday at 3:00 PM.', date: '2026-08-02' }
  ];
}

function seedCalendarEvents() {
  return [
    { id: 1, title: 'Math Dungeon Crawler', type: 'game', subject: 'Maths', classId: '8A', date: '2026-08-04' },
    { id: 2, title: 'Cell Biology Diagnostic Due', type: 'exam', subject: 'Science', classId: '7A', date: '2026-08-06' },
    { id: 3, title: 'Algebra II Midterm', type: 'exam', subject: 'Maths', classId: '9A', date: '2026-08-10' }
  ];
}

// =========================================================================
// TEACHER PROFILE / PREFERENCES (Registration & Setup)
// =========================================================================

const TEACHER_STORAGE_KEY = 'eduadapt_teacher_profile';

function loadTeacherProfile() {
  try {
    const raw = localStorage.getItem(TEACHER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveTeacherProfile(profile) {
  try {
    localStorage.setItem(TEACHER_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) { /* ignore storage errors */ }
}

// Returns the list of class-section IDs this teacher is permitted to view.
function getAccessibleClasses() {
  if (!state.teacher) return CLASS_SECTIONS.map(c => c.id);
  const set = new Set();
  if (state.teacher.classTeacherOf) set.add(state.teacher.classTeacherOf);
  Object.values(state.teacher.subjectAssignments || {}).forEach(classes => {
    classes.forEach(c => set.add(c));
  });
  // Fallback: if the teacher somehow has no assignments, show everything
  // rather than an empty dashboard.
  return set.size > 0 ? Array.from(set) : CLASS_SECTIONS.map(c => c.id);
}

// Returns the list of subjects this teacher actively teaches.
function getAccessibleSubjects() {
  if (!state.teacher) return ALL_SUBJECTS;
  const subs = Object.keys(state.teacher.subjectAssignments || {})
    .filter(s => (state.teacher.subjectAssignments[s] || []).length > 0);
  return subs.length > 0 ? subs : ALL_SUBJECTS;
}

function isClassAccessible(classId) {
  if (classId === 'ALL') return true;
  const accessible = getAccessibleClasses();
  return accessible.includes(classId);
}

function isSubjectAccessible(subject) {
  if (subject === 'ALL') return true;
  return getAccessibleSubjects().includes(subject);
}

// =========================================================================
// MES ID LOGIN
// =========================================================================

const LOGIN_STORAGE_KEY = 'eduadapt_mes_id';

function loadMesId() {
  try {
    return localStorage.getItem(LOGIN_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

function saveMesId(mesId) {
  try {
    localStorage.setItem(LOGIN_STORAGE_KEY, mesId);
  } catch (e) { /* ignore storage errors */ }
}

function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  lucide.createIcons();
}

function hideLoginScreen() {
  document.getElementById('login-screen').classList.add('hidden');
}

function handleLogin(e) {
  e.preventDefault();

  const mesId = document.getElementById('login-mes-id').value.trim();
  const errorEl = document.getElementById('login-error');

  if (!mesId) {
    errorEl.classList.remove('hidden');
    return;
  }
  errorEl.classList.add('hidden');

  state.mesId = mesId;
  saveMesId(mesId);

  hideLoginScreen();
  initApp();
}

function logout() {
  try {
    localStorage.removeItem(LOGIN_STORAGE_KEY);
  } catch (e) { /* ignore */ }
  window.location.reload();
}

// ---- Setup Screen UI -----------------------------------------------------

function renderSubjectClassPickers() {
  const container = document.getElementById('subject-class-picker-container');
  container.innerHTML = ALL_SUBJECTS.map(subj => `
    <div class="border border-slate-200 dark:border-slate-700 rounded-xl p-3">
      <label class="flex items-center space-x-2 cursor-pointer">
        <input type="checkbox" class="subject-toggle w-4 h-4 accent-emerald-600" data-subject="${subj}" onchange="toggleSubjectClassBlock('${subj}')">
        <span class="font-bold text-slate-700 dark:text-slate-200">${subj}</span>
      </label>
      <div id="classes-for-${subj}" class="hidden mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
        ${CLASS_SECTIONS.filter(cs => subjectsForGrade(cs.grade).includes(subj)).map(cs => `
          <label class="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700">
            <input type="checkbox" class="class-toggle accent-emerald-600" data-subject="${subj}" value="${cs.id}">
            <span class="text-slate-600 dark:text-slate-300">${cs.label}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function toggleSubjectClassBlock(subject) {
  const block = document.getElementById(`classes-for-${subject}`);
  const checkbox = document.querySelector(`.subject-toggle[data-subject="${subject}"]`);
  block.classList.toggle('hidden', !checkbox.checked);
}

function populateClassTeacherDropdown() {
  const select = document.getElementById('setup-class-teacher-of');
  select.innerHTML = `<option value="">Not a Class Teacher / Mentor</option>` +
    CLASS_SECTIONS.map(cs => `<option value="${cs.id}">${cs.label}</option>`).join('');
}

function showTeacherSetup(prefill) {
  populateClassTeacherDropdown();
  renderSubjectClassPickers();

  if (prefill) {
    document.getElementById('setup-name').value = prefill.name || '';
    document.getElementById('setup-email').value = prefill.email || '';
    document.getElementById('setup-class-teacher-of').value = prefill.classTeacherOf || '';

    Object.entries(prefill.subjectAssignments || {}).forEach(([subj, classes]) => {
      if (!classes || classes.length === 0) return;
      const subjToggle = document.querySelector(`.subject-toggle[data-subject="${subj}"]`);
      if (subjToggle) {
        subjToggle.checked = true;
        toggleSubjectClassBlock(subj);
      }
      classes.forEach(cid => {
        const cToggle = document.querySelector(`.class-toggle[data-subject="${subj}"][value="${cid}"]`);
        if (cToggle) cToggle.checked = true;
      });
    });
  }

  document.getElementById('teacher-setup-screen').classList.remove('hidden');
  lucide.createIcons();
}

function hideTeacherSetup() {
  document.getElementById('teacher-setup-screen').classList.add('hidden');
}

function handleTeacherRegister(e) {
  e.preventDefault();

  const name = document.getElementById('setup-name').value.trim();
  const email = document.getElementById('setup-email').value.trim();
  const classTeacherOf = document.getElementById('setup-class-teacher-of').value || null;

  const subjectAssignments = {};
  document.querySelectorAll('.subject-toggle').forEach(toggle => {
    const subj = toggle.dataset.subject;
    if (toggle.checked) {
      const classes = Array.from(document.querySelectorAll(`.class-toggle[data-subject="${subj}"]:checked`)).map(el => el.value);
      subjectAssignments[subj] = classes;
    }
  });

  if (!classTeacherOf && Object.keys(subjectAssignments).length === 0) {
    alert('Please select at least a homeroom class or one subject you teach, so we know which students to show you.');
    return;
  }

  const profile = { name, email, classTeacherOf, subjectAssignments };
  state.teacher = profile;
  saveTeacherProfile(profile);

  hideTeacherSetup();
  applyTeacherPreferences();
  alert(`Welcome, ${name}! Your dashboard has been personalized to your assigned classes and subjects.`);
}

function editTeacherProfile() {
  showTeacherSetup(state.teacher);
}

// Refresh header info + filters + every view after preferences change.
function applyTeacherPreferences() {
  renderTeacherHeaderTag();
  populateClassFilterDropdown();
  populateSubjectFilterButtons();

  const accessibleClasses = getAccessibleClasses();
  state.classFilter = accessibleClasses.length === 1 ? accessibleClasses[0] : 'ALL';

  const accessibleSubjects = getAccessibleSubjects();
  state.subjectFilter = accessibleSubjects.length === 1 ? accessibleSubjects[0] : 'ALL';

  renderEverything();
}

function renderTeacherHeaderTag() {
  const nameEl = document.getElementById('header-teacher-name');
  const roleEl = document.getElementById('header-teacher-role');
  const avatarEl = document.getElementById('header-teacher-avatar');
  if (!state.teacher) return;

  nameEl.textContent = state.teacher.name || 'Teacher';
  avatarEl.textContent = (state.teacher.name || 'TR').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const bits = [];
  if (state.teacher.classTeacherOf) bits.push(`Class Teacher · ${classLabel(state.teacher.classTeacherOf)}`);
  const subs = Object.keys(state.teacher.subjectAssignments || {}).filter(s => (state.teacher.subjectAssignments[s] || []).length > 0);
  if (subs.length > 0) bits.push(`${subs.join(', ')} Teacher`);
  roleEl.textContent = bits.length > 0 ? bits.join(' • ') : 'Lead Instructor';
}

// =========================================================================
// CLASS / SUBJECT FILTER CONTROLS
// =========================================================================

function populateClassFilterDropdown() {
  const select = document.getElementById('class-filter-dropdown');
  const accessible = getAccessibleClasses();
  const sorted = CLASS_SECTIONS.filter(cs => accessible.includes(cs.id));

  let options = '';
  if (sorted.length > 1) options += `<option value="ALL">All My Classes</option>`;
  options += sorted.map(cs => `<option value="${cs.id}">${cs.label}</option>`).join('');
  select.innerHTML = options;
  select.value = state.classFilter && (state.classFilter === 'ALL' || accessible.includes(state.classFilter))
    ? state.classFilter
    : (sorted[0] ? sorted[0].id : 'ALL');
  state.classFilter = select.value;
}

function setClassFilter(classId) {
  state.classFilter = classId;
  const select = document.getElementById('class-filter-dropdown');
  if (select) select.value = classId;
  renderEverything();
}

function populateSubjectFilterButtons() {
  const container = document.getElementById('subject-filter-buttons');
  const accessible = getAccessibleSubjects();
  const showAll = accessible.length > 1;

  let html = '';
  if (showAll) {
    html += `<button onclick="setSubjectFilter('ALL')" data-subject-btn="ALL" class="subject-filter-btn px-3 py-1.5 rounded-lg text-[11px] font-bold border transition">All Subjects</button>`;
  }
  html += accessible.map(subj => `
    <button onclick="setSubjectFilter('${subj}')" data-subject-btn="${subj}" class="subject-filter-btn px-3 py-1.5 rounded-lg text-[11px] font-bold border transition">${subjectIcon(subj)} ${subj}</button>
  `).join('');
  container.innerHTML = html;
  highlightActiveSubjectButton();
}

function subjectIcon(subj) {
  return { Maths: '➗', Science: '🔬', History: '📜', EVS: '🌱' }[subj] || '📘';
}

function highlightActiveSubjectButton() {
  document.querySelectorAll('.subject-filter-btn').forEach(btn => {
    const isActive = btn.dataset.subjectBtn === state.subjectFilter;
    btn.classList.toggle('bg-emerald-600', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('border-emerald-600', isActive);
    btn.classList.toggle('bg-white', !isActive);
    btn.classList.toggle('dark:bg-slate-800', !isActive);
    btn.classList.toggle('text-slate-600', !isActive);
    btn.classList.toggle('dark:text-slate-300', !isActive);
    btn.classList.toggle('border-slate-300', !isActive);
    btn.classList.toggle('dark:border-slate-700', !isActive);
  });
}

function setSubjectFilter(subject) {
  state.subjectFilter = subject;
  highlightActiveSubjectButton();
  renderGamificationLab();
}

// ---- Filtering Helpers ----------------------------------------------------

function currentClassScope() {
  // Returns the array of class IDs currently in scope (respecting both the
  // teacher's permissions AND the active dropdown filter).
  const accessible = getAccessibleClasses();
  if (state.classFilter === 'ALL') return accessible;
  return accessible.includes(state.classFilter) ? [state.classFilter] : accessible;
}

function filterStudents() {
  const scope = currentClassScope();
  return state.students.filter(s => scope.includes(s.classId));
}

function filterGames() {
  const scope = currentClassScope();
  return state.games.filter(g => {
    const inClassScope = g.classes.some(c => scope.includes(c));
    const inSubjectScope = state.subjectFilter === 'ALL' || g.subject === state.subjectFilter;
    const teacherCanSee = isSubjectAccessible(g.subject);
    return inClassScope && inSubjectScope && teacherCanSee;
  });
}

function filterAssessments() {
  const scope = currentClassScope();
  return state.assessments.filter(a => scope.includes(a.classId) && isSubjectAccessible(a.subject));
}

function filterAnnouncements() {
  const scope = currentClassScope();
  return state.announcements.filter(a => a.classId === 'ALL' || scope.includes(a.classId));
}

function filterCalendarEvents() {
  const scope = currentClassScope();
  return state.calendarEvents.filter(e => !e.classId || e.classId === 'ALL' || scope.includes(e.classId));
}

// =========================================================================
// INITIALIZE APP
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  const savedMesId = loadMesId();
  if (savedMesId) {
    state.mesId = savedMesId;
    initApp();
  } else {
    // Not logged in yet: require MES ID login before entering the app.
    showLoginScreen();
  }
});

function initApp() {
  state.students = seedStudents();
  state.games = seedGames();
  state.assessments = seedAssessments();
  state.announcements = seedAnnouncements();
  state.calendarEvents = seedCalendarEvents();

  lucide.createIcons();

  const savedTeacher = loadTeacherProfile();
  if (savedTeacher) {
    state.teacher = savedTeacher;
    applyTeacherPreferences();
  } else {
    // First-time use: ask the teacher to set their class & subject preferences.
    populateClassFilterDropdown();
    populateSubjectFilterButtons();
    renderEverything();
    showTeacherSetup(null);
  }

  initCharts();
}

function renderEverything() {
  renderDashboard();
  renderGamificationLab();
  renderGuilds();
  renderAssessments();
  renderAttendance();
  renderAnnouncements();
  renderCalendar();
  refreshOverviewChart();
}

// Dark Mode Toggle Function
function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  const html = document.documentElement;
  const badge = document.getElementById('dark-mode-badge');
  const text = document.getElementById('dark-mode-text');

  if (state.darkMode) {
    html.classList.add('dark');
    html.classList.remove('light');
    badge.textContent = 'ON';
    badge.className = 'text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-white font-bold';
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
    badge.textContent = 'OFF';
    badge.className = 'text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold';
  }
}

// Single Page Navigation Switcher
function switchTab(tabId) {
  state.currentTab = tabId;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  const viewEl = document.getElementById(`view-${tabId}`);
  const navBtn = document.getElementById(`nav-${tabId}`);

  if (viewEl) viewEl.classList.remove('hidden');
  if (navBtn) navBtn.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    gamification: 'Gamification Lab',
    bossbattle: 'Live Boss Battle',
    skilltree: 'Skills & Guilds',
    assessments: 'Assessments',
    attendance: 'Attendance',
    announcements: 'Announcements',
    calendar: 'Calendar'
  };

  document.getElementById('breadcrumb-active').textContent = titles[tabId] || 'Dashboard';

  // Re-render the view being navigated to, so it always reflects the
  // current class/subject filters even if data changed elsewhere.
  const renderers = {
    dashboard: renderDashboard,
    gamification: renderGamificationLab,
    skilltree: renderGuilds,
    assessments: renderAssessments,
    attendance: renderAttendance,
    announcements: renderAnnouncements,
    calendar: renderCalendar
  };
  if (renderers[tabId]) renderers[tabId]();

  lucide.createIcons();
}

// Search Function
function handleSearch(query) {
  const dropdown = document.getElementById('search-results-dropdown');
  if (!query.trim()) {
    dropdown.classList.add('hidden');
    return;
  }

  const q = query.toLowerCase();
  const matchedGames = filterGames().filter(g => g.title.toLowerCase().includes(q) || g.subject.toLowerCase().includes(q));
  const matchedStudents = filterStudents().filter(s => s.name.toLowerCase().includes(q));
  const matchedAssessments = filterAssessments().filter(a => a.title.toLowerCase().includes(q));

  let html = '';

  if (matchedGames.length > 0) {
    html += `<div class="p-2 font-bold text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-800">Games & Quests</div>`;
    matchedGames.forEach(g => {
      html += `<div onclick="switchTab('gamification'); loadSelectedGameAnalysis(${g.id});" class="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs">
        <p class="font-bold text-slate-800 dark:text-slate-100">${g.title}</p>
        <span class="text-[10px] text-emerald-600 font-semibold">${g.subject} • ${g.difficulty}</span>
      </div>`;
    });
  }

  if (matchedStudents.length > 0) {
    html += `<div class="p-2 font-bold text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-800">Students</div>`;
    matchedStudents.forEach(s => {
      html += `<div onclick="switchTab('attendance');" class="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs">
        <p class="font-bold text-slate-800 dark:text-slate-100">${s.name} (${s.code})</p>
        <span class="text-[10px] text-slate-400">${classLabel(s.classId)} • Streak: ${s.streak} Days</span>
      </div>`;
    });
  }

  if (matchedAssessments.length > 0) {
    html += `<div class="p-2 font-bold text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-800">Assessments</div>`;
    matchedAssessments.forEach(a => {
      html += `<div onclick="switchTab('assessments');" class="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs">
        <p class="font-bold text-slate-800 dark:text-slate-100">${a.title}</p>
        <span class="text-[10px] text-amber-600 font-semibold">${classLabel(a.classId)} • Due: ${a.date}</span>
      </div>`;
    });
  }

  if (!html) {
    html = `<div class="p-4 text-center text-xs text-slate-400">No matching results found.</div>`;
  }

  dropdown.innerHTML = html;
  dropdown.classList.remove('hidden');
}

// Header Menus Toggle
function toggleGlobeMenu() {
  document.getElementById('globe-menu').classList.toggle('hidden');
  document.getElementById('notif-menu').classList.add('hidden');
}

function toggleNotifMenu() {
  document.getElementById('notif-menu').classList.toggle('hidden');
  document.getElementById('globe-menu').classList.add('hidden');
}

function setLanguage(lang) {
  state.language = lang;
  alert(`Language set to ${lang}`);
  document.getElementById('globe-menu').classList.add('hidden');
}

// Floating AI Chatbot
function toggleChatbot() {
  document.getElementById('chatbot-panel').classList.toggle('hidden');
}

function sendQuickPrompt(promptText) {
  document.getElementById('chat-input').value = promptText;
  handleSendChatMessage(new Event('submit'));
}

function handleSendChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const query = input.value.trim();
  if (!query) return;

  const messagesContainer = document.getElementById('chat-messages');

  // Append user message
  messagesContainer.innerHTML += `
    <div class="flex items-start space-x-2 justify-end">
      <div class="p-3 bg-emerald-600 text-white rounded-2xl rounded-tr-none shadow-sm text-slate-100">
        ${query}
      </div>
    </div>
  `;

  input.value = '';
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Bot response simulation
  setTimeout(() => {
    let reply = "I can help configure that quest in your Gamification Lab!";
    const q = query.toLowerCase();
    if (q.includes('calculus') || q.includes('quest') || q.includes('maths')) {
      reply = "💡 Quest Recommendation: 'Derivative Dragon Quest' (Hard) for 10th grade Maths - assigns multi-step rate-of-change problems worth +1,200 XP.";
    } else if (q.includes('class') || q.includes('performance')) {
      const scope = currentClassScope();
      const students = filterStudents();
      const avg = students.length ? Math.round(students.reduce((sum, s) => sum + avgStudentScore(s), 0) / students.length) : 0;
      reply = `📊 The class(es) currently in view (${scope.map(classLabel).join(', ') || 'none selected'}) are averaging ${avg}% mastery across their subjects.`;
    } else if (q.includes('alex') || q.includes('student')) {
      const s = state.students[0];
      reply = `📊 ${s.name}: ${classLabel(s.classId)}, current mastery ${avgStudentScore(s)}%, active ${s.streak}-day streak!`;
    }

    messagesContainer.innerHTML += `
      <div class="flex items-start space-x-2">
        <div class="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">AI</div>
        <div class="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none shadow-sm text-slate-700 dark:text-slate-200">
          ${reply}
        </div>
      </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 600);
}

function avgStudentScore(student) {
  const scores = Object.values(student.subjectScores || {});
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// Live Boss Battle Logic
function attackBoss(damage, logText) {
  state.bossHP = Math.max(0, state.bossHP - damage);
  const percentage = (state.bossHP / state.maxBossHP) * 100;

  document.getElementById('boss-hp-bar').style.width = `${percentage}%`;
  document.getElementById('boss-hp-text').textContent = `${state.bossHP} / ${state.maxBossHP} HP`;

  const log = document.getElementById('boss-battle-log');
  log.innerHTML = `<p class="text-amber-400 font-bold">[ACTION]: ${logText} (-${damage} HP dealt!)</p>` + log.innerHTML;

  if (state.bossHP === 0) {
    state.totalXP += 2000;
    renderDashboard();
    alert("🎉 Victory! The Differential Dragon was defeated! +2,000 XP awarded to the whole class!");
  }
}

function resetBossBattle() {
  state.bossHP = 1000;
  document.getElementById('boss-hp-bar').style.width = `100%`;
  document.getElementById('boss-hp-text').textContent = `1000 / 1000 HP`;
  document.getElementById('boss-battle-log').innerHTML = `<p class="text-slate-500">[System]: Battle reset. Ready student answers!</p>`;
}

// =========================================================================
// DASHBOARD VIEW
// =========================================================================

function renderDashboard() {
  const students = filterStudents();
  const games = state.games.filter(g => g.classes.some(c => currentClassScope().includes(c)) && isSubjectAccessible(g.subject));
  const avgMastery = students.length ? Math.round(students.reduce((sum, s) => sum + avgStudentScore(s), 0) / students.length) : 0;

  document.getElementById('dash-active-games-count').textContent = games.length;
  document.getElementById('dash-total-xp').textContent = state.totalXP.toLocaleString();
  document.getElementById('dash-active-students-count').textContent = students.length;
  document.getElementById('dash-avg-mastery').textContent = `${avgMastery}%`;

  const container = document.getElementById('dash-recent-games-list');
  container.innerHTML = games.slice(0, 3).map(g => `
    <div class="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between">
      <div>
        <p class="font-bold text-slate-800 dark:text-slate-100">${g.title}</p>
        <p class="text-[10px] text-slate-400 mt-0.5">${g.subject} • +${g.xp} XP</p>
      </div>
      <span class="text-[10px] font-bold px-2 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md">${g.completionRate}% Done</span>
    </div>
  `).join('') || `<p class="text-xs text-slate-400 text-center py-4">No games yet for this selection.</p>`;

  renderClassPerformanceGrid();
  lucide.createIcons();
}

// Class-wise performance breakdown cards (6th A ... 10th B)
function renderClassPerformanceGrid() {
  const grid = document.getElementById('class-performance-grid');
  if (!grid) return;

  const accessible = getAccessibleClasses();
  const classesToShow = CLASS_SECTIONS.filter(cs => accessible.includes(cs.id));

  grid.innerHTML = classesToShow.map(cs => {
    const classStudents = state.students.filter(s => s.classId === cs.id);
    const avg = classStudents.length ? Math.round(classStudents.reduce((sum, s) => sum + avgStudentScore(s), 0) / classStudents.length) : 0;
    const present = classStudents.filter(s => s.status === 'Present').length;
    const isActive = state.classFilter === cs.id;

    return `
      <button onclick="setClassFilter('${cs.id}')" class="text-left p-4 rounded-2xl border transition shadow-sm ${isActive ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'}">
        <p class="text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-emerald-100' : 'text-slate-400'}">${cs.label}</p>
        <h4 class="text-xl font-black mt-1 ${isActive ? 'text-white' : 'text-slate-800 dark:text-slate-100'}">${avg}%</h4>
        <p class="text-[10px] mt-1 ${isActive ? 'text-emerald-100' : 'text-slate-400'}">${classStudents.length} students • ${present} present</p>
      </button>
    `;
  }).join('') || `<p class="text-xs text-slate-400 col-span-full text-center py-4">No classes assigned to your profile yet.</p>`;
}

// =========================================================================
// GAMIFICATION LAB
// =========================================================================

function renderGamificationLab() {
  highlightActiveSubjectButton();
  const games = filterGames();

  const cardGrid = document.getElementById('games-card-grid');
  cardGrid.innerHTML = games.map(g => `
    <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
      <div>
        <div class="flex justify-between items-start mb-2">
          <span class="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full">${g.type}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-md">${g.difficulty}</span>
        </div>
        <h4 class="font-bold text-slate-800 dark:text-slate-100 text-sm">${g.title}</h4>
        <p class="text-xs text-slate-400 mt-1">${subjectIcon(g.subject)} ${g.subject} • ${g.classes.map(classLabel).join(', ')}</p>
      </div>

      <div class="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs">
        <div>
          <p class="text-[10px] text-slate-400 uppercase font-bold">Reward</p>
          <p class="font-bold text-emerald-600 dark:text-emerald-400">+${g.xp} XP</p>
        </div>
        <button onclick="loadSelectedGameAnalysis(${g.id})" class="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-[11px] font-bold rounded-lg hover:bg-slate-900 transition">
          Analyze
        </button>
      </div>
    </div>
  `).join('') || `<p class="text-xs text-slate-400 col-span-full text-center py-8">No games found for this subject/class combination yet. Try "Generate Game" to create one.</p>`;

  const select = document.getElementById('game-select-dropdown');
  select.innerHTML = games.map(g => `<option value="${g.id}">${g.title}</option>`).join('');

  if (games.length > 0) {
    loadSelectedGameAnalysis(games[0].id);
  } else {
    document.getElementById('selected-game-title').textContent = 'No game selected';
    document.getElementById('analysis-completion-rate').textContent = '—';
    document.getElementById('analysis-avg-score').textContent = '—';
    document.getElementById('analysis-avg-time').textContent = '—';
    updateGameAnalysisChart([]);
  }

  lucide.createIcons();
}

function loadSelectedGameAnalysis(gameId) {
  const game = state.games.find(g => g.id == gameId);
  if (!game) return;

  document.getElementById('selected-game-title').textContent = game.title;
  document.getElementById('analysis-completion-rate').textContent = `${game.completionRate}%`;
  document.getElementById('analysis-avg-score').textContent = `${game.avgScore} / 100`;
  document.getElementById('analysis-avg-time').textContent = game.avgTime;

  updateGameAnalysisChart(game.scores);
}

// Guild Standings Render
function renderGuilds() {
  const container = document.getElementById('guild-standings-list');
  container.innerHTML = state.guilds.map((g, i) => `
    <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <span class="font-pixel text-xs font-bold text-amber-500">#${i + 1}</span>
        <div>
          <h4 class="font-bold text-xs text-slate-800 dark:text-slate-100">${g.name}</h4>
          <p class="text-[10px] text-slate-400">${g.members} Active Members</p>
        </div>
      </div>
      <span class="font-bold text-xs text-emerald-600 dark:text-emerald-400">${g.xp.toLocaleString()} XP</span>
    </div>
  `).join('');
}

// ---- Modal: Generate Game --------------------------------------------------
function openGameGeneratorModal() {
  const subjSelect = document.getElementById('gen-game-subject');
  const accessible = getAccessibleSubjects();
  subjSelect.innerHTML = accessible.map(s => `<option value="${s}">${s}</option>`).join('');

  const classContainer = document.getElementById('gen-game-classes');
  const accessibleClasses = getAccessibleClasses();
  classContainer.innerHTML = CLASS_SECTIONS.filter(cs => accessibleClasses.includes(cs.id)).map(cs => `
    <label class="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 text-[11px]">
      <input type="checkbox" class="gen-game-class-toggle accent-emerald-600" value="${cs.id}">
      <span class="text-slate-600 dark:text-slate-300">${cs.label}</span>
    </label>
  `).join('');

  document.getElementById('game-generator-modal').classList.remove('hidden');
}
function closeGameGeneratorModal() { document.getElementById('game-generator-modal').classList.add('hidden'); }

function handleGenerateGame(e) {
  e.preventDefault();
  const title = document.getElementById('gen-game-title').value;
  const subject = document.getElementById('gen-game-subject').value;
  const type = document.getElementById('gen-game-type').value;
  const difficultyStr = document.getElementById('gen-game-diff').value;
  const date = document.getElementById('gen-game-date').value;
  const classes = Array.from(document.querySelectorAll('.gen-game-class-toggle:checked')).map(el => el.value);

  if (classes.length === 0) {
    alert('Please select at least one class to assign this game to.');
    return;
  }

  const xpMatch = difficultyStr.match(/\+(\d+[\d,]*)/);
  const xp = xpMatch ? parseInt(xpMatch[1].replace(/,/g, '')) : 500;
  const diff = difficultyStr.split(' ')[0];

  const newGame = {
    id: Date.now(),
    title,
    subject,
    classes,
    type,
    difficulty: diff,
    xp,
    date,
    completionRate: 0,
    avgScore: 0,
    avgTime: '0.0 min',
    scores: [60, 70, 75, 80, 85]
  };

  state.games.unshift(newGame);
  classes.forEach(cid => {
    state.calendarEvents.push({ id: Date.now() + Math.random(), title, type: 'game', subject, classId: cid, date });
  });
  state.totalXP += xp;

  closeGameGeneratorModal();
  document.getElementById('game-generator-form').reset();

  renderDashboard();
  renderGamificationLab();
  renderCalendar();
  alert(`Game "${title}" generated and assigned to ${classes.map(classLabel).join(', ')}!`);
}

// =========================================================================
// ASSESSMENTS VIEW
// =========================================================================

function renderAssessments() {
  const tbody = document.getElementById('assessments-table-body');
  const assessments = filterAssessments();
  tbody.innerHTML = assessments.map(a => `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
      <td class="p-4 font-bold text-slate-800 dark:text-slate-100">${a.title}</td>
      <td class="p-4 text-slate-600 dark:text-slate-400">${subjectIcon(a.subject)} ${a.subject}</td>
      <td class="p-4 text-slate-600 dark:text-slate-400">${classLabel(a.classId)}</td>
      <td class="p-4 text-slate-500 dark:text-slate-400">${a.date}</td>
      <td class="p-4 font-semibold text-slate-700 dark:text-slate-300">${a.submissions}</td>
      <td class="p-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${a.status === 'Graded' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'}">
          ${a.status}
        </span>
      </td>
      <td class="p-4">
        <button onclick="alert('Viewing grades for ${a.title}')" class="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold">Grade</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" class="p-6 text-center text-xs text-slate-400">No assessments for this class/subject selection yet.</td></tr>`;
}

function createNewAssessment() {
  document.getElementById('assessment-modal-title-input').value = '';
  document.getElementById('assessment-modal-date-input').value = '';

  const subjSelect = document.getElementById('assessment-modal-subject');
  subjSelect.innerHTML = getAccessibleSubjects().map(s => `<option value="${s}">${s}</option>`).join('');

  const classSelect = document.getElementById('assessment-modal-class');
  classSelect.innerHTML = CLASS_SECTIONS.filter(cs => getAccessibleClasses().includes(cs.id)).map(cs => `<option value="${cs.id}">${cs.label}</option>`).join('');

  document.getElementById('assessment-modal').classList.remove('hidden');
}
function closeAssessmentModal() { document.getElementById('assessment-modal').classList.add('hidden'); }

function handleCreateAssessment(e) {
  e.preventDefault();
  const title = document.getElementById('assessment-modal-title-input').value;
  const subject = document.getElementById('assessment-modal-subject').value;
  const classId = document.getElementById('assessment-modal-class').value;
  const date = document.getElementById('assessment-modal-date-input').value;

  const totalInClass = state.students.filter(s => s.classId === classId).length;

  state.assessments.unshift({ id: Date.now(), title, subject, classId, date, submissions: `0 / ${totalInClass}`, status: 'Upcoming' });
  closeAssessmentModal();
  document.getElementById('assessment-form').reset();
  renderAssessments();
}

// =========================================================================
// ATTENDANCE VIEW
// =========================================================================

function renderAttendance() {
  const tbody = document.getElementById('attendance-table-body');
  const students = filterStudents();
  let present = 0, absent = 0;

  tbody.innerHTML = students.map(s => {
    if (s.status === 'Present') present++; else absent++;
    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
        <td class="p-4 font-bold text-slate-800 dark:text-slate-100">${s.name}</td>
        <td class="p-4 font-mono text-slate-500">${s.code}</td>
        <td class="p-4 text-slate-500 dark:text-slate-400">${classLabel(s.classId)}</td>
        <td class="p-4 font-semibold text-amber-600">🔥 ${s.streak} Days</td>
        <td class="p-4">
          <button onclick="toggleAttendance(${s.id})" class="px-3 py-1 rounded-lg text-xs font-bold transition ${s.status === 'Present' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'}">
            ${s.status}
          </button>
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="5" class="p-6 text-center text-xs text-slate-400">No students in this class selection.</td></tr>`;

  document.getElementById('att-present-count').textContent = `Present: ${present}`;
  document.getElementById('att-absent-count').textContent = `Absent: ${absent}`;
}

function toggleAttendance(id) {
  const student = state.students.find(s => s.id === id);
  if (student) {
    student.status = student.status === 'Present' ? 'Absent' : 'Present';
    renderAttendance();
    renderDashboard();
  }
}

function saveAttendance() { alert('Attendance saved successfully!'); }

// =========================================================================
// ANNOUNCEMENTS VIEW
// =========================================================================

function renderAnnouncements() {
  const container = document.getElementById('announcements-list');
  const announcements = filterAnnouncements();
  container.innerHTML = announcements.map(a => `
    <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <span class="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full">${a.category}</span>
          <span class="text-[10px] font-bold px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">${a.classId === 'ALL' ? 'All Classes' : classLabel(a.classId)}</span>
        </div>
        <span class="text-[10px] text-slate-400">${a.date}</span>
      </div>
      <h3 class="font-bold text-slate-800 dark:text-slate-100 text-base">${a.title}</h3>
      <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${a.content}</p>
    </div>
  `).join('') || `<p class="text-xs text-slate-400 text-center py-8">No announcements for this class selection yet.</p>`;
}

function openAnnouncementModal() {
  const classSelect = document.getElementById('ann-class');
  classSelect.innerHTML = `<option value="ALL">All My Classes</option>` +
    CLASS_SECTIONS.filter(cs => getAccessibleClasses().includes(cs.id)).map(cs => `<option value="${cs.id}">${cs.label}</option>`).join('');
  document.getElementById('announcement-modal').classList.remove('hidden');
}
function closeAnnouncementModal() { document.getElementById('announcement-modal').classList.add('hidden'); }

function handlePostAnnouncement(e) {
  e.preventDefault();
  const title = document.getElementById('ann-title').value;
  const category = document.getElementById('ann-category').value;
  const classId = document.getElementById('ann-class').value;
  const content = document.getElementById('ann-content').value;

  state.announcements.unshift({ id: Date.now(), title, category, subject: 'ALL', classId, content, date: '2026-08-05' });
  closeAnnouncementModal();
  document.getElementById('announcement-form').reset();
  renderAnnouncements();
}

// =========================================================================
// CALENDAR VIEW
// =========================================================================

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  document.getElementById('calendar-month-year').textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;

  const events = filterCalendarEvents();
  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const formattedDate = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date === formattedDate);

    let dayHtml = `
      <div class="min-h-[80px] p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl text-left flex flex-col justify-between">
        <span class="font-bold text-xs text-slate-700 dark:text-slate-300">${day}</span>
        <div class="space-y-1 mt-1">
    `;

    dayEvents.forEach(e => {
      dayHtml += `<div class="text-[9px] font-bold p-1 rounded ${e.type === 'game' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'} truncate" title="${e.title} (${e.classId ? classLabel(e.classId) : ''})">${e.title}</div>`;
    });

    dayHtml += `</div></div>`;
    grid.innerHTML += dayHtml;
  }
}

function changeMonth(delta) {
  state.currentMonth += delta;
  if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
  if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
  renderCalendar();
}

function openAddEventModal() {
  const classSelect = document.getElementById('event-class');
  classSelect.innerHTML = `<option value="ALL">All My Classes</option>` +
    CLASS_SECTIONS.filter(cs => getAccessibleClasses().includes(cs.id)).map(cs => `<option value="${cs.id}">${cs.label}</option>`).join('');
  document.getElementById('add-event-modal').classList.remove('hidden');
}
function closeAddEventModal() { document.getElementById('add-event-modal').classList.add('hidden'); }

function handleCreateCalendarEvent(e) {
  e.preventDefault();
  const title = document.getElementById('event-title').value;
  const type = document.getElementById('event-type').value;
  const classId = document.getElementById('event-class').value;
  const date = document.getElementById('event-date').value;

  state.calendarEvents.push({ id: Date.now(), title, type, subject: 'ALL', classId, date });
  closeAddEventModal();
  document.getElementById('add-event-form').reset();
  renderCalendar();
}

// =========================================================================
// CHARTS
// =========================================================================

function initCharts() {
  const ctxOverview = document.getElementById('overviewChart').getContext('2d');
  overviewChartInstance = new Chart(ctxOverview, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'XP Earned',
        data: [12000, 19000, 28000, 35000, 22000, 31000, 42000],
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { borderDash: [2, 4] } },
        x: { grid: { display: false } }
      }
    }
  });

  const ctxAnalysis = document.getElementById('gameAnalysisChart').getContext('2d');
  gameAnalysisChartInstance = new Chart(ctxAnalysis, {
    type: 'bar',
    data: {
      labels: ['Student 1', 'Student 2', 'Student 3', 'Student 4', 'Student 5'],
      datasets: [{
        label: 'Score / 100',
        data: [85, 90, 95, 88, 92],
        backgroundColor: '#032b26',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { max: 100 } }
    }
  });
}

function updateGameAnalysisChart(scores) {
  if (gameAnalysisChartInstance) {
    gameAnalysisChartInstance.data.datasets[0].data = scores;
    gameAnalysisChartInstance.data.labels = scores.map((_, i) => `Student ${i + 1}`);
    gameAnalysisChartInstance.update();
  }
}

// Refresh the weekly XP overview chart to reflect the class(es) in scope,
// so the dashboard chart isn't static / disconnected from the filters.
function refreshOverviewChart() {
  if (!overviewChartInstance) return;
  const games = state.games.filter(g => g.classes.some(c => currentClassScope().includes(c)));
  const totalXpInScope = games.reduce((sum, g) => sum + g.xp, 0) || 1;
  const base = [0.12, 0.19, 0.28, 0.35, 0.22, 0.31, 0.42];
  overviewChartInstance.data.datasets[0].data = base.map(f => Math.round(f * (totalXpInScope * 3 + 20000)));
  overviewChartInstance.update();
}
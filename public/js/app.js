/**
 * StudyTrack Main Application Controller & Router
 */

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const App = {
  currentUser: null,
  currentRoute: 'dashboard',
  theme: localStorage.getItem('studytrack_theme') || 'light',

  async init() {
    this.applyTheme(this.theme);

    // Global auth expiration listener
    window.addEventListener('auth:expired', () => {
      this.currentUser = null;
      this.renderAuth();
      this.toast('Session expired. Please log in again.', 'info');
    });

    const token = API.getToken();
    if (!token) {
      this.renderAuth();
      return;
    }

    try {
      const res = await API.auth.me();
      this.currentUser = res.user;
      this.initAppShell();
    } catch (err) {
      API.setToken(null);
      this.renderAuth();
    }
  },

  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('studytrack_theme', theme);
  },

  toggleTheme() {
    const newTheme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
  },

  renderAuth() {
    AuthView.render(document.getElementById('app-root'));
  },

  initAppShell() {
    const root = document.getElementById('app-root');
    const user = this.currentUser || { username: 'Student', email: '', full_name: 'Student' };
    const initials = (user.full_name || user.username).slice(0, 2).toUpperCase();

    root.innerHTML = `
      <div id="app-layout">
        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <a href="#" class="brand" onclick="App.navigate('dashboard'); return false;">
              <div class="brand-icon">ST</div>
              <div>
                <span>StudyTrack</span>
                <span class="brand-subtitle">Academic Mastery</span>
              </div>
            </a>
            <button class="sidebar-action-btn mobile-menu-btn" onclick="App.toggleSidebar()">✕</button>
          </div>

          <div class="sidebar-nav">
            <div class="nav-category">Overview</div>
            <a class="nav-item ${this.currentRoute === 'dashboard' ? 'active' : ''}" data-route="dashboard" onclick="App.navigate('dashboard')">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <span>Dashboard</span>
            </a>
            <a class="nav-item ${this.currentRoute === 'analytics' ? 'active' : ''}" data-route="analytics" onclick="App.navigate('analytics')">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              <span>Analytics</span>
            </a>

            <div class="nav-category">Curriculum</div>
            <a class="nav-item ${this.currentRoute === 'subjects' ? 'active' : ''}" data-route="subjects" onclick="App.navigate('subjects')">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              <span>My Subjects</span>
            </a>
            <a class="nav-item ${this.currentRoute === 'syllabus' ? 'active' : ''}" data-route="syllabus" onclick="App.navigate('syllabus')">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
              <span>Syllabus Explorer</span>
            </a>

            <div class="nav-category">Tracking & History</div>
            <a class="nav-item" onclick="App.openLogStudyModal()">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              <span>+ Log Daily Study</span>
            </a>
            <a class="nav-item ${this.currentRoute === 'study-history' ? 'active' : ''}" data-route="study-history" onclick="App.navigate('study-history')">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>Study History</span>
            </a>
            <a class="nav-item ${this.currentRoute === 'weekly-review' ? 'active' : ''}" data-route="weekly-review" onclick="App.navigate('weekly-review')">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>Weekly Review</span>
            </a>

            <div class="nav-category">Assessment & Mastery</div>
            <a class="nav-item ${this.currentRoute === 'paper-generator' ? 'active' : ''}" data-route="paper-generator" onclick="App.navigate('paper-generator')">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>Generate Paper</span>
              <span class="nav-badge highlight">CORE</span>
            </a>
            <a class="nav-item ${this.currentRoute === 'test-history' ? 'active' : ''}" data-route="test-history" onclick="App.navigate('test-history')">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
              <span>Test History</span>
            </a>
            <a class="nav-item ${this.currentRoute === 'revision' ? 'active' : ''}" data-route="revision" onclick="App.navigate('revision')">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Revision List</span>
              <span class="nav-badge count" id="sidebar-revision-badge" style="display:none;">0</span>
            </a>

            <div class="nav-category">Account</div>
            <a class="nav-item ${this.currentRoute === 'profile' ? 'active' : ''}" data-route="profile" onclick="App.navigate('profile')">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              <span>Profile & Security</span>
            </a>
          </div>

          <div class="sidebar-footer">
            <div class="user-profile-summary">
              <div class="user-avatar" id="sidebar-avatar">${initials}</div>
              <div class="user-meta">
                <span class="user-name" id="sidebar-name">${escapeHtml(user.full_name || user.username)}</span>
                <span class="user-email" id="sidebar-email">${escapeHtml(user.email)}</span>
              </div>
            </div>
            <div style="display:flex; gap:4px;">
              <button class="sidebar-action-btn" id="theme-toggle-btn" title="Toggle Theme" onclick="App.toggleTheme()">
                ${this.theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button class="sidebar-action-btn" title="Sign Out" onclick="App.handleLogout()">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              </button>
            </div>
          </div>
        </aside>

        <!-- Main Wrapper -->
        <main class="main-wrapper">
          <header class="top-bar no-print">
            <div class="top-bar-left">
              <button class="mobile-menu-btn" onclick="App.toggleSidebar()">
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <span class="current-page-title" id="page-title">Dashboard</span>
            </div>

            <div class="top-bar-right">
              <button class="btn btn-secondary btn-sm" onclick="App.openLogStudyModal()">
                + Log Study
              </button>
              <button class="btn btn-primary btn-sm" onclick="App.navigate('paper-generator')">
                ✨ Generate Paper
              </button>
            </div>
          </header>

          <div class="content-container" id="main-content">
            <!-- Dynamic view injected here -->
          </div>
        </main>
      </div>

      <!-- Global Modal Container -->
      <div class="modal-overlay" id="global-modal" onclick="App.onModalOverlayClick(event)">
        <div class="modal-content" id="modal-content"></div>
      </div>

      <!-- Toast Container -->
      <div class="toast-container" id="toast-container"></div>
    `;

    this.navigate(this.currentRoute);
    this.updateRevisionBadge();
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('mobile-open');
    }
  },

  navigate(route, param = null) {
    this.currentRoute = route;

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');

    // Update active class on nav
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-route') === route) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    const pageTitleEl = document.getElementById('page-title');
    const titles = {
      dashboard: 'Student Dashboard',
      subjects: 'My Academic Subjects',
      syllabus: 'Syllabus Explorer',
      'study-history': 'Daily Study Tracking & History',
      'weekly-review': 'Weekly Study Review',
      'paper-generator': 'Personalized Paper Generator',
      'test-history': 'Test & Assessment History',
      revision: 'Weak Topics & Revision Queue',
      analytics: 'Progress Analytics',
      profile: 'Account & Security'
    };
    if (pageTitleEl) pageTitleEl.textContent = titles[route] || 'StudyTrack';

    this.renderRoute(route, param);
  },

  renderRoute(route, param = null) {
    const container = document.getElementById('main-content');
    if (!container) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    switch (route) {
      case 'dashboard':
        DashboardView.render(container);
        break;
      case 'subjects':
        SubjectsView.render(container);
        break;
      case 'syllabus':
        SyllabusView.render(container, param);
        break;
      case 'study-history':
        StudyLogView.render(container);
        break;
      case 'weekly-review':
        WeeklyReviewView.render(container);
        break;
      case 'paper-generator':
        PaperGeneratorView.render(container, param);
        break;
      case 'test-history':
        TestHistoryView.render(container);
        break;
      case 'revision':
        RevisionView.render(container);
        break;
      case 'analytics':
        AnalyticsView.render(container);
        break;
      case 'profile':
        ProfileView.render(container);
        break;
      default:
        DashboardView.render(container);
    }
  },

  openLogStudyModal(prefill = {}) {
    StudyLogView.openLogModal(prefill);
  },

  openPaperGenerator(subjectId) {
    this.navigate('paper-generator', subjectId);
  },

  openSyllabusSubject(subjectId) {
    this.navigate('syllabus', subjectId);
  },

  async seedSampleSyllabus() {
    if (!confirm('This will load a complete syllabus for VLSI Design, Mobile Communication, AI/ML, and IoT with units and study history. Continue?')) {
      return;
    }

    try {
      this.toast('Loading sample academic syllabus...', 'info');
      await API.subjects.seedSample();
      this.toast('Sample syllabus loaded successfully!', 'success');
      this.navigate('dashboard');
    } catch (err) {
      this.toast(err.message, 'error');
    }
  },

  async updateRevisionBadge() {
    try {
      const items = await API.revision.getAll('active');
      const badge = document.getElementById('sidebar-revision-badge');
      if (badge) {
        if (items && items.length > 0) {
          badge.textContent = items.length;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (e) {}
  },

  updateUserDisplay() {
    if (!this.currentUser) return;
    const nameEl = document.getElementById('sidebar-name');
    const emailEl = document.getElementById('sidebar-email');
    const avatarEl = document.getElementById('sidebar-avatar');

    if (nameEl) nameEl.textContent = this.currentUser.full_name || this.currentUser.username;
    if (emailEl) emailEl.textContent = this.currentUser.email;
    if (avatarEl) avatarEl.textContent = (this.currentUser.full_name || this.currentUser.username).slice(0, 2).toUpperCase();
  },

  openModal(htmlContent) {
    const modal = document.getElementById('global-modal');
    const content = document.getElementById('modal-content');
    if (modal && content) {
      content.innerHTML = htmlContent;
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal() {
    const modal = document.getElementById('global-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = 'auto';
    }
  },

  onModalOverlayClick(e) {
    if (e.target.id === 'global-modal') {
      this.closeModal();
    }
  },

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✔' : (type === 'error' ? '✖' : 'ℹ');
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  },

  async handleLogout() {
    try {
      await API.auth.logout();
    } catch (e) {}
    API.setToken(null);
    this.currentUser = null;
    this.toast('You have been logged out.', 'info');
    this.renderAuth();
  }
};

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

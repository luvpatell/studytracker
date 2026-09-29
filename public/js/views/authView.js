/**
 * Authentication Views (Sign Up, Login, Forgot Password)
 */

const AuthView = {
  currentTab: 'login', // 'login', 'register', 'forgot'

  render(container) {
    let formHtml = '';

    if (this.currentTab === 'login') {
      formHtml = `
        <form onsubmit="AuthView.handleLogin(event)">
          <div class="form-group">
            <label class="form-label">Username or Email *</label>
            <input type="text" id="auth-identifier" class="form-input" placeholder="e.g. alice@example.com or alice" required autofocus>
          </div>
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label class="form-label">Password *</label>
              <a href="#" onclick="AuthView.switchTab('forgot'); return false;" style="font-size:0.75rem; color:var(--primary); text-decoration:none;">Forgot password?</a>
            </div>
            <input type="password" id="auth-password" class="form-input" placeholder="Enter your password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top:16px;">
            Log In to StudyTrack
          </button>
        </form>
      `;
    } else if (this.currentTab === 'register') {
      formHtml = `
        <form onsubmit="AuthView.handleRegister(event)">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" id="reg-fullname" class="form-input" placeholder="e.g. Alice Johnson" required autofocus>
          </div>
          <div class="form-group">
            <label class="form-label">Username * (letters/numbers, min 3 chars)</label>
            <input type="text" id="reg-username" class="form-input" placeholder="e.g. alice" minlength="3" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" id="reg-email" class="form-input" placeholder="e.g. alice@example.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password * (min 6 characters)</label>
            <input type="password" id="reg-password" class="form-input" placeholder="Create a strong password" minlength="6" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top:16px;">
            Create Student Account
          </button>
        </form>
      `;
    } else if (this.currentTab === 'forgot') {
      formHtml = `
        <form onsubmit="AuthView.handleForgotPassword(event)">
          <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">
            Enter your account email to receive your password reset code:
          </div>
          <div class="form-group">
            <label class="form-label">Account Email *</label>
            <input type="email" id="forgot-email" class="form-input" placeholder="e.g. alice@example.com" required autofocus>
          </div>
          <button type="submit" class="btn btn-primary btn-block">
            Generate Reset Code
          </button>

          <div id="reset-code-box" style="display:none; margin-top:20px; padding:16px; background:var(--bg-main); border-radius:var(--radius-md); border:1px solid var(--border-color);">
            <div style="font-weight:700; font-size:0.9rem; margin-bottom:6px; color:var(--primary);">Reset Code Generated:</div>
            <div id="displayed-reset-code" style="font-size:1.4rem; font-weight:800; letter-spacing:0.15em; color:var(--primary); margin-bottom:12px;"></div>

            <div class="form-group">
              <label class="form-label">Enter Reset Code *</label>
              <input type="text" id="reset-code-input" class="form-input" placeholder="6-digit code">
            </div>
            <div class="form-group">
              <label class="form-label">New Password * (min 6 chars)</label>
              <input type="password" id="reset-new-pwd" class="form-input" minlength="6">
            </div>
            <button type="button" class="btn btn-success btn-block" onclick="AuthView.handleResetPasswordSubmit()">
              Set New Password
            </button>
          </div>

          <div style="text-align:center; margin-top:16px;">
            <a href="#" onclick="AuthView.switchTab('login'); return false;" style="font-size:0.85rem; color:var(--text-muted); text-decoration:none;">← Back to Login</a>
          </div>
        </form>
      `;
    }

    container.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-brand">
              <div class="brand-icon">ST</div>
              <span>StudyTrack</span>
            </div>
            <p class="auth-subtitle">Continuous Learning, Assessment & Revision</p>
          </div>

          ${this.currentTab !== 'forgot' ? `
            <div class="auth-tabs">
              <button class="auth-tab ${this.currentTab === 'login' ? 'active' : ''}" onclick="AuthView.switchTab('login')">
                Log In
              </button>
              <button class="auth-tab ${this.currentTab === 'register' ? 'active' : ''}" onclick="AuthView.switchTab('register')">
                Sign Up
              </button>
            </div>
          ` : ''}

          ${formHtml}
        </div>
      </div>
    `;
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render(document.getElementById('app-root'));
  },

  async handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('auth-identifier').value.trim();
    const password = document.getElementById('auth-password').value;

    try {
      const res = await API.auth.login({ identifier, password });
      API.setToken(res.token);
      App.currentUser = res.user;
      App.toast(`Welcome back, ${res.user.full_name || res.user.username}!`, 'success');
      App.initAppShell();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const full_name = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    try {
      const res = await API.auth.register({ full_name, username, email, password });
      API.setToken(res.token);
      App.currentUser = res.user;
      App.toast('Account registered successfully! Welcome to StudyTrack.', 'success');
      App.initAppShell();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();

    try {
      const res = await API.auth.forgotPassword(email);
      if (res.reset_code) {
        document.getElementById('reset-code-box').style.display = 'block';
        document.getElementById('displayed-reset-code').textContent = res.reset_code;
        document.getElementById('reset-code-input').value = res.reset_code;
        App.toast('Reset code generated! Enter your new password below.', 'success');
      } else {
        App.toast(res.message, 'info');
      }
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async handleResetPasswordSubmit() {
    const email = document.getElementById('forgot-email').value.trim();
    const reset_code = document.getElementById('reset-code-input').value.trim();
    const new_password = document.getElementById('reset-new-pwd').value;

    if (!reset_code || !new_password) {
      App.toast('Please enter code and new password.', 'error');
      return;
    }

    try {
      const res = await API.auth.resetPassword({ email, reset_code, new_password });
      App.toast(res.message, 'success');
      this.switchTab('login');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};

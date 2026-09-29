/**
 * User Profile & Account Settings View
 */

const ProfileView = {
  render(container) {
    const user = App.currentUser || { username: '', email: '', full_name: '' };

    container.innerHTML = `
      <div style="max-width:680px; margin:0 auto;">
        <div style="margin-bottom:24px;">
          <h1 style="font-size:1.6rem; font-weight:800; letter-spacing:-0.02em;">Account & Security</h1>
          <p style="color:var(--text-muted); font-size:0.9rem;">
            Manage your personal profile, security credentials, and theme settings.
          </p>
        </div>

        <!-- Profile Details Card -->
        <div class="card" style="margin-bottom:24px;">
          <div class="card-header">
            <h3 class="card-title">Personal Profile</h3>
          </div>
          <form onsubmit="ProfileView.handleUpdateProfile(event)">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" class="form-input" value="${escapeHtml(user.username)}" disabled style="background:var(--bg-main); opacity:0.8;">
              <div class="form-hint">Username cannot be changed.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-input" value="${escapeHtml(user.email)}" disabled style="background:var(--bg-main); opacity:0.8;">
              <div class="form-hint">Linked email address for your student account.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" id="profile-name" class="form-input" value="${escapeHtml(user.full_name || '')}" required>
            </div>

            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
              <button type="submit" class="btn btn-primary">Save Profile</button>
            </div>
          </form>
        </div>

        <!-- Change Password Card -->
        <div class="card" style="margin-bottom:24px;">
          <div class="card-header">
            <h3 class="card-title">Change Password</h3>
          </div>
          <form onsubmit="ProfileView.handleChangePassword(event)">
            <div class="form-group">
              <label class="form-label">Current Password *</label>
              <input type="password" id="current-pwd" class="form-input" required>
            </div>

            <div class="form-group">
              <label class="form-label">New Password * (Min 6 characters)</label>
              <input type="password" id="new-pwd" class="form-input" minlength="6" required>
            </div>

            <div class="form-group">
              <label class="form-label">Confirm New Password *</label>
              <input type="password" id="confirm-pwd" class="form-input" minlength="6" required>
            </div>

            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
              <button type="submit" class="btn btn-secondary">Update Password</button>
            </div>
          </form>
        </div>

        <!-- Data Isolation Notice -->
        <div class="card" style="background:var(--primary-light); border:1px solid #c7d2fe;">
          <h4 style="color:var(--primary-text); font-size:0.95rem; margin-bottom:6px;">🔒 Strict Data Privacy & Isolation</h4>
          <p style="font-size:0.82rem; color:var(--primary-text); line-height:1.5;">
            Your academic records, custom syllabus, daily study notes, and generated question papers are securely bound to your unique account ID (${user.id}). No other user can access your data.
          </p>
        </div>
      </div>
    `;
  },

  async handleUpdateProfile(e) {
    e.preventDefault();
    const full_name = document.getElementById('profile-name').value.trim();
    try {
      const res = await API.auth.updateProfile({ full_name });
      App.currentUser = res.user;
      App.updateUserDisplay();
      App.toast('Profile updated successfully!', 'success');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async handleChangePassword(e) {
    e.preventDefault();
    const current_password = document.getElementById('current-pwd').value;
    const new_password = document.getElementById('new-pwd').value;
    const confirm_password = document.getElementById('confirm-pwd').value;

    if (new_password !== confirm_password) {
      App.toast('New passwords do not match.', 'error');
      return;
    }

    try {
      await API.auth.changePassword({ current_password, new_password });
      App.toast('Password updated successfully!', 'success');
      document.getElementById('current-pwd').value = '';
      document.getElementById('new-pwd').value = '';
      document.getElementById('confirm-pwd').value = '';
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};

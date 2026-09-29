/**
 * Daily Study Tracking & Study History View
 */

const StudyLogView = {
  currentFilters: {
    subject_id: '',
    status: 'all',
    startDate: '',
    endDate: '',
    search: ''
  },

  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="color:var(--text-muted);">Loading study history...</div>
      </div>
    `;

    try {
      const [subjects, logs] = await Promise.all([
        API.subjects.getAll(),
        API.studyLogs.getAll(this.currentFilters)
      ]);

      const totalMinutes = logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const formattedTotalTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      const completedCount = logs.filter(l => l.status.toLowerCase() === 'completed').length;

      const subjectOptions = subjects.map(s => `
        <option value="${s.id}" ${String(this.currentFilters.subject_id) === String(s.id) ? 'selected' : ''}>
          ${escapeHtml(s.name)}
        </option>
      `).join('');

      let tableRows = '';
      if (!logs || logs.length === 0) {
        tableRows = `
          <tr>
            <td colspan="6" style="text-align:center; padding: 36px; color:var(--text-muted);">
              No study logs found matching your filter criteria. Click "Log Study Session" to record your progress!
            </td>
          </tr>
        `;
      } else {
        tableRows = logs.map(l => `
          <tr>
            <td style="white-space:nowrap; font-weight:600;">${l.study_date}</td>
            <td>
              <div style="font-weight:600; display:flex; align-items:center; gap:8px;">
                <span style="width:8px; height:8px; border-radius:50%; background:${l.subject_color || 'var(--primary)'}; display:inline-block;"></span>
                ${escapeHtml(l.subject_name)}
                ${l.subject_code ? `<span class="subject-code">${escapeHtml(l.subject_code)}</span>` : ''}
              </div>
              ${l.unit_title ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${escapeHtml(l.unit_title)}</div>` : ''}
            </td>
            <td style="font-weight:500;">
              ${escapeHtml(l.topic_title)}
            </td>
            <td style="white-space:nowrap;">
              ${l.duration_minutes > 0 ? `⏱️ ${l.duration_minutes} mins` : '—'}
            </td>
            <td>
              <span class="badge badge-${l.status.toLowerCase().replace(/\s+/g, '_')}">
                ${escapeHtml(l.status)}
              </span>
            </td>
            <td style="max-width:280px; font-size:0.85rem; color:var(--text-muted);">
              ${l.note ? escapeHtml(l.note) : '—'}
            </td>
            <td style="text-align:right;">
              <button class="sidebar-action-btn" title="Delete log entry" style="color:var(--text-muted);" onclick="StudyLogView.deleteLog(${l.id})">🗑️</button>
            </td>
          </tr>
        `).join('');
      }

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:16px;">
          <div>
            <h1 style="font-size:1.6rem; font-weight:800; letter-spacing:-0.02em;">Daily Study Tracking & History</h1>
            <p style="color:var(--text-muted); font-size:0.9rem;">
              Log daily study sessions and track your continuous study habit.
            </p>
          </div>
          <div>
            <button class="btn btn-primary" onclick="StudyLogView.openLogModal()">+ Log Study Session</button>
          </div>
        </div>

        <!-- Filter & Stats Bar -->
        <div class="card" style="margin-bottom:20px; padding:16px;">
          <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; flex:1;">
              <div style="min-width:180px;">
                <select class="form-select" onchange="StudyLogView.setFilter('subject_id', this.value)">
                  <option value="">All Subjects</option>
                  ${subjectOptions}
                </select>
              </div>

              <div style="min-width:140px;">
                <select class="form-select" onchange="StudyLogView.setFilter('status', this.value)">
                  <option value="all" ${this.currentFilters.status === 'all' ? 'selected' : ''}>All Statuses</option>
                  <option value="completed" ${this.currentFilters.status === 'completed' ? 'selected' : ''}>Completed</option>
                  <option value="in_progress" ${this.currentFilters.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                  <option value="revision" ${this.currentFilters.status === 'revision' ? 'selected' : ''}>Revision</option>
                </select>
              </div>

              <div style="display:flex; gap:6px; align-items:center;">
                <input type="date" class="form-input" style="padding:8px;" value="${this.currentFilters.startDate}" title="Start Date" onchange="StudyLogView.setFilter('startDate', this.value)">
                <span style="color:var(--text-muted); font-size:0.8rem;">to</span>
                <input type="date" class="form-input" style="padding:8px;" value="${this.currentFilters.endDate}" title="End Date" onchange="StudyLogView.setFilter('endDate', this.value)">
              </div>

              <div style="flex:1; min-width:160px;">
                <input type="text" class="form-input" placeholder="Search topic or note..." value="${escapeHtml(this.currentFilters.search)}" oninput="StudyLogView.debounceSearch(this.value)">
              </div>
            </div>

            <button class="btn btn-secondary btn-sm" onclick="StudyLogView.resetFilters()">Reset Filters</button>
          </div>

          <!-- Summary Badges -->
          <div style="display:flex; gap:16px; font-size:0.85rem; border-top:1px solid var(--border-color); padding-top:10px; flex-wrap:wrap;">
            <span>Logs Count: <strong>${logs.length} sessions</strong></span>
            <span>Total Filtered Time: <strong>${formattedTotalTime}</strong></span>
            <span>Topics Completed in View: <strong>${completedCount}</strong></span>
          </div>
        </div>

        <!-- History Table -->
        <div class="card" style="padding:0; overflow:hidden;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject & Module</th>
                  <th>Topic</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--danger); padding:24px;">Failed to load study history: ${escapeHtml(err.message)}</div>`;
    }
  },

  setFilter(key, val) {
    this.currentFilters[key] = val;
    this.render(document.getElementById('main-content'));
  },

  resetFilters() {
    this.currentFilters = {
      subject_id: '',
      status: 'all',
      startDate: '',
      endDate: '',
      search: ''
    };
    this.render(document.getElementById('main-content'));
  },

  searchTimer: null,
  debounceSearch(val) {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentFilters.search = val;
      this.render(document.getElementById('main-content'));
    }, 300);
  },

  async openLogModal(prefill = {}) {
    try {
      const subjects = await API.subjects.getAll();
      if (!subjects || subjects.length === 0) {
        App.toast('Please create at least one subject before logging study sessions.', 'info');
        App.navigate('subjects');
        return;
      }

      const defaultSubjectId = prefill.subject_id || subjects[0].id;
      const today = new Date().toISOString().slice(0, 10);

      App.openModal(`
        <div class="modal-header">
          <h3 class="card-title">Log Daily Study Session</h3>
          <button class="sidebar-action-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form id="log-study-form" onsubmit="StudyLogView.handleLogSubmit(event)">
          <div class="modal-body">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div class="form-group">
                <label class="form-label">Date *</label>
                <input type="date" id="log-date" class="form-input" value="${today}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Subject *</label>
                <select id="log-subject-select" class="form-select" onchange="StudyLogView.onSubjectChanged(this.value)" required>
                  ${subjects.map(s => `<option value="${s.id}" ${s.id === Number(defaultSubjectId) ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Topic *</label>
              <select id="log-topic-select" class="form-select" required>
                <option value="">Loading topics...</option>
              </select>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div class="form-group">
                <label class="form-label">Duration (Minutes)</label>
                <input type="number" id="log-duration" class="form-input" min="0" placeholder="e.g. 60, 90" value="60">
              </div>
              <div class="form-group">
                <label class="form-label">Status *</label>
                <select id="log-status" class="form-select" required>
                  <option value="Completed" selected>Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Revision">Revision Required</option>
                  <option value="Not Started">Not Started</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Study Notes & Key Takeaways</label>
              <textarea id="log-note" class="form-textarea" placeholder="What key concepts did you master or struggle with?"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Study Entry</button>
          </div>
        </form>
      `);

      // Load topics for default subject
      await this.loadTopicsForSubject(defaultSubjectId, prefill.topic_id);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async onSubjectChanged(subjectId) {
    await this.loadTopicsForSubject(subjectId);
  },

  async loadTopicsForSubject(subjectId, selectedTopicId = null) {
    const topicSelect = document.getElementById('log-topic-select');
    if (!topicSelect) return;

    try {
      const subject = await API.subjects.getOne(subjectId);
      let optionsHtml = '';

      if (!subject.units || subject.units.length === 0) {
        optionsHtml = '<option value="">No units/topics in this subject. Add topics first!</option>';
      } else {
        subject.units.forEach(u => {
          if (u.topics && u.topics.length > 0) {
            optionsHtml += `<optgroup label="${escapeHtml(u.title)}">`;
            u.topics.forEach(t => {
              const selected = selectedTopicId && Number(selectedTopicId) === t.id ? 'selected' : '';
              optionsHtml += `<option value="${t.id}" ${selected}>${escapeHtml(t.title)} (${t.status})</option>`;
            });
            optionsHtml += `</optgroup>`;
          }
        });
      }

      topicSelect.innerHTML = optionsHtml || '<option value="">No topics found in this subject</option>';
    } catch (err) {
      topicSelect.innerHTML = `<option value="">Error loading topics</option>`;
    }
  },

  async handleLogSubmit(e) {
    e.preventDefault();
    const study_date = document.getElementById('log-date').value;
    const subject_id = document.getElementById('log-subject-select').value;
    const topic_id = document.getElementById('log-topic-select').value;
    const duration_minutes = document.getElementById('log-duration').value;
    const status = document.getElementById('log-status').value;
    const note = document.getElementById('log-note').value;

    if (!topic_id) {
      App.toast('Please select a topic.', 'error');
      return;
    }

    try {
      await API.studyLogs.create({
        study_date,
        subject_id: Number(subject_id),
        topic_id: Number(topic_id),
        duration_minutes: Number(duration_minutes) || 0,
        status,
        note
      });

      App.closeModal();
      App.toast('Study session recorded! Progress updated.', 'success');

      // If currently on study-history view or dashboard, re-render
      if (App.currentRoute === 'study-history' || App.currentRoute === 'dashboard') {
        App.renderRoute(App.currentRoute);
      }
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteLog(id) {
    if (!confirm('Are you sure you want to delete this study log entry?')) return;
    try {
      await API.studyLogs.delete(id);
      App.toast('Study log removed.', 'info');
      this.render(document.getElementById('main-content'));
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};

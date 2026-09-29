/**
 * Test History & Results View
 */

const TestHistoryView = {
  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="color:var(--text-muted);">Loading test history...</div>
      </div>
    `;

    try {
      const tests = await API.tests.getAll();

      let tableRows = '';
      if (!tests || tests.length === 0) {
        tableRows = `
          <tr>
            <td colspan="6" style="text-align:center; padding: 48px; color:var(--text-muted);">
              <div style="font-size:2rem; margin-bottom:8px;">📊</div>
              <strong>No tests recorded yet.</strong><br>
              Generate your first personalized question paper from completed topics, take the test, and log your score!
            </td>
          </tr>
        `;
      } else {
        tableRows = tests.map(t => {
          const scoreClass = t.percentage >= 75 ? 'badge-completed' : (t.percentage >= 50 ? 'badge-in_progress' : 'badge-revision');
          return `
            <tr>
              <td style="white-space:nowrap; font-weight:600;">${t.test_date}</td>
              <td>
                <div style="font-weight:700;">${escapeHtml(t.test_name)}</div>
                ${t.remarks ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${escapeHtml(t.remarks)}</div>` : ''}
              </td>
              <td>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="width:8px; height:8px; border-radius:50%; background:${t.subject_color || 'var(--primary)'}; display:inline-block;"></span>
                  <span>${escapeHtml(t.subject_name)}</span>
                </div>
              </td>
              <td style="font-weight:700;">
                ${t.marks_obtained} / ${t.total_marks}
              </td>
              <td>
                <span class="badge ${scoreClass}" style="font-size:0.8rem; padding:4px 10px;">
                  ${t.percentage}%
                </span>
              </td>
              <td style="text-align:right;">
                <div style="display:flex; justify-content:flex-end; gap:6px;">
                  <button class="btn btn-secondary btn-sm" onclick="TestHistoryView.viewTestDetails(${t.id})">Inspect</button>
                  <button class="sidebar-action-btn" title="Delete" style="color:var(--text-muted);" onclick="TestHistoryView.deleteTest(${t.id})">🗑️</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
          <div>
            <h1 style="font-size:1.6rem; font-weight:800; letter-spacing:-0.02em;">Test & Performance History</h1>
            <p style="color:var(--text-muted); font-size:0.9rem;">
              Track your exam scores and verify how well you recall completed syllabus topics.
            </p>
          </div>
          <div style="display:flex; gap:12px;">
            <button class="btn btn-secondary" onclick="TestHistoryView.openRecordOfflineModal()">+ Record Offline Test</button>
            <button class="btn btn-primary" onclick="App.navigate('paper-generator')">✨ Generate New Paper</button>
          </div>
        </div>

        <div class="card" style="padding:0; overflow:hidden;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Test Name</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Percentage</th>
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
      container.innerHTML = `<div class="card" style="color:var(--danger); padding:24px;">Failed to load test records: ${escapeHtml(err.message)}</div>`;
    }
  },

  async viewTestDetails(testId) {
    try {
      const test = await API.tests.getOne(testId);

      let weakTopicsHtml = '';
      if (test.flagged_weak_topics && test.flagged_weak_topics.length > 0) {
        weakTopicsHtml = `
          <div style="margin-top:16px; padding:12px; background:var(--warning-light); border-radius:var(--radius-sm); border:1px solid rgba(245,158,11,0.3);">
            <strong style="color:var(--warning-text); font-size:0.85rem;">Weak Topics Flagged For Revision:</strong>
            <ul style="margin:6px 0 0 20px; font-size:0.82rem; color:#78350f;">
              ${test.flagged_weak_topics.map(w => `
                <li><strong>${escapeHtml(w.topic_title)}</strong> — ${w.is_resolved ? '✅ Resolved' : '🔁 Pending Revision'}</li>
              `).join('')}
            </ul>
          </div>
        `;
      }

      let topicsTestedHtml = '';
      if (test.topics_tested && test.topics_tested.length > 0) {
        topicsTestedHtml = `
          <div style="margin-top:12px;">
            <span style="font-size:0.8rem; font-weight:600; color:var(--text-muted);">Topics Tested:</span>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;">
              ${test.topics_tested.map(t => `<span class="badge" style="background:var(--bg-main); border:1px solid var(--border-color);">${escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
        `;
      }

      App.openModal(`
        <div class="modal-header">
          <h3 class="card-title">${escapeHtml(test.test_name)}</h3>
          <button class="sidebar-action-btn" onclick="App.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
            <div style="background:var(--bg-main); padding:12px; border-radius:var(--radius-sm);">
              <div style="color:var(--text-muted); font-size:0.75rem;">Subject</div>
              <div style="font-weight:700;">${escapeHtml(test.subject_name)}</div>
            </div>
            <div style="background:var(--bg-main); padding:12px; border-radius:var(--radius-sm);">
              <div style="color:var(--text-muted); font-size:0.75rem;">Score Achieved</div>
              <div style="font-weight:800; font-size:1.1rem; color:var(--primary);">${test.marks_obtained} / ${test.total_marks} (${test.percentage}%)</div>
            </div>
          </div>

          <div style="font-size:0.88rem; margin-bottom:8px;">
            <strong>Test Date:</strong> ${test.test_date}
          </div>
          ${test.remarks ? `<div style="font-size:0.88rem; margin-bottom:8px;"><strong>Remarks:</strong> ${escapeHtml(test.remarks)}</div>` : ''}

          ${topicsTestedHtml}
          ${weakTopicsHtml}

          ${test.paper_data ? `
            <div style="margin-top:20px; text-align:center;">
              <button class="btn btn-secondary btn-sm" onclick="App.closeModal(); PaperGeneratorView.renderPaperPreview(${JSON.stringify(test.paper_data).replace(/"/g, '&quot;')});">
                📄 Open Full Question Paper & Rubric
              </button>
            </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Close</button>
        </div>
      `);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async openRecordOfflineModal() {
    try {
      const subjects = await API.subjects.getAll();
      if (!subjects || subjects.length === 0) {
        App.toast('Create a subject first!', 'info');
        return;
      }

      App.openModal(`
        <div class="modal-header">
          <h3 class="card-title">Record Offline Test Result</h3>
          <button class="sidebar-action-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form id="record-offline-form" onsubmit="TestHistoryView.handleSaveOffline(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Subject *</label>
              <select id="offline-subject" class="form-select" required>
                ${subjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Test Name *</label>
              <input type="text" id="offline-name" class="form-input" placeholder="e.g. Unit 2 Class Quiz, Mid-Term Exam" required>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div class="form-group">
                <label class="form-label">Total Marks *</label>
                <input type="number" id="offline-total" class="form-input" min="1" step="0.5" value="30" required>
              </div>
              <div class="form-group">
                <label class="form-label">Marks Obtained *</label>
                <input type="number" id="offline-obtained" class="form-input" min="0" step="0.5" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Date *</label>
              <input type="date" id="offline-date" class="form-input" value="${new Date().toISOString().slice(0, 10)}" required>
            </div>

            <div class="form-group">
              <label class="form-label">Remarks & Reflections</label>
              <input type="text" id="offline-remarks" class="form-input" placeholder="e.g. Need to re-read derivation formulas">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Test Score</button>
          </div>
        </form>
      `);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async handleSaveOffline(e) {
    e.preventDefault();
    const subject_id = document.getElementById('offline-subject').value;
    const test_name = document.getElementById('offline-name').value.trim();
    const total_marks = document.getElementById('offline-total').value;
    const marks_obtained = document.getElementById('offline-obtained').value;
    const test_date = document.getElementById('offline-date').value;
    const remarks = document.getElementById('offline-remarks').value;

    try {
      await API.tests.record({
        subject_id: Number(subject_id),
        test_name,
        test_date,
        total_marks: parseFloat(total_marks),
        marks_obtained: parseFloat(marks_obtained),
        remarks
      });

      App.closeModal();
      App.toast('Test score recorded successfully!', 'success');
      this.render(document.getElementById('main-content'));
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteTest(id) {
    if (!confirm('Are you sure you want to delete this test record?')) return;
    try {
      await API.tests.delete(id);
      App.toast('Test record removed.', 'info');
      this.render(document.getElementById('main-content'));
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};

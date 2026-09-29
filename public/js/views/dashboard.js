/**
 * Dashboard View
 */

const DashboardView = {
  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="font-size:1.1rem; color:var(--text-muted);">Loading dashboard data...</div>
      </div>
    `;

    try {
      const data = await API.analytics.getDashboard();
      const user = App.currentUser || { full_name: 'Student' };

      const { overall, subjects, recent_logs, recent_tests } = data;
      const hoursStudied = Math.floor(overall.total_study_minutes / 60);
      const minsStudied = overall.total_study_minutes % 60;
      const timeStr = hoursStudied > 0 ? `${hoursStudied}h ${minsStudied}m` : `${minsStudied}m`;

      let subjectsHtml = '';
      if (!subjects || subjects.length === 0) {
        subjectsHtml = `
          <div class="card" style="text-align:center; padding: 36px; grid-column: 1 / -1;">
            <div style="font-size:2rem; margin-bottom:12px;">📚</div>
            <h3 style="margin-bottom:8px;">No Subjects Added Yet</h3>
            <p style="color:var(--text-muted); max-width:450px; margin:0 auto 16px;">
              Get started by adding your custom academic subjects and syllabus, or load our pre-configured sample syllabus.
            </p>
            <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
              <button class="btn btn-primary" onclick="App.navigate('subjects')">+ Add Custom Subject</button>
              <button class="btn btn-secondary" onclick="App.seedSampleSyllabus()">⚡ Load Sample Syllabus (VLSI & AI/ML)</button>
            </div>
          </div>
        `;
      } else {
        subjectsHtml = subjects.map(sub => `
          <div class="card subject-card" style="border-top-color: ${sub.color || 'var(--primary)'};">
            <div>
              <div class="subject-card-header">
                <div>
                  <h3 class="subject-name">${escapeHtml(sub.name)}</h3>
                  ${sub.code ? `<span class="subject-code">${escapeHtml(sub.code)}</span>` : ''}
                </div>
                <div style="font-size:1.1rem; font-weight:800; color:${sub.color || 'var(--primary)'};">
                  ${sub.progress_percentage}%
                </div>
              </div>
              <div class="progress-container" style="margin-bottom: 12px;">
                <div class="progress-bar ${sub.progress_percentage === 100 ? 'success' : ''}" 
                     style="width: ${sub.progress_percentage}%; background-color: ${sub.color || 'var(--primary)'};"></div>
              </div>
              <div class="subject-stats-pills">
                <span class="stat-pill" title="Completed Topics">✅ ${sub.completed_topics}/${sub.total_topics} Completed</span>
                ${sub.in_progress_topics > 0 ? `<span class="stat-pill" title="In Progress">⏳ ${sub.in_progress_topics} In Progress</span>` : ''}
                ${sub.revision_topics > 0 ? `<span class="stat-pill" style="color:var(--warning-text); background:var(--warning-light);" title="Revision Needed">🔁 ${sub.revision_topics} Revision</span>` : ''}
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; pt-2; border-top:1px solid var(--border-color);">
              <button class="btn btn-secondary btn-sm" onclick="App.openSyllabusSubject(${sub.id})">Open Syllabus</button>
              <button class="btn btn-primary btn-sm" onclick="App.openPaperGenerator(${sub.id})">Generate Paper</button>
            </div>
          </div>
        `).join('');
      }

      let logsHtml = '';
      if (!recent_logs || recent_logs.length === 0) {
        logsHtml = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.88rem;">No study sessions logged yet. Record what you study today!</div>`;
      } else {
        logsHtml = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject & Topic</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${recent_logs.map(log => `
                  <tr>
                    <td style="white-space:nowrap; font-weight:500;">${log.study_date}</td>
                    <td>
                      <div style="font-weight:600; display:flex; align-items:center; gap:6px;">
                        <span style="width:8px; height:8px; border-radius:50%; background:${log.subject_color || 'var(--primary)'}; display:inline-block;"></span>
                        ${escapeHtml(log.subject_name)}
                      </div>
                      <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(log.topic_title)}</div>
                    </td>
                    <td style="white-space:nowrap;">${log.duration_minutes > 0 ? `${log.duration_minutes}m` : '—'}</td>
                    <td><span class="badge badge-${log.status.toLowerCase().replace(/\s+/g, '_')}">${escapeHtml(log.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      let testsHtml = '';
      if (!recent_tests || recent_tests.length === 0) {
        testsHtml = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.88rem;">No test results recorded yet. Generate a paper and test your knowledge!</div>`;
      } else {
        testsHtml = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Test Name</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${recent_tests.map(t => `
                  <tr>
                    <td style="white-space:nowrap;">${t.test_date}</td>
                    <td style="font-weight:600;">${escapeHtml(t.test_name)}</td>
                    <td>${escapeHtml(t.subject_name)}</td>
                    <td>${t.marks_obtained}/${t.total_marks}</td>
                    <td>
                      <span class="badge ${t.percentage >= 75 ? 'badge-completed' : (t.percentage >= 50 ? 'badge-in_progress' : 'badge-revision')}">
                        ${t.percentage}%
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      container.innerHTML = `
        <!-- Dashboard Hero -->
        <div class="dashboard-hero">
          <div class="hero-content">
            <h1>Welcome back, ${escapeHtml(user.full_name || user.username)} 👋</h1>
            <p>
              Continuous cycle of learning: <strong>Study → Track → Test → Analyze → Revise</strong>.
              ${overall.total_topics > 0 
                ? `You've completed <strong>${overall.completed_topics} of ${overall.total_topics} topics</strong> across ${overall.total_subjects} subjects.`
                : 'Configure your custom subjects and syllabus to begin tracking.'}
            </p>
            <div class="hero-actions">
              <button class="btn btn-primary" onclick="App.openLogStudyModal()">+ Log Today's Study</button>
              <button class="btn btn-secondary" style="color:white; border-color:rgba(255,255,255,0.3);" onclick="App.navigate('paper-generator')">
                ✨ Generate My Paper
              </button>
            </div>
          </div>
          <div class="hero-gauge">
            <div class="gauge-value">${overall.progress_percentage}%</div>
            <div class="gauge-label">Overall Syllabus</div>
            <div style="font-size:0.75rem; color:#93c5fd; margin-top:4px;">${overall.completed_topics}/${overall.total_topics} Topics</div>
          </div>
        </div>

        <!-- Metric Cards -->
        <div class="stats-grid">
          <div class="card stat-card">
            <div class="stat-icon" style="background:#e0e7ff; color:#4338ca;">📚</div>
            <div class="stat-info">
              <div class="stat-value">${overall.total_subjects}</div>
              <div class="stat-label">Active Subjects</div>
            </div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon" style="background:var(--success-light); color:var(--success-text);">✅</div>
            <div class="stat-info">
              <div class="stat-value">${overall.completed_topics}</div>
              <div class="stat-label">Topics Completed</div>
            </div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon" style="background:#f1f5f9; color:#475569;">⏳</div>
            <div class="stat-info">
              <div class="stat-value">${overall.remaining_topics}</div>
              <div class="stat-label">Topics Remaining</div>
            </div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon" style="background:var(--warning-light); color:var(--warning-text);">🔁</div>
            <div class="stat-info">
              <div class="stat-value">${overall.revision_topics}</div>
              <div class="stat-label">Revision Needed</div>
            </div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon" style="background:#dbeafe; color:#1e40af;">⏱️</div>
            <div class="stat-info">
              <div class="stat-value">${timeStr}</div>
              <div class="stat-label">Total Study Time</div>
            </div>
          </div>
        </div>

        <!-- Subject Progress Section -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="font-size:1.25rem; font-weight:700;">Subject-wise Syllabus Progress</h2>
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('subjects')">Manage Subjects</button>
        </div>
        <div class="subjects-grid">
          ${subjectsHtml}
        </div>

        <!-- Recent Logs & Tests Section -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap:24px; margin-top:12px;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Recent Study Activity</h3>
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('study-history')">View All</button>
            </div>
            ${logsHtml}
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Recent Test Results</h3>
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('test-history')">View All</button>
            </div>
            ${testsHtml}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="text-align:center; padding:40px; color:var(--danger);">
          <h3>Error loading dashboard</h3>
          <p style="margin:8px 0 16px;">${escapeHtml(err.message)}</p>
          <button class="btn btn-primary" onclick="DashboardView.render(document.getElementById('main-content'))">Retry</button>
        </div>
      `;
    }
  }
};

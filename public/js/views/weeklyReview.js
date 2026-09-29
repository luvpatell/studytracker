/**
 * Weekly Study Review View
 */

const WeeklyReviewView = {
  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="color:var(--text-muted);">Analyzing weekly study metrics...</div>
      </div>
    `;

    try {
      const data = await API.analytics.getWeeklyReview();
      const { period, current_week, previous_week, comparison, syllabus_summary, completed_topics, revision_topics, subject_breakdown } = data;

      const curHours = Math.floor(current_week.total_study_minutes / 60);
      const curMins = current_week.total_study_minutes % 60;
      const curTimeStr = curHours > 0 ? `${curHours}h ${curMins}m` : `${curMins}m`;

      const prevHours = Math.floor(previous_week.total_study_minutes / 60);
      const prevMins = previous_week.total_study_minutes % 60;
      const prevTimeStr = prevHours > 0 ? `${prevHours}h ${prevMins}m` : `${prevMins}m`;

      const timeDiffBadge = comparison.minutes_diff >= 0
        ? `<span style="color:var(--success); font-weight:700;">▲ +${comparison.minutes_diff}m vs last week</span>`
        : `<span style="color:var(--danger); font-weight:700;">▼ ${comparison.minutes_diff}m vs last week</span>`;

      const sessionsDiffBadge = comparison.sessions_diff >= 0
        ? `<span style="color:var(--success); font-weight:600;">▲ +${comparison.sessions_diff} sessions</span>`
        : `<span style="color:var(--warning-text); font-weight:600;">▼ ${comparison.sessions_diff} sessions</span>`;

      let completedTopicsHtml = '';
      if (!completed_topics || completed_topics.length === 0) {
        completedTopicsHtml = `<div style="padding:16px; text-align:center; color:var(--text-muted);">No topics marked as completed during this 7-day period.</div>`;
      } else {
        completedTopicsHtml = `
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${completed_topics.map(t => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-main); border-radius:var(--radius-sm); border:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="color:var(--success); font-weight:bold;">✔</span>
                  <span style="font-weight:600;">${escapeHtml(t.title)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                  <span class="badge" style="background:${t.subject_color || 'var(--primary)'}22; color:${t.subject_color || 'var(--primary)'}; font-weight:600;">
                    ${escapeHtml(t.subject_name)}
                  </span>
                  <span style="font-size:0.75rem; color:var(--text-muted);">${t.study_date}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      let revisionTopicsHtml = '';
      if (!revision_topics || revision_topics.length === 0) {
        revisionTopicsHtml = `<div style="padding:16px; text-align:center; color:var(--text-muted);">No weak topics flagged for revision this week. Great job!</div>`;
      } else {
        revisionTopicsHtml = `
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${revision_topics.map(t => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--warning-light); border-radius:var(--radius-sm); border:1px solid rgba(245,158,11,0.2);">
                <div>
                  <div style="font-weight:700; color:var(--warning-text);">${escapeHtml(t.topic_title)}</div>
                  <div style="font-size:0.78rem; color:#78350f;">Reason: ${escapeHtml(t.reason || 'Flagged for review')}</div>
                </div>
                <span class="badge" style="background:white; color:var(--warning-text);">${escapeHtml(t.subject_name)}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      let subjectTable = '';
      if (!subject_breakdown || subject_breakdown.length === 0) {
        subjectTable = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">No subjects found.</td></tr>`;
      } else {
        subjectTable = subject_breakdown.map(s => {
          const sHours = Math.floor(s.minutes_studied / 60);
          const sMins = s.minutes_studied % 60;
          const sTime = sHours > 0 ? `${sHours}h ${sMins}m` : `${sMins}m`;
          return `
            <tr>
              <td style="font-weight:600; display:flex; align-items:center; gap:8px;">
                <span style="width:8px; height:8px; border-radius:50%; background:${s.color || 'var(--primary)'}; display:inline-block;"></span>
                ${escapeHtml(s.name)}
              </td>
              <td>${s.sessions_count} sessions</td>
              <td>${sTime}</td>
              <td><span class="badge badge-completed">${s.topics_completed} topics</span></td>
            </tr>
          `;
        }).join('');
      }

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
          <div>
            <h1 style="font-size:1.6rem; font-weight:800; letter-spacing:-0.02em;">Weekly Study Review</h1>
            <p style="color:var(--text-muted); font-size:0.9rem;">
              Reflect on your academic discipline over the past 7 days (${period.start} to ${period.end}).
            </p>
          </div>
          <button class="btn btn-primary" onclick="App.navigate('paper-generator')">Generate Weekly Test</button>
        </div>

        <!-- Weekly Summary Cards -->
        <div class="stats-grid">
          <div class="card stat-card">
            <div class="stat-icon" style="background:var(--primary-light); color:var(--primary);">⏱️</div>
            <div class="stat-info">
              <div class="stat-value">${curTimeStr}</div>
              <div class="stat-label">Study Time This Week</div>
              <div style="font-size:0.75rem; margin-top:2px;">${timeDiffBadge}</div>
            </div>
          </div>

          <div class="card stat-card">
            <div class="stat-icon" style="background:#e0f2fe; color:#0369a1;">📅</div>
            <div class="stat-info">
              <div class="stat-value">${current_week.total_sessions}</div>
              <div class="stat-label">Study Sessions</div>
              <div style="font-size:0.75rem; margin-top:2px;">${sessionsDiffBadge}</div>
            </div>
          </div>

          <div class="card stat-card">
            <div class="stat-icon" style="background:var(--success-light); color:var(--success-text);">🎓</div>
            <div class="stat-info">
              <div class="stat-value">${current_week.topics_completed_count}</div>
              <div class="stat-label">Completed This Week</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${current_week.topics_studied_count} topics reviewed</div>
            </div>
          </div>

          <div class="card stat-card">
            <div class="stat-icon" style="background:var(--warning-light); color:var(--warning-text);">⚠️</div>
            <div class="stat-info">
              <div class="stat-value">${current_week.revision_flagged_count}</div>
              <div class="stat-label">Marked for Revision</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Need extra attention</div>
            </div>
          </div>

          <div class="card stat-card">
            <div class="stat-icon" style="background:#f1f5f9; color:#475569;">📊</div>
            <div class="stat-info">
              <div class="stat-value">${syllabus_summary.remaining_topics}</div>
              <div class="stat-label">Topics Remaining</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">out of ${syllabus_summary.total_topics} total</div>
            </div>
          </div>
        </div>

        <!-- Subject Breakdown Table -->
        <div class="card" style="margin-bottom:24px; padding:0; overflow:hidden;">
          <div style="padding:16px 20px; border-bottom:1px solid var(--border-color); background:var(--bg-main);">
            <h3 style="font-size:1.05rem; font-weight:700;">Subject Time & Progress Breakdown (This Week)</h3>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Sessions</th>
                  <th>Time Invested</th>
                  <th>Topics Completed</th>
                </tr>
              </thead>
              <tbody>
                ${subjectTable}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Dual Column: Completed Topics vs Weak Topics -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap:24px;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Completed Topics This Week (${current_week.topics_completed_count})</h3>
            </div>
            ${completedTopicsHtml}
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Topics Flagged for Revision (${current_week.revision_flagged_count})</h3>
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('revision')">Open Revision</button>
            </div>
            ${revisionTopicsHtml}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--danger); padding:24px;">Failed to load weekly review: ${escapeHtml(err.message)}</div>`;
    }
  }
};

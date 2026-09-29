/**
 * Progress Analytics & Performance Visualizer View
 */

const AnalyticsView = {
  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="color:var(--text-muted);">Generating analytics visualizers...</div>
      </div>
    `;

    try {
      const chartsData = await API.analytics.getCharts();
      const { daily_study, test_scores, subject_stats } = chartsData;

      // 1. Daily study bar chart (SVG)
      let studyBarChart = '';
      if (!daily_study || daily_study.length === 0) {
        studyBarChart = `<div style="text-align:center; padding:40px; color:var(--text-muted);">No study time logs recorded in the last 14 days.</div>`;
      } else {
        const maxMins = Math.max(...daily_study.map(d => d.minutes), 60);
        const chartHeight = 160;
        const chartWidth = 500;
        const barWidth = Math.max(16, Math.floor(chartWidth / (daily_study.length * 1.6)));

        const bars = daily_study.map((d, idx) => {
          const h = Math.round((d.minutes / maxMins) * (chartHeight - 40));
          const x = 40 + idx * (barWidth + 14);
          const y = chartHeight - 24 - h;
          const dateLabel = d.study_date.slice(5); // MM-DD
          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="4" fill="#6366f1">
              <title>${d.study_date}: ${d.minutes} mins (${d.sessions} sessions)</title>
            </rect>
            <text x="${x + barWidth / 2}" y="${y - 6}" font-size="10" text-anchor="middle" fill="var(--text-muted)">${d.minutes}m</text>
            <text x="${x + barWidth / 2}" y="${chartHeight - 8}" font-size="10" text-anchor="middle" fill="var(--text-muted)">${dateLabel}</text>
          `;
        }).join('');

        studyBarChart = `
          <svg viewBox="0 0 ${chartWidth + 60} ${chartHeight}" style="width:100%; height:auto; overflow:visible;">
            <line x1="30" y1="${chartHeight - 24}" x2="${chartWidth + 50}" y2="${chartHeight - 24}" stroke="var(--border-color)" stroke-width="1"/>
            ${bars}
          </svg>
        `;
      }

      // 2. Test scores line/bar chart (SVG)
      let testScoreChart = '';
      if (!test_scores || test_scores.length === 0) {
        testScoreChart = `<div style="text-align:center; padding:40px; color:var(--text-muted);">No test records recorded yet. Complete tests to see your score trajectory!</div>`;
      } else {
        const chartHeight = 160;
        const chartWidth = 500;
        const pts = test_scores.map((t, idx) => {
          const x = 50 + (idx * ((chartWidth - 60) / Math.max(1, test_scores.length - 1)));
          const y = chartHeight - 24 - Math.round((t.percentage / 100) * (chartHeight - 45));
          return { x, y, percentage: t.percentage, name: t.test_name, date: t.test_date };
        });

        const polylinePts = pts.map(p => `${p.x},${p.y}`).join(' ');

        testScoreChart = `
          <svg viewBox="0 0 ${chartWidth + 40} ${chartHeight}" style="width:100%; height:auto; overflow:visible;">
            <!-- Gridlines -->
            <line x1="40" y1="${chartHeight - 24}" x2="${chartWidth + 20}" y2="${chartHeight - 24}" stroke="var(--border-color)" stroke-width="1"/>
            <line x1="40" y1="${chartHeight - 24 - (chartHeight - 45) / 2}" x2="${chartWidth + 20}" y2="${chartHeight - 24 - (chartHeight - 45) / 2}" stroke="var(--border-color)" stroke-dasharray="3,3" stroke-width="1"/>
            <line x1="40" y1="20" x2="${chartWidth + 20}" y2="20" stroke="var(--border-color)" stroke-dasharray="3,3" stroke-width="1"/>

            <text x="25" y="24" font-size="10" fill="var(--text-muted)" text-anchor="end">100%</text>
            <text x="25" y="${chartHeight - 24 - (chartHeight - 45) / 2 + 4}" font-size="10" fill="var(--text-muted)" text-anchor="end">50%</text>
            <text x="25" y="${chartHeight - 20}" font-size="10" fill="var(--text-muted)" text-anchor="end">0%</text>

            <polyline fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polylinePts}"/>
            ${pts.map(p => `
              <circle cx="${p.x}" cy="${p.y}" r="5" fill="#10b981" stroke="#ffffff" stroke-width="2">
                <title>${p.name}: ${p.percentage}% on ${p.date}</title>
              </circle>
              <text x="${p.x}" y="${p.y - 8}" font-size="10" font-weight="bold" text-anchor="middle" fill="#10b981">${p.percentage}%</text>
              <text x="${p.x}" y="${chartHeight - 8}" font-size="9" text-anchor="middle" fill="var(--text-muted)">${p.date.slice(5)}</text>
            `).join('')}
          </svg>
        `;
      }

      // 3. Subject-wise completion bars
      let subjectsList = '';
      if (!subject_stats || subject_stats.length === 0) {
        subjectsList = `<div style="text-align:center; padding:20px; color:var(--text-muted);">No subjects found.</div>`;
      } else {
        subjectsList = subject_stats.map(s => {
          const total = s.total_topics || 0;
          const completed = s.completed_topics || 0;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          return `
            <div style="margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div style="font-weight:600; font-size:0.9rem; display:flex; align-items:center; gap:8px;">
                  <span style="width:10px; height:10px; border-radius:50%; background:${s.color || 'var(--primary)'}; display:inline-block;"></span>
                  ${escapeHtml(s.name)}
                </div>
                <div style="font-weight:700; font-size:0.9rem; color:${s.color || 'var(--primary)'};">
                  ${pct}% (${completed}/${total} topics)
                </div>
              </div>
              <div class="progress-container">
                <div class="progress-bar ${pct === 100 ? 'success' : ''}" style="width:${pct}%; background-color:${s.color || 'var(--primary)'};"></div>
              </div>
            </div>
          `;
        }).join('');
      }

      container.innerHTML = `
        <div style="margin-bottom:24px;">
          <h1 style="font-size:1.6rem; font-weight:800; letter-spacing:-0.02em;">Progress Analytics & Statistics</h1>
          <p style="color:var(--text-muted); font-size:0.9rem;">
            Visual breakdown of your academic persistence, test score trends, and subject mastery.
          </p>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap:24px;">
          <!-- Daily Study Time Chart -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Daily Study Time (Last 14 Days)</h3>
            </div>
            <div style="padding:10px 0;">
              ${studyBarChart}
            </div>
          </div>

          <!-- Test Scores Trend Chart -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Test Score Trajectory (%)</h3>
            </div>
            <div style="padding:10px 0;">
              ${testScoreChart}
            </div>
          </div>

          <!-- Subject Syllabus Completion -->
          <div class="card" style="grid-column: 1 / -1;">
            <div class="card-header">
              <h3 class="card-title">Subject Syllabus Mastery</h3>
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('subjects')">Manage Syllabus</button>
            </div>
            <div style="padding:10px 0;">
              ${subjectsList}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--danger); padding:24px;">Failed to load analytics: ${escapeHtml(err.message)}</div>`;
    }
  }
};

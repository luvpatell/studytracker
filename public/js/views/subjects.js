/**
 * Subjects Management View
 */

const SubjectsView = {
  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="color:var(--text-muted);">Loading subjects...</div>
      </div>
    `;

    try {
      const subjects = await API.subjects.getAll();

      let cardsHtml = '';
      if (!subjects || subjects.length === 0) {
        cardsHtml = `
          <div class="card" style="text-align:center; padding: 48px; grid-column: 1 / -1;">
            <div style="font-size:3rem; margin-bottom:16px;">📖</div>
            <h2 style="margin-bottom:8px;">No Subjects Added Yet</h2>
            <p style="color:var(--text-muted); max-width:500px; margin:0 auto 20px;">
              StudyTrack does not force any preset syllabus. Add your own subjects, units, and chapters/topics to track your actual study curriculum.
            </p>
            <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
              <button class="btn btn-primary" onclick="SubjectsView.openCreateModal()">+ Create My First Subject</button>
              <button class="btn btn-secondary" onclick="App.seedSampleSyllabus()">⚡ Load Sample Syllabus (VLSI & AI/ML)</button>
            </div>
          </div>
        `;
      } else {
        cardsHtml = subjects.map(s => `
          <div class="card subject-card" style="border-top: 4px solid ${s.color || 'var(--primary)'};">
            <div>
              <div class="subject-card-header">
                <div>
                  <h3 class="subject-name">${escapeHtml(s.name)}</h3>
                  ${s.code ? `<span class="subject-code">${escapeHtml(s.code)}</span>` : ''}
                </div>
                <div style="font-size:1.15rem; font-weight:800; color:${s.color || 'var(--primary)'};">
                  ${s.progress_percentage}%
                </div>
              </div>

              <div class="progress-container" style="margin: 10px 0 16px;">
                <div class="progress-bar ${s.progress_percentage === 100 ? 'success' : ''}" 
                     style="width: ${s.progress_percentage}%; background-color: ${s.color || 'var(--primary)'};"></div>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:16px; font-size:0.85rem;">
                <div style="background:var(--bg-main); padding:8px 12px; border-radius:var(--radius-sm);">
                  <div style="color:var(--text-muted); font-size:0.75rem;">Units / Modules</div>
                  <div style="font-weight:700; font-size:1rem;">${s.total_units} Units</div>
                </div>
                <div style="background:var(--bg-main); padding:8px 12px; border-radius:var(--radius-sm);">
                  <div style="color:var(--text-muted); font-size:0.75rem;">Topics Progress</div>
                  <div style="font-weight:700; font-size:1rem;">${s.completed_topics} / ${s.total_topics}</div>
                </div>
              </div>

              <div class="subject-stats-pills">
                <span class="stat-pill">⏳ ${s.in_progress_topics} In Progress</span>
                <span class="stat-pill" style="color:var(--warning-text); background:var(--warning-light);">🔁 ${s.revision_topics} Revision</span>
                <span class="stat-pill">⚪ ${s.not_started_topics} Remaining</span>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:14px; border-top:1px solid var(--border-color); gap:8px;">
              <button class="btn btn-secondary btn-sm" onclick="App.openSyllabusSubject(${s.id})">📂 Manage Syllabus</button>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-secondary btn-sm" onclick="SubjectsView.openEditModal(${s.id}, '${escapeHtml(s.name)}', '${escapeHtml(s.code || '')}', '${s.color || '#4f46e5'}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="SubjectsView.deleteSubject(${s.id}, '${escapeHtml(s.name)}')">🗑️</button>
              </div>
            </div>
          </div>
        `).join('');
      }

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
          <div>
            <h1 style="font-size:1.6rem; font-weight:800; letter-spacing:-0.02em;">My Academic Subjects</h1>
            <p style="color:var(--text-muted); font-size:0.9rem;">
              Create your subjects and build out their unit chapters and topics.
            </p>
          </div>
          <div style="display:flex; gap:12px;">
            <button class="btn btn-secondary" onclick="App.seedSampleSyllabus()">⚡ Load Sample</button>
            <button class="btn btn-primary" onclick="SubjectsView.openCreateModal()">+ Add New Subject</button>
          </div>
        </div>

        <div class="subjects-grid">
          ${cardsHtml}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--danger); padding:24px;">Failed to load subjects: ${escapeHtml(err.message)}</div>`;
    }
  },

  openCreateModal() {
    App.openModal(`
      <div class="modal-header">
        <h3 class="card-title">Add New Subject</h3>
        <button class="sidebar-action-btn" onclick="App.closeModal()">✕</button>
      </div>
      <form id="create-subject-form" onsubmit="SubjectsView.handleCreate(event)">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Subject Name *</label>
            <input type="text" id="sub-name" class="form-input" placeholder="e.g. VLSI Design, Operating Systems, Machine Learning" required autofocus>
          </div>
          <div class="form-group">
            <label class="form-label">Subject Code (Optional)</label>
            <input type="text" id="sub-code" class="form-input" placeholder="e.g. EC801, CS304">
          </div>
          <div class="form-group">
            <label class="form-label">Color Theme</label>
            <div style="display:flex; gap:12px; align-items:center;">
              <input type="color" id="sub-color" value="#4f46e5" style="width:48px; height:38px; border:none; border-radius:6px; cursor:pointer;">
              <span style="font-size:0.85rem; color:var(--text-muted);">Choose a visual color tag for this subject</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Subject</button>
        </div>
      </form>
    `);
  },

  async handleCreate(e) {
    e.preventDefault();
    const name = document.getElementById('sub-name').value.trim();
    const code = document.getElementById('sub-code').value.trim();
    const color = document.getElementById('sub-color').value;

    try {
      const created = await API.subjects.create({ name, code, color });
      App.closeModal();
      App.toast(`Subject "${created.name}" created!`, 'success');
      SubjectsView.render(document.getElementById('main-content'));
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openEditModal(id, name, code, color) {
    App.openModal(`
      <div class="modal-header">
        <h3 class="card-title">Edit Subject</h3>
        <button class="sidebar-action-btn" onclick="App.closeModal()">✕</button>
      </div>
      <form id="edit-subject-form" onsubmit="SubjectsView.handleEdit(event, ${id})">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Subject Name *</label>
            <input type="text" id="edit-sub-name" class="form-input" value="${name}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Subject Code</label>
            <input type="text" id="edit-sub-code" class="form-input" value="${code}">
          </div>
          <div class="form-group">
            <label class="form-label">Color Theme</label>
            <input type="color" id="edit-sub-color" value="${color}" style="width:48px; height:38px; border:none; border-radius:6px; cursor:pointer;">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    `);
  },

  async handleEdit(e, id) {
    e.preventDefault();
    const name = document.getElementById('edit-sub-name').value.trim();
    const code = document.getElementById('edit-sub-code').value.trim();
    const color = document.getElementById('edit-sub-color').value;

    try {
      await API.subjects.update(id, { name, code, color });
      App.closeModal();
      App.toast('Subject updated successfully', 'success');
      SubjectsView.render(document.getElementById('main-content'));
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteSubject(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}" and all its units, topics, and study logs? This cannot be undone.`)) {
      return;
    }

    try {
      await API.subjects.delete(id);
      App.toast(`Subject "${name}" deleted.`, 'info');
      SubjectsView.render(document.getElementById('main-content'));
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};

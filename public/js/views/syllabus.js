/**
 * Syllabus Explorer & Curriculum Editor View
 */

const SyllabusView = {
  currentSubjectId: null,

  async render(container, selectedSubjectId = null) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="color:var(--text-muted);">Loading syllabus...</div>
      </div>
    `;

    try {
      const subjects = await API.subjects.getAll();

      if (!subjects || subjects.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align:center; padding: 48px;">
            <div style="font-size:3rem; margin-bottom:12px;">📂</div>
            <h2 style="margin-bottom:8px;">No Syllabus Configured</h2>
            <p style="color:var(--text-muted); max-width:450px; margin:0 auto 20px;">
              You need to add at least one subject before configuring your syllabus topics.
            </p>
            <button class="btn btn-primary" onclick="App.navigate('subjects')">Go to Subjects</button>
          </div>
        `;
        return;
      }

      // Pick default subject
      let subId = selectedSubjectId || this.currentSubjectId || subjects[0].id;
      // Ensure subId is valid in the list
      if (!subjects.some(s => s.id === Number(subId))) {
        subId = subjects[0].id;
      }
      this.currentSubjectId = Number(subId);

      // Fetch full subject hierarchy
      const subjectDetail = await API.subjects.getOne(this.currentSubjectId);

      // Subject selector options
      const selectorOptions = subjects.map(s => `
        <option value="${s.id}" ${s.id === this.currentSubjectId ? 'selected' : ''}>
          ${escapeHtml(s.name)} (${s.progress_percentage}% completed)
        </option>
      `).join('');

      let unitsHtml = '';
      if (!subjectDetail.units || subjectDetail.units.length === 0) {
        unitsHtml = `
          <div class="card" style="text-align:center; padding: 36px;">
            <div style="font-size:2rem; margin-bottom:12px;">📑</div>
            <h3 style="margin-bottom:8px;">No Units or Modules Yet</h3>
            <p style="color:var(--text-muted); margin-bottom:16px;">
              Add your first unit (e.g. "Unit 1: Foundations", "Chapter 1: Basic Principles").
            </p>
            <button class="btn btn-primary" onclick="SyllabusView.openAddUnitModal(${subjectDetail.id})">+ Add Unit</button>
          </div>
        `;
      } else {
        unitsHtml = subjectDetail.units.map(unit => {
          let topicsHtml = '';
          if (!unit.topics || unit.topics.length === 0) {
            topicsHtml = `
              <div style="padding:16px; text-align:center; color:var(--text-muted); font-size:0.85rem; background:var(--bg-main); border-radius:var(--radius-sm); margin-top:8px;">
                No topics in this unit yet. Click "+ Add Topics" to add one or paste your syllabus lines!
              </div>
            `;
          } else {
            topicsHtml = `
              <div style="display:flex; flex-direction:column; gap:6px; margin-top:10px;">
                ${unit.topics.map(t => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-main); border-radius:var(--radius-sm); border:1px solid var(--border-color); gap:8px;">
                    <div style="display:flex; align-items:center; gap:10px; flex:1;">
                      <span style="font-weight:500; font-size:0.9rem;">${escapeHtml(t.title)}</span>
                    </div>

                    <div style="display:flex; align-items:center; gap:8px;">
                      <!-- Quick Status Toggle -->
                      <select class="form-select" style="padding:4px 8px; font-size:0.75rem; width:auto; border-radius:var(--radius-full);"
                              onchange="SyllabusView.changeTopicStatus(${t.id}, this.value)">
                        <option value="not_started" ${t.status === 'not_started' ? 'selected' : ''}>⚪ Not Started</option>
                        <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>⏳ In Progress</option>
                        <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                        <option value="revision" ${t.status === 'revision' ? 'selected' : ''}>🔁 Revision</option>
                      </select>

                      <button class="sidebar-action-btn" style="color:var(--text-muted); padding:4px;" title="Delete Topic" onclick="SyllabusView.deleteTopic(${t.id})">✕</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
          }

          return `
            <div class="card" style="margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div>
                  <h3 style="font-size:1.05rem; font-weight:700;">
                    ${unit.unit_number ? `Unit ${unit.unit_number}: ` : ''}${escapeHtml(unit.title)}
                  </h3>
                  <div style="font-size:0.8rem; color:var(--text-muted);">
                    ${unit.completed_topics} of ${unit.total_topics} topics completed (${unit.progress_percentage}%)
                  </div>
                </div>

                <div style="display:flex; gap:8px;">
                  <button class="btn btn-primary btn-sm" onclick="SyllabusView.openAddTopicsModal(${unit.id}, '${escapeHtml(unit.title)}')">+ Add Topics</button>
                  <button class="btn btn-secondary btn-sm" onclick="SyllabusView.deleteUnit(${unit.id}, '${escapeHtml(unit.title)}')">🗑️</button>
                </div>
              </div>

              <div class="progress-container" style="margin: 12px 0 6px;">
                <div class="progress-bar ${unit.progress_percentage === 100 ? 'success' : ''}" style="width: ${unit.progress_percentage}%;"></div>
              </div>

              ${topicsHtml}
            </div>
          `;
        }).join('');
      }

      container.innerHTML = `
        <!-- Top Toolbar -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:16px;">
          <div>
            <h1 style="font-size:1.6rem; font-weight:800; letter-spacing:-0.02em;">Syllabus Explorer</h1>
            <p style="color:var(--text-muted); font-size:0.9rem;">
              Manage your units, add topics, and update topic completion statuses.
            </p>
          </div>

          <div style="display:flex; gap:12px; align-items:center;">
            <select class="form-select" style="min-width:220px; font-weight:600;" onchange="SyllabusView.onSubjectSelect(this.value)">
              ${selectorOptions}
            </select>
            <button class="btn btn-primary" onclick="SyllabusView.openAddUnitModal(${subjectDetail.id})">+ Add Unit</button>
          </div>
        </div>

        <!-- Subject Overview Card -->
        <div class="card" style="margin-bottom:24px; border-left:6px solid ${subjectDetail.color || 'var(--primary)'};">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
              <div style="display:flex; align-items:center; gap:10px;">
                <h2 style="font-size:1.3rem; font-weight:800;">${escapeHtml(subjectDetail.name)}</h2>
                ${subjectDetail.code ? `<span class="subject-code">${escapeHtml(subjectDetail.code)}</span>` : ''}
              </div>
              <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
                ${subjectDetail.completed_topics} of ${subjectDetail.total_topics} topics completed across ${subjectDetail.units.length} units
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:20px;">
              <div style="text-align:right;">
                <div style="font-size:1.75rem; font-weight:800; color:var(--primary); line-height:1;">
                  ${subjectDetail.progress_percentage}%
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Subject Completion</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.openPaperGenerator(${subjectDetail.id})">Generate Paper</button>
            </div>
          </div>

          <div class="progress-container" style="margin-top:16px; height:10px;">
            <div class="progress-bar ${subjectDetail.progress_percentage === 100 ? 'success' : ''}" style="width: ${subjectDetail.progress_percentage}%;"></div>
          </div>
        </div>

        <!-- Units & Topics List -->
        <div>
          ${unitsHtml}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--danger); padding:24px;">Failed to load syllabus: ${escapeHtml(err.message)}</div>`;
    }
  },

  onSubjectSelect(subjectId) {
    this.currentSubjectId = Number(subjectId);
    this.render(document.getElementById('main-content'), this.currentSubjectId);
  },

  openAddUnitModal(subjectId) {
    App.openModal(`
      <div class="modal-header">
        <h3 class="card-title">Add Unit to Subject</h3>
        <button class="sidebar-action-btn" onclick="App.closeModal()">✕</button>
      </div>
      <form id="add-unit-form" onsubmit="SyllabusView.handleAddUnit(event, ${subjectId})">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Unit Title *</label>
            <input type="text" id="unit-title" class="form-input" placeholder="e.g. Unit 1: Semiconductor Physics, Chapter 3: Scheduling" required autofocus>
          </div>
          <div class="form-group">
            <label class="form-label">Unit / Module Number (Optional)</label>
            <input type="number" id="unit-num" class="form-input" placeholder="e.g. 1, 2, 3">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Unit</button>
        </div>
      </form>
    `);
  },

  async handleAddUnit(e, subjectId) {
    e.preventDefault();
    const title = document.getElementById('unit-title').value.trim();
    const unit_number = document.getElementById('unit-num').value;

    try {
      await API.subjects.addUnit(subjectId, {
        title,
        unit_number: unit_number ? parseInt(unit_number, 10) : undefined
      });
      App.closeModal();
      App.toast('Unit added successfully!', 'success');
      this.render(document.getElementById('main-content'), subjectId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteUnit(unitId, unitTitle) {
    if (!confirm(`Delete "${unitTitle}" and all topics under it?`)) return;

    try {
      await API.subjects.deleteUnit(unitId);
      App.toast('Unit deleted.', 'info');
      this.render(document.getElementById('main-content'), this.currentSubjectId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openAddTopicsModal(unitId, unitTitle) {
    App.openModal(`
      <div class="modal-header">
        <h3 class="card-title">Add Topics to ${escapeHtml(unitTitle)}</h3>
        <button class="sidebar-action-btn" onclick="App.closeModal()">✕</button>
      </div>
      <form id="add-topics-form" onsubmit="SyllabusView.handleAddTopics(event, ${unitId})">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Bulk Add Topics (Paste one topic per line)</label>
            <textarea id="bulk-topics-input" class="form-textarea" rows="6" placeholder="Energy Band Diagram
MOS under Bias
MOSFET Symbols
MOSFET Operation" required autofocus></textarea>
            <div class="form-hint">Tip: Paste multiple syllabus items directly from your PDF or syllabus document. Each line becomes a distinct topic!</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Topics to Unit</button>
        </div>
      </form>
    `);
  },

  async handleAddTopics(e, unitId) {
    e.preventDefault();
    const bulk_text = document.getElementById('bulk-topics-input').value;

    try {
      const added = await API.subjects.addTopics(unitId, { bulk_text });
      App.closeModal();
      App.toast(`Added ${added.length} topics successfully!`, 'success');
      this.render(document.getElementById('main-content'), this.currentSubjectId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async changeTopicStatus(topicId, newStatus) {
    try {
      await API.subjects.updateTopicStatus(topicId, newStatus);
      App.toast(`Topic status updated to ${newStatus.replace('_', ' ')}`, 'success');
      // Refresh to update progress bars
      this.render(document.getElementById('main-content'), this.currentSubjectId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteTopic(topicId) {
    if (!confirm('Are you sure you want to remove this topic?')) return;

    try {
      await API.subjects.deleteTopic(topicId);
      App.toast('Topic removed.', 'info');
      this.render(document.getElementById('main-content'), this.currentSubjectId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};

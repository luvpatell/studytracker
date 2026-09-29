/**
 * Weak Topics & Revision System View
 */

const RevisionView = {
  currentTab: 'active', // 'active' or 'resolved'

  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="color:var(--text-muted);">Loading revision queue...</div>
      </div>
    `;

    try {
      const items = await API.revision.getAll(this.currentTab);

      let itemsHtml = '';
      if (!items || items.length === 0) {
        itemsHtml = `
          <div class="card" style="text-align:center; padding: 48px;">
            <div style="font-size:2.5rem; margin-bottom:12px;">🎉</div>
            <h3 style="margin-bottom:8px;">
              ${this.currentTab === 'active' ? 'No Topics Currently In Revision!' : 'No Resolved Revision History'}
            </h3>
            <p style="color:var(--text-muted); max-width:450px; margin:0 auto 16px;">
              ${this.currentTab === 'active' 
                ? 'Topics you struggle with during tests or study sessions will be queued here for targeted re-evaluation.'
                : 'Topics marked as revised will be archived here.'}
            </p>
            ${this.currentTab === 'active' ? `
              <button class="btn btn-secondary" onclick="RevisionView.openManualAddModal()">+ Manually Flag Topic for Revision</button>
            ` : ''}
          </div>
        `;
      } else {
        itemsHtml = items.map(item => `
          <div class="card" style="margin-bottom:14px; border-left:4px solid ${item.is_resolved ? 'var(--success)' : 'var(--warning)'}; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge" style="background:${item.subject_color || 'var(--primary)'}22; color:${item.subject_color || 'var(--primary)'}; font-weight:700;">
                  ${escapeHtml(item.subject_name)}
                </span>
                ${item.unit_title ? `<span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(item.unit_title)}</span>` : ''}
              </div>

              <div style="font-size:1.1rem; font-weight:700; margin:6px 0 2px;">
                ${escapeHtml(item.topic_title)}
              </div>

              <div style="font-size:0.82rem; color:var(--text-muted);">
                ${item.reason ? `<em>"${escapeHtml(item.reason)}"</em> • ` : ''}
                Flagged on ${item.created_at.slice(0, 10)}
                ${item.is_resolved ? ` • <strong style="color:var(--success);">Resolved on ${item.resolved_at ? item.resolved_at.slice(0, 10) : 'Done'}</strong>` : ''}
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
              ${!item.is_resolved ? `
                <button class="btn btn-success btn-sm" onclick="RevisionView.resolveTopic(${item.id})">
                  ✅ Mark Revised & Completed
                </button>
              ` : `
                <span class="badge badge-completed">Resolved</span>
              `}
              <button class="sidebar-action-btn" title="Remove" style="color:var(--text-muted);" onclick="RevisionView.deleteItem(${item.id})">🗑️</button>
            </div>
          </div>
        `).join('');
      }

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px;">
              <h1 style="font-size:1.6rem; font-weight:800; letter-spacing:-0.02em;">Weak Topics & Revision System</h1>
              <span class="badge" style="background:var(--warning-light); color:var(--warning-text); font-weight:700;">REVISION QUEUE</span>
            </div>
            <p style="color:var(--text-muted); font-size:0.9rem;">
              Close knowledge gaps with targeted revision loops: <strong>Study → Identify Weakness → Re-Test → Complete</strong>.
            </p>
          </div>

          <div style="display:flex; gap:12px;">
            <button class="btn btn-secondary" onclick="RevisionView.openManualAddModal()">+ Flag Weak Topic</button>
            <button class="btn btn-primary" onclick="RevisionView.generateRevisionTest()">🎯 Generate Revision Test</button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div style="display:flex; gap:8px; border-bottom:1px solid var(--border-color); margin-bottom:20px;">
          <button class="btn btn-sm ${this.currentTab === 'active' ? 'btn-primary' : 'btn-secondary'}" 
                  style="border-bottom-left-radius:0; border-bottom-right-radius:0;"
                  onclick="RevisionView.switchTab('active')">
            Active Revision Topics
          </button>
          <button class="btn btn-sm ${this.currentTab === 'resolved' ? 'btn-primary' : 'btn-secondary'}"
                  style="border-bottom-left-radius:0; border-bottom-right-radius:0;"
                  onclick="RevisionView.switchTab('resolved')">
            Previously Resolved History
          </button>
        </div>

        <!-- Revision Items List -->
        <div>
          ${itemsHtml}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--danger); padding:24px;">Failed to load revision items: ${escapeHtml(err.message)}</div>`;
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render(document.getElementById('main-content'));
  },

  async resolveTopic(id) {
    try {
      await API.revision.resolve(id);
      App.toast('Topic marked as revised! Syllabus completion updated.', 'success');
      this.render(document.getElementById('main-content'));
      App.updateRevisionBadge();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteItem(id) {
    if (!confirm('Remove this item from the revision list?')) return;
    try {
      await API.revision.delete(id);
      App.toast('Item removed from revision list.', 'info');
      this.render(document.getElementById('main-content'));
      App.updateRevisionBadge();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async openManualAddModal() {
    try {
      const subjects = await API.subjects.getAll();
      if (!subjects || subjects.length === 0) {
        App.toast('Create a subject first!', 'info');
        return;
      }

      App.openModal(`
        <div class="modal-header">
          <h3 class="card-title">Flag Topic for Revision</h3>
          <button class="sidebar-action-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form id="add-revision-form" onsubmit="RevisionView.handleManualAdd(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Subject *</label>
              <select id="rev-subject" class="form-select" onchange="RevisionView.loadTopicsForSubject(this.value)" required>
                ${subjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Topic *</label>
              <select id="rev-topic" class="form-select" required>
                <option value="">Loading topics...</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Reason / Difficulty Area</label>
              <input type="text" id="rev-reason" class="form-input" placeholder="e.g. Lost marks in quiz, need to re-read derivation" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Add to Revision List</button>
          </div>
        </form>
      `);

      await this.loadTopicsForSubject(subjects[0].id);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async loadTopicsForSubject(subjectId) {
    const topicSelect = document.getElementById('rev-topic');
    if (!topicSelect) return;

    try {
      const subject = await API.subjects.getOne(subjectId);
      let options = '';

      if (subject.units) {
        subject.units.forEach(u => {
          if (u.topics) {
            u.topics.forEach(t => {
              options += `<option value="${t.id}">${escapeHtml(t.title)} (${escapeHtml(u.title)})</option>`;
            });
          }
        });
      }

      topicSelect.innerHTML = options || '<option value="">No topics found in subject</option>';
    } catch (e) {
      topicSelect.innerHTML = '<option value="">Error loading topics</option>';
    }
  },

  async handleManualAdd(e) {
    e.preventDefault();
    const topic_id = document.getElementById('rev-topic').value;
    const reason = document.getElementById('rev-reason').value.trim();

    if (!topic_id) {
      App.toast('Please select a topic.', 'error');
      return;
    }

    try {
      await API.revision.add({ topic_id: Number(topic_id), reason });
      App.closeModal();
      App.toast('Topic added to revision list!', 'success');
      this.render(document.getElementById('main-content'));
      App.updateRevisionBadge();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async generateRevisionTest() {
    try {
      App.toast('Generating targeted revision test from your weak topics...', 'info');
      const response = await API.revision.generatePaper({});
      App.navigate('paper-generator');
      PaperGeneratorView.currentPaper = response.paper;
      PaperGeneratorView.renderPaperPreview(response.paper);
      App.toast('Revision test created!', 'success');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};

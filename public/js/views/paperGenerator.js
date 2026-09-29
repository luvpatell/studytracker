/**
 * Personalized Paper Generator View (FLAGSHIP FEATURE)
 */

const PaperGeneratorView = {
  currentPaper: null,
  showAnswerKeys: false,

  async render(container, preselectedSubjectId = null) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="color:var(--text-muted);">Loading paper generator...</div>
      </div>
    `;

    try {
      const subjects = await API.subjects.getAll();

      if (!subjects || subjects.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align:center; padding: 48px;">
            <div style="font-size:3rem; margin-bottom:16px;">📝</div>
            <h2 style="margin-bottom:8px;">No Subjects Found</h2>
            <p style="color:var(--text-muted); max-width:480px; margin:0 auto 20px;">
              You need to configure your subjects and mark topics as completed before generating a personalized paper.
            </p>
            <div style="display:flex; justify-content:center; gap:12px;">
              <button class="btn btn-primary" onclick="App.navigate('subjects')">Create Subject</button>
              <button class="btn btn-secondary" onclick="App.seedSampleSyllabus()">Load Sample Syllabus</button>
            </div>
          </div>
        `;
        return;
      }

      const activeSubjectId = preselectedSubjectId || subjects[0].id;

      container.innerHTML = `
        <div id="generator-screen">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <h1 style="font-size:1.6rem; font-weight:800; letter-spacing:-0.02em;">Personalized Question Paper Generator</h1>
                <span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">CORE FEATURE</span>
              </div>
              <p style="color:var(--text-muted); font-size:0.9rem;">
                Generate customized assessment papers tailored strictly to your completed syllabus topics.
              </p>
            </div>
            <button class="btn btn-secondary" onclick="App.navigate('test-history')">View Past Tests</button>
          </div>

          <div class="card paper-wizard-card">
            <form id="paper-gen-form" onsubmit="PaperGeneratorView.handleGenerate(event)">
              <!-- Step 1: Subject Selection -->
              <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="font-size:0.95rem;">1. Select Subject *</label>
                <select id="gen-subject" class="form-select" onchange="PaperGeneratorView.onSubjectSelect(this.value)" required>
                  ${subjects.map(s => `
                    <option value="${s.id}" ${s.id === Number(activeSubjectId) ? 'selected' : ''}>
                      ${escapeHtml(s.name)} ${s.code ? `(${escapeHtml(s.code)})` : ''} — ${s.completed_topics}/${s.total_topics} Topics Completed (${s.progress_percentage}%)
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- Step 2: Strict Topic Scope & Rule 9 -->
              <div class="card" style="background:var(--bg-main); border:1px solid var(--border-color); margin-bottom:24px; padding:16px;">
                <label class="form-label" style="font-size:0.95rem; margin-bottom:8px;">2. Topic Scope & Integrity Rule</label>
                
                <div style="margin-bottom:12px;">
                  <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer;">
                    <input type="checkbox" id="gen-completed-only" checked onchange="PaperGeneratorView.toggleCompletedOnly(this.checked)" style="margin-top:4px; width:18px; height:18px;">
                    <div>
                      <strong style="color:var(--text-main);">Completed Topics Only (Recommended — Strict Progress Rule)</strong>
                      <div style="font-size:0.8rem; color:var(--text-muted);">
                        Guarantees that questions will ONLY be created from topics you have marked as "Completed". Topics not yet completed are strictly excluded.
                      </div>
                    </div>
                  </label>
                </div>

                <!-- Topic selector container -->
                <div id="topic-checklist-container" style="margin-top:12px;">
                  <div style="font-size:0.85rem; color:var(--text-muted);">Loading eligible topics...</div>
                </div>
              </div>

              <!-- Step 3: Exam Parameters -->
              <div style="margin-bottom:24px;">
                <label class="form-label" style="font-size:0.95rem; margin-bottom:12px;">3. Exam Configuration</label>
                
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px; margin-bottom:16px;">
                  <div class="form-group">
                    <label class="form-label">Total Marks</label>
                    <select id="gen-marks" class="form-select">
                      <option value="20">20 Marks (Quick Quiz)</option>
                      <option value="30" selected>30 Marks (Standard Test)</option>
                      <option value="50">50 Marks (Mid-Term Assessment)</option>
                      <option value="100">100 Marks (Comprehensive Final)</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Number of Questions</label>
                    <select id="gen-count" class="form-select">
                      <option value="5">5 Questions</option>
                      <option value="8" selected>8 Questions (Balanced)</option>
                      <option value="12">12 Questions</option>
                      <option value="16">16 Questions</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Difficulty Level</label>
                    <select id="gen-difficulty" class="form-select">
                      <option value="Easy">Easy (Fundamental Definitions)</option>
                      <option value="Medium" selected>Medium (Standard Academic)</option>
                      <option value="Hard">Hard (Deep Analytical & Rigorous)</option>
                      <option value="Mixed">Mixed (All Levels)</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Include Question Types</label>
                  <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:10px; margin-top:6px;">
                    <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                      <input type="checkbox" name="q-type" value="mcq" checked> Multiple Choice (MCQ)
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                      <input type="checkbox" name="q-type" value="very_short" checked> Very Short Answer
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                      <input type="checkbox" name="q-type" value="short" checked> Short Answer
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                      <input type="checkbox" name="q-type" value="conceptual" checked> Conceptual
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                      <input type="checkbox" name="q-type" value="descriptive" checked> Descriptive
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                      <input type="checkbox" name="q-type" value="numerical" checked> Numerical Problems
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                      <input type="checkbox" name="q-type" value="application" checked> Application-based
                    </label>
                  </div>
                </div>

                <div class="form-group" style="margin-top:16px;">
                  <label class="form-label">Custom Paper Title (Optional)</label>
                  <input type="text" id="gen-title" class="form-input" placeholder="e.g. VLSI Weekly Assessment — Week 3">
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid var(--border-color); padding-top:16px;">
                <button type="submit" id="generate-btn" class="btn btn-primary btn-lg" style="min-width:220px;">
                  ✨ Generate My Paper
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Render Target for Generated Paper Display -->
        <div id="paper-result-screen" style="display:none;"></div>
      `;

      await this.loadTopicChecklist(activeSubjectId);
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--danger); padding:24px;">Failed to initialize generator: ${escapeHtml(err.message)}</div>`;
    }
  },

  async onSubjectSelect(subjectId) {
    await this.loadTopicChecklist(subjectId);
  },

  async toggleCompletedOnly(isCompletedOnly) {
    const subId = document.getElementById('gen-subject').value;
    await this.loadTopicChecklist(subId, isCompletedOnly);
  },

  async loadTopicChecklist(subjectId, completedOnly = true) {
    const container = document.getElementById('topic-checklist-container');
    if (!container) return;

    try {
      const subject = await API.subjects.getOne(subjectId);
      const isCompletedOnly = document.getElementById('gen-completed-only') ? document.getElementById('gen-completed-only').checked : completedOnly;

      let eligibleTopics = [];
      if (subject.units) {
        subject.units.forEach(u => {
          if (u.topics) {
            u.topics.forEach(t => {
              if (!isCompletedOnly || t.status === 'completed') {
                eligibleTopics.push({ ...t, unitTitle: u.title });
              }
            });
          }
        });
      }

      if (eligibleTopics.length === 0) {
        container.innerHTML = `
          <div style="padding:14px; background:var(--warning-light); border-radius:var(--radius-sm); color:var(--warning-text); font-size:0.85rem;">
            ⚠️ <strong>No eligible topics found for this subject under "Completed Only".</strong><br>
            You have not marked any topics as "Completed" yet in this subject. 
            <a href="#" onclick="App.openSyllabusSubject(${subjectId}); return false;" style="color:var(--warning-text); font-weight:bold; text-decoration:underline;">
              Click here to go to the syllabus and mark topics completed
            </a>, or uncheck "Completed Topics Only" to generate from any topic.
          </div>
        `;
        document.getElementById('generate-btn').disabled = true;
        return;
      }

      document.getElementById('generate-btn').disabled = false;

      container.innerHTML = `
        <div style="font-size:0.85rem; font-weight:600; margin-bottom:8px; color:var(--text-main);">
          Available Eligible Topics (${eligibleTopics.length} available):
        </div>
        <div style="max-height:160px; overflow-y:auto; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:10px; display:flex; flex-direction:column; gap:6px;">
          ${eligibleTopics.map(t => `
            <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; cursor:pointer;">
              <input type="checkbox" name="selected-topic" value="${t.id}" checked>
              <span>${escapeHtml(t.title)}</span>
              <span style="font-size:0.72rem; color:var(--text-muted); margin-left:auto;">${escapeHtml(t.unitTitle)}</span>
            </label>
          `).join('')}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div style="color:var(--danger); font-size:0.85rem;">Error loading topics</div>`;
    }
  },

  async handleGenerate(e) {
    e.preventDefault();
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.innerHTML = '⏳ Synthesizing Syllabus Questions...';

    const subject_id = document.getElementById('gen-subject').value;
    const completed_only = document.getElementById('gen-completed-only').checked;
    const total_marks = document.getElementById('gen-marks').value;
    const num_questions = document.getElementById('gen-count').value;
    const difficulty = document.getElementById('gen-difficulty').value;
    const paper_title = document.getElementById('gen-title').value.trim();

    // Gather selected topics
    const topicCheckboxes = document.querySelectorAll('input[name="selected-topic"]:checked');
    const topic_ids = Array.from(topicCheckboxes).map(cb => Number(cb.value));

    // Gather question types
    const typeCheckboxes = document.querySelectorAll('input[name="q-type"]:checked');
    const question_types = Array.from(typeCheckboxes).map(cb => cb.value);

    try {
      const response = await API.papers.generate({
        subject_id: Number(subject_id),
        completed_only,
        topic_ids: topic_ids.length > 0 ? topic_ids : undefined,
        total_marks: Number(total_marks),
        num_questions: Number(num_questions),
        difficulty,
        question_types,
        paper_title: paper_title || undefined
      });

      this.currentPaper = response.paper;
      this.renderPaperPreview(response.paper);
      App.toast('Personalized question paper generated successfully!', 'success');
    } catch (err) {
      App.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✨ Generate My Paper';
    }
  },

  renderPaperPreview(paper) {
    document.getElementById('generator-screen').style.display = 'none';
    const resultScreen = document.getElementById('paper-result-screen');
    resultScreen.style.display = 'block';

    let sectionsHtml = '';
    if (paper.sections) {
      sectionsHtml = paper.sections.map(section => `
        <div class="exam-section">
          <div class="section-heading">
            <span>${escapeHtml(section.name)}</span>
            <span>[${section.totalMarks} Marks]</span>
          </div>
          <div style="font-style:italic; font-size:0.85rem; margin-bottom:12px; color:#475569;">
            ${escapeHtml(section.instructions || '')}
          </div>

          <div style="display:flex; flex-direction:column; gap:16px;">
            ${section.questions.map(q => `
              <div class="exam-question">
                <div class="q-header">
                  <div class="q-text">
                    <strong>Q${q.questionNumber}.</strong> ${escapeHtml(q.question)}
                    <span style="font-size:0.75rem; color:#64748b; margin-left:6px; font-family:var(--font-family);">
                      [Topic: ${escapeHtml(q.topic)}]
                    </span>
                  </div>
                  <div class="q-marks">[${q.marks} Mark${q.marks > 1 ? 's' : ''}]</div>
                </div>

                ${q.options && q.options.length > 0 ? `
                  <div class="mcq-options-grid">
                    ${q.options.map((opt, optIdx) => `
                      <div>
                        <strong>(${String.fromCharCode(65 + optIdx)})</strong> ${escapeHtml(opt)}
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

                <!-- Hidden / Expandable Solution Key -->
                <div class="q-answer-key" style="display:${this.showAnswerKeys ? 'block' : 'none'};">
                  <strong>Solution & Rubric:</strong> ${escapeHtml(q.answerKey || '')}
                  ${q.explanation ? `<div style="margin-top:4px; font-size:0.78rem;"><em>Notes:</em> ${escapeHtml(q.explanation)}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    }

    resultScreen.innerHTML = `
      <!-- Toolbar (Hidden on print) -->
      <div class="no-print" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <button class="btn btn-secondary" onclick="PaperGeneratorView.backToGenerator()">← Create Another Paper</button>
        
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="PaperGeneratorView.toggleSolutions()">
            ${this.showAnswerKeys ? '🙈 Hide Solution Key' : '👁️ Show Solution Key'}
          </button>
          <button class="btn btn-secondary" onclick="PaperGeneratorView.regenerateCurrentPaper(${paper.id})">
            🔄 Regenerate Questions
          </button>
          <button class="btn btn-secondary" onclick="window.print()">
            🖨️ Print / Save PDF
          </button>
          <button class="btn btn-primary" onclick="PaperGeneratorView.openRecordTestModal()">
            📝 Record Test Result
          </button>
        </div>
      </div>

      <!-- Formal Academic Exam Paper -->
      <div class="paper-preview-container">
        <div class="exam-header">
          <div class="exam-inst-name">StudyTrack Personalized Academic Assessment</div>
          <div class="exam-title">${escapeHtml(paper.title)}</div>
          
          <table class="exam-meta-table">
            <tr>
              <td><strong>Subject:</strong> ${escapeHtml(paper.subject)} ${paper.subjectCode ? `(${escapeHtml(paper.subjectCode)})` : ''}</td>
              <td style="text-align:right;"><strong>Date:</strong> ${paper.date}</td>
            </tr>
            <tr>
              <td><strong>Time Allowed:</strong> ${paper.timeAllowed}</td>
              <td style="text-align:right;"><strong>Maximum Marks:</strong> ${paper.totalMarks}</td>
            </tr>
          </table>
        </div>

        <div class="exam-instructions">
          <strong>General Instructions:</strong>
          <ul style="margin:4px 0 0 20px;">
            ${(paper.generalInstructions || []).map(inst => `<li>${escapeHtml(inst)}</li>`).join('')}
          </ul>
        </div>

        <!-- Exam Sections -->
        ${sectionsHtml}

        <div style="text-align:center; margin-top:32px; border-top:1px solid #000; padding-top:12px; font-weight:bold; letter-spacing:0.1em;">
          *** END OF QUESTION PAPER ***
        </div>
      </div>
    `;
  },

  backToGenerator() {
    document.getElementById('paper-result-screen').style.display = 'none';
    document.getElementById('generator-screen').style.display = 'block';
  },

  toggleSolutions() {
    this.showAnswerKeys = !this.showAnswerKeys;
    if (this.currentPaper) {
      this.renderPaperPreview(this.currentPaper);
    }
  },

  async regenerateCurrentPaper(paperId) {
    try {
      App.toast('Regenerating questions from your syllabus...', 'info');
      const response = await API.papers.regenerate(paperId);
      this.currentPaper = response.paper;
      this.renderPaperPreview(response.paper);
      App.toast('Questions regenerated successfully!', 'success');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openRecordTestModal() {
    if (!this.currentPaper) return;
    const paper = this.currentPaper;

    App.openModal(`
      <div class="modal-header">
        <h3 class="card-title">Record Test Result</h3>
        <button class="sidebar-action-btn" onclick="App.closeModal()">✕</button>
      </div>
      <form id="record-test-form" onsubmit="PaperGeneratorView.handleSaveTestResult(event)">
        <div class="modal-body">
          <div style="margin-bottom:14px; padding:12px; background:var(--bg-main); border-radius:var(--radius-sm); font-size:0.88rem;">
            <strong>Test:</strong> ${escapeHtml(paper.title)}<br>
            <strong>Subject:</strong> ${escapeHtml(paper.subject)}<br>
            <strong>Total Marks:</strong> ${paper.totalMarks}
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="form-group">
              <label class="form-label">Marks Obtained *</label>
              <input type="number" id="test-marks-obtained" class="form-input" min="0" max="${paper.totalMarks}" step="0.5" placeholder="e.g. 23" required autofocus>
            </div>
            <div class="form-group">
              <label class="form-label">Test Date *</label>
              <input type="date" id="test-date" class="form-input" value="${new Date().toISOString().slice(0, 10)}" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Remarks & Reflections</label>
            <input type="text" id="test-remarks" class="form-input" placeholder="e.g. Struggled with MOSFET saturation derivations">
          </div>

          <!-- Weak Topic Selection for Revision -->
          <div class="form-group" style="margin-top:16px;">
            <label class="form-label">Identify Weak Topics (Send to Revision List)</label>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:6px;">
              Select any topics where you lost marks. They will be automatically placed in your Revision Queue for re-testing:
            </div>
            <div style="max-height:140px; overflow-y:auto; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:8px; display:flex; flex-direction:column; gap:6px; background:var(--bg-input);">
              ${(paper.testedTopics || []).map(topicTitle => `
                <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                  <input type="checkbox" name="weak-topic-flag" value="${escapeHtml(topicTitle)}">
                  <span>${escapeHtml(topicTitle)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Test Score</button>
        </div>
      </form>
    `);
  },

  async handleSaveTestResult(e) {
    e.preventDefault();
    const paper = this.currentPaper;
    const marks_obtained = document.getElementById('test-marks-obtained').value;
    const test_date = document.getElementById('test-date').value;
    const remarks = document.getElementById('test-remarks').value;

    const weakCheckboxes = document.querySelectorAll('input[name="weak-topic-flag"]:checked');
    const weakTopicTitles = Array.from(weakCheckboxes).map(cb => cb.value);

    try {
      // Find subject and topic IDs
      const subjectDetail = await API.subjects.getOne(paper.subject_id);
      const weakTopicIds = [];

      if (subjectDetail && subjectDetail.units) {
        subjectDetail.units.forEach(u => {
          if (u.topics) {
            u.topics.forEach(t => {
              if (weakTopicTitles.includes(t.title)) {
                weakTopicIds.push(t.id);
              }
            });
          }
        });
      }

      await API.tests.record({
        paper_id: paper.id,
        subject_id: paper.subject_id,
        test_name: paper.title,
        test_date,
        total_marks: paper.totalMarks,
        marks_obtained: parseFloat(marks_obtained),
        remarks,
        topics_tested: paper.testedTopics,
        weak_topic_ids: weakTopicIds
      });

      App.closeModal();
      App.toast('Test results and weak topic revisions saved!', 'success');
      App.navigate('test-history');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};

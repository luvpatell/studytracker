const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generatePaper } = require('../services/paperGenerator');

router.use(authenticateToken);

// 1. Get all revision topics for the user
router.get('/', (req, res) => {
  try {
    const { status = 'active' } = req.query; // 'active', 'resolved', 'all'

    let query = `
      SELECT 
        r.id, r.topic_id, r.subject_id, r.test_id, r.reason, r.is_resolved, r.resolved_at, r.created_at,
        t.title AS topic_title, t.status AS topic_status,
        s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
        u.title AS unit_title,
        ts.test_name, ts.percentage AS test_score
      FROM revision_topics r
      JOIN topics t ON t.id = r.topic_id
      JOIN subjects s ON s.id = r.subject_id
      LEFT JOIN units u ON u.id = t.unit_id
      LEFT JOIN tests ts ON ts.id = r.test_id
      WHERE r.user_id = ?
    `;

    const params = [req.user.id];

    if (status === 'active') {
      query += ' AND r.is_resolved = 0';
    } else if (status === 'resolved') {
      query += ' AND r.is_resolved = 1';
    }

    query += ' ORDER BY r.is_resolved ASC, r.created_at DESC';

    const items = db.prepare(query).all(...params);
    res.json(items);
  } catch (err) {
    console.error('Error fetching revision topics:', err);
    res.status(500).json({ error: 'Failed to fetch revision list.' });
  }
});

// 2. Add a topic manually to the revision list
router.post('/', (req, res) => {
  try {
    const { topic_id, reason } = req.body;
    if (!topic_id) {
      return res.status(400).json({ error: 'Topic ID is required.' });
    }

    const topic = db.prepare('SELECT id, subject_id, title FROM topics WHERE id = ? AND user_id = ?').get(topic_id, req.user.id);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found.' });
    }

    // Check existing active revision
    const existing = db.prepare('SELECT id FROM revision_topics WHERE topic_id = ? AND user_id = ? AND is_resolved = 0').get(topic.id, req.user.id);
    if (existing) {
      return res.status(409).json({ error: 'Topic is already in the revision list.' });
    }

    const tx = db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO revision_topics (user_id, topic_id, subject_id, reason)
        VALUES (?, ?, ?, ?)
      `).run(req.user.id, topic.id, topic.subject_id, reason || 'Identified for targeted review');

      db.prepare(`UPDATE topics SET status = 'revision', updated_at = datetime('now') WHERE id = ?`).run(topic.id);
      return insert.lastInsertRowid;
    });

    const newId = tx();
    res.status(201).json({ message: 'Topic added to revision list.', id: newId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add revision topic.' });
  }
});

// 3. Mark revision item as resolved: Revision -> Completed
router.patch('/:id/resolve', (req, res) => {
  try {
    const revItem = db.prepare('SELECT id, topic_id FROM revision_topics WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!revItem) {
      return res.status(404).json({ error: 'Revision item not found.' });
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE revision_topics
        SET is_resolved = 1, resolved_at = datetime('now')
        WHERE id = ?
      `).run(revItem.id);

      db.prepare(`
        UPDATE topics
        SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(revItem.topic_id);
    });

    tx();
    res.json({ message: 'Revision topic marked as completed! Syllabus progress updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve revision topic.' });
  }
});

// 4. Delete revision topic
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM revision_topics WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Revision item not found.' });
    }
    res.json({ message: 'Revision item removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove revision item.' });
  }
});

// 5. Generate a dedicated Revision Question Paper from active revision topics
router.post('/generate-paper', (req, res) => {
  try {
    const { subject_id, total_marks = 25, difficulty = 'Mixed' } = req.body;

    let query = `
      SELECT t.id, t.title, s.id as subject_id, s.name as subject_name, s.code as subject_code
      FROM revision_topics r
      JOIN topics t ON t.id = r.topic_id
      JOIN subjects s ON s.id = r.subject_id
      WHERE r.user_id = ? AND r.is_resolved = 0
    `;
    const params = [req.user.id];

    if (subject_id) {
      query += ' AND r.subject_id = ?';
      params.push(subject_id);
    }

    const topics = db.prepare(query).all(...params);

    if (topics.length === 0) {
      return res.status(400).json({ error: 'No active revision topics found to generate a revision paper.' });
    }

    const subjectName = subject_id ? topics[0].subject_name : 'Multi-Subject Revision Assessment';
    const subjectCode = subject_id ? (topics[0].subject_code || '') : 'REV-ALL';

    const paperContent = generatePaper({
      topics: topics.map(t => t.title),
      subjectName: subjectName,
      subjectCode: subjectCode,
      totalMarks: Number(total_marks),
      numQuestions: Math.min(12, Math.max(4, topics.length * 2)),
      difficulty: difficulty,
      questionTypes: ['mcq', 'short', 'conceptual', 'descriptive'],
      paperTitle: `Targeted Revision Assessment — ${subjectName}`
    });

    const targetSubjectId = subject_id || topics[0].subject_id;

    const insert = db.prepare(`
      INSERT INTO question_papers (user_id, subject_id, title, total_marks, difficulty, question_types, topic_ids_json, paper_data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      targetSubjectId,
      paperContent.title,
      paperContent.totalMarks,
      difficulty,
      JSON.stringify(['mcq', 'short', 'conceptual', 'descriptive']),
      JSON.stringify(topics.map(t => t.id)),
      JSON.stringify(paperContent)
    );

    res.status(201).json({
      message: 'Revision paper generated successfully!',
      paper_id: insert.lastInsertRowid,
      paper: {
        id: insert.lastInsertRowid,
        ...paperContent
      }
    });
  } catch (err) {
    console.error('Error generating revision paper:', err);
    res.status(500).json({ error: 'Failed to generate revision paper.' });
  }
});

module.exports = router;

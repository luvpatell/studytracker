const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 1. Get all recorded tests for the user
router.get('/', (req, res) => {
  try {
    const tests = db.prepare(`
      SELECT 
        t.id, t.paper_id, t.test_name, t.test_date, t.total_marks, t.marks_obtained, 
        t.percentage, t.remarks, t.topics_tested_json, t.created_at,
        s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color
      FROM tests t
      JOIN subjects s ON s.id = t.subject_id
      WHERE t.user_id = ?
      ORDER BY t.test_date DESC, t.id DESC
    `).all(req.user.id);

    const formatted = tests.map(test => {
      let topics = [];
      try {
        topics = JSON.parse(test.topics_tested_json || '[]');
      } catch (e) {
        topics = [];
      }
      return {
        ...test,
        topics_tested: topics
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching tests:', err);
    res.status(500).json({ error: 'Failed to fetch test records.' });
  }
});

// 2. Get single test record with associated paper and weak topics
router.get('/:id', (req, res) => {
  try {
    const test = db.prepare(`
      SELECT 
        t.id, t.paper_id, t.test_name, t.test_date, t.total_marks, t.marks_obtained, 
        t.percentage, t.remarks, t.topics_tested_json, t.created_at,
        s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
        p.title AS paper_title, p.paper_data_json
      FROM tests t
      JOIN subjects s ON s.id = t.subject_id
      LEFT JOIN question_papers p ON p.id = t.paper_id
      WHERE t.id = ? AND t.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!test) {
      return res.status(404).json({ error: 'Test record not found.' });
    }

    let topicsTested = [];
    try {
      topicsTested = JSON.parse(test.topics_tested_json || '[]');
    } catch (e) {}

    let paperData = null;
    if (test.paper_data_json) {
      try {
        paperData = JSON.parse(test.paper_data_json);
      } catch (e) {}
    }

    // Check revision topics flagged from this test
    const weakTopics = db.prepare(`
      SELECT r.id, r.topic_id, r.reason, r.is_resolved, t.title AS topic_title
      FROM revision_topics r
      JOIN topics t ON t.id = r.topic_id
      WHERE r.test_id = ? AND r.user_id = ?
    `).all(test.id, req.user.id);

    res.json({
      ...test,
      paper_data_json: undefined,
      paper_data: paperData,
      topics_tested: topicsTested,
      flagged_weak_topics: weakTopics
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch test record.' });
  }
});

// 3. Record test score and optionally flag weak topics for revision
router.post('/', (req, res) => {
  try {
    const {
      paper_id,
      subject_id,
      test_name,
      test_date,
      total_marks,
      marks_obtained,
      remarks,
      topics_tested,
      weak_topic_ids = [] // IDs of topics that need revision based on student performance
    } = req.body;

    if (!subject_id || !test_name || !test_date || total_marks === undefined || marks_obtained === undefined) {
      return res.status(400).json({ error: 'Subject, test name, date, total marks, and marks obtained are required.' });
    }

    const tMarks = parseFloat(total_marks);
    const obMarks = parseFloat(marks_obtained);
    if (tMarks <= 0) {
      return res.status(400).json({ error: 'Total marks must be greater than zero.' });
    }

    const percentage = Math.round((obMarks / tMarks) * 1000) / 10; // e.g. 76.6%

    // Verify subject ownership
    const subject = db.prepare('SELECT id FROM subjects WHERE id = ? AND user_id = ?').get(subject_id, req.user.id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    const topicsJson = JSON.stringify(Array.isArray(topics_tested) ? topics_tested : []);

    const recordTx = db.transaction(() => {
      // 1. Insert test
      const testInsert = db.prepare(`
        INSERT INTO tests (user_id, paper_id, subject_id, test_name, test_date, total_marks, marks_obtained, percentage, remarks, topics_tested_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        paper_id || null,
        subject.id,
        test_name.trim(),
        test_date,
        tMarks,
        obMarks,
        percentage,
        remarks ? remarks.trim() : null,
        topicsJson
      );

      const testId = testInsert.lastInsertRowid;

      // 2. Process weak topics flagged for revision
      if (Array.isArray(weak_topic_ids) && weak_topic_ids.length > 0) {
        const revInsert = db.prepare(`
          INSERT INTO revision_topics (user_id, topic_id, subject_id, test_id, reason)
          VALUES (?, ?, ?, ?, ?)
        `);

        const updateTopicStatus = db.prepare(`
          UPDATE topics SET status = 'revision', updated_at = datetime('now')
          WHERE id = ? AND user_id = ?
        `);

        for (const topicId of weak_topic_ids) {
          const tRow = db.prepare('SELECT id, subject_id, title FROM topics WHERE id = ? AND user_id = ?').get(topicId, req.user.id);
          if (tRow) {
            // Check if already in active revision
            const activeRev = db.prepare('SELECT id FROM revision_topics WHERE topic_id = ? AND user_id = ? AND is_resolved = 0').get(tRow.id, req.user.id);
            if (!activeRev) {
              revInsert.run(
                req.user.id,
                tRow.id,
                tRow.subject_id,
                testId,
                `Score: ${percentage}% in test "${test_name.trim()}"`
              );
            }
            updateTopicStatus.run(tRow.id, req.user.id);
          }
        }
      }

      return testId;
    });

    const newTestId = recordTx();

    res.status(201).json({
      message: 'Test record and revision topics saved successfully!',
      test_id: newTestId,
      percentage
    });
  } catch (err) {
    console.error('Error saving test result:', err);
    res.status(500).json({ error: 'Failed to record test result.' });
  }
});

// 4. Delete a test record
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM tests WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Test record not found.' });
    }
    res.json({ message: 'Test record deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete test record.' });
  }
});

module.exports = router;

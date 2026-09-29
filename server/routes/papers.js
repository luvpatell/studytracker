const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generatePaper } = require('../services/paperGenerator');

router.use(authenticateToken);

// 1. Generate a personalized question paper
router.post('/generate', (req, res) => {
  try {
    const {
      subject_id,
      completed_only = true,
      topic_ids,
      unit_ids,
      total_marks = 30,
      num_questions = 8,
      difficulty = 'Medium',
      question_types = ['mcq', 'short', 'conceptual', 'descriptive'],
      paper_title
    } = req.body;

    if (!subject_id) {
      return res.status(400).json({ error: 'Subject ID is required.' });
    }

    // Check subject ownership
    const subject = db.prepare('SELECT id, name, code FROM subjects WHERE id = ? AND user_id = ?').get(subject_id, req.user.id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    // Build topics query respecting the strict rule
    let query = `
      SELECT t.id, t.title, t.status, t.unit_id
      FROM topics t
      WHERE t.subject_id = ? AND t.user_id = ?
    `;
    const params = [subject.id, req.user.id];

    // CRITICAL RULE 9: "If a topic has NOT been completed, it should NOT be included when the user selects 'Completed Topics Only'"
    if (completed_only === true || completed_only === 'true') {
      query += ` AND t.status = 'completed'`;
    }

    if (Array.isArray(unit_ids) && unit_ids.length > 0) {
      const placeholders = unit_ids.map(() => '?').join(',');
      query += ` AND t.unit_id IN (${placeholders})`;
      params.push(...unit_ids.map(Number));
    }

    if (Array.isArray(topic_ids) && topic_ids.length > 0) {
      const placeholders = topic_ids.map(() => '?').join(',');
      query += ` AND t.id IN (${placeholders})`;
      params.push(...topic_ids.map(Number));
    }

    const eligibleTopics = db.prepare(query).all(...params);

    if (eligibleTopics.length === 0) {
      if (completed_only) {
        return res.status(400).json({
          error: 'No completed topics found in this subject or selection. To generate a paper, please mark topics as Completed in your syllabus or daily study log first!'
        });
      }
      return res.status(400).json({
        error: 'No topics found matching your criteria. Please ensure your syllabus has topics added.'
      });
    }

    const topicTitles = eligibleTopics.map(t => t.title);
    const chosenTopicIds = eligibleTopics.map(t => t.id);

    // Generate paper content
    const paperContent = generatePaper({
      topics: topicTitles,
      subjectName: subject.name,
      subjectCode: subject.code,
      totalMarks: Number(total_marks),
      numQuestions: Number(num_questions),
      difficulty: difficulty,
      questionTypes: Array.isArray(question_types) ? question_types : ['mcq', 'short', 'descriptive'],
      paperTitle: paper_title
    });

    // Save paper to DB
    const insert = db.prepare(`
      INSERT INTO question_papers (user_id, subject_id, title, total_marks, difficulty, question_types, topic_ids_json, paper_data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      subject.id,
      paperContent.title,
      paperContent.totalMarks,
      difficulty,
      JSON.stringify(question_types),
      JSON.stringify(chosenTopicIds),
      JSON.stringify(paperContent)
    );

    res.status(201).json({
      message: 'Question paper generated successfully!',
      paper_id: insert.lastInsertRowid,
      paper: {
        id: insert.lastInsertRowid,
        ...paperContent
      }
    });
  } catch (err) {
    console.error('Error generating paper:', err);
    res.status(500).json({ error: err.message || 'Failed to generate question paper.' });
  }
});

// 2. List saved question papers
router.get('/', (req, res) => {
  try {
    const papers = db.prepare(`
      SELECT 
        p.id, p.subject_id, p.title, p.total_marks, p.difficulty, p.created_at,
        s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
        (SELECT COUNT(*) FROM tests t WHERE t.paper_id = p.id) as test_count
      FROM question_papers p
      JOIN subjects s ON s.id = p.subject_id
      WHERE p.user_id = ?
      ORDER BY p.id DESC
    `).all(req.user.id);

    res.json(papers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch saved question papers.' });
  }
});

// 3. Get single saved question paper
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT 
        p.id, p.subject_id, p.title, p.total_marks, p.difficulty, p.question_types, p.paper_data_json, p.created_at,
        s.name AS subject_name, s.code AS subject_code, s.color AS subject_color
      FROM question_papers p
      JOIN subjects s ON s.id = p.subject_id
      WHERE p.id = ? AND p.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!row) {
      return res.status(404).json({ error: 'Question paper not found.' });
    }

    const paperData = JSON.parse(row.paper_data_json);
    res.json({
      id: row.id,
      subject_id: row.subject_id,
      subject_name: row.subject_name,
      subject_code: row.subject_code,
      subject_color: row.subject_color,
      created_at: row.created_at,
      ...paperData
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve question paper.' });
  }
});

// 4. Regenerate a paper based on existing paper settings
router.post('/regenerate/:id', (req, res) => {
  try {
    const existing = db.prepare(`
      SELECT * FROM question_papers WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Question paper not found.' });
    }

    const subject = db.prepare('SELECT id, name, code FROM subjects WHERE id = ?').get(existing.subject_id);
    const topicIds = JSON.parse(existing.topic_ids_json || '[]');
    const questionTypes = JSON.parse(existing.question_types || '[]');

    let topics = [];
    if (topicIds.length > 0) {
      const placeholders = topicIds.map(() => '?').join(',');
      topics = db.prepare(`SELECT title FROM topics WHERE id IN (${placeholders}) AND user_id = ?`).all(...topicIds, req.user.id);
    } else {
      topics = db.prepare(`SELECT title FROM topics WHERE subject_id = ? AND user_id = ? AND status = 'completed'`).all(subject.id, req.user.id);
    }

    if (topics.length === 0) {
      return res.status(400).json({ error: 'No topics available for regeneration.' });
    }

    const newPaper = generatePaper({
      topics: topics.map(t => t.title),
      subjectName: subject.name,
      subjectCode: subject.code,
      totalMarks: existing.total_marks,
      difficulty: existing.difficulty,
      questionTypes: questionTypes,
      paperTitle: existing.title
    });

    db.prepare(`
      UPDATE question_papers
      SET paper_data_json = ?, total_marks = ?, created_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(newPaper), newPaper.totalMarks, existing.id);

    res.json({
      message: 'Paper regenerated with fresh questions!',
      paper_id: existing.id,
      paper: {
        id: existing.id,
        ...newPaper
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to regenerate question paper.' });
  }
});

// 5. Delete a question paper
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM question_papers WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Question paper not found.' });
    }
    res.json({ message: 'Question paper deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question paper.' });
  }
});

module.exports = router;

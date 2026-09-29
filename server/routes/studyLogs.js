const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 1. Get study logs with filtering
router.get('/', (req, res) => {
  try {
    const { subject_id, status, startDate, endDate, search, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        l.id, l.study_date, l.duration_minutes, l.status, l.note, l.created_at,
        s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
        u.id AS unit_id, u.title AS unit_title, u.unit_number,
        t.id AS topic_id, t.title AS topic_title
      FROM study_logs l
      JOIN subjects s ON s.id = l.subject_id AND s.user_id = l.user_id
      LEFT JOIN units u ON u.id = l.unit_id AND u.user_id = l.user_id
      JOIN topics t ON t.id = l.topic_id AND t.user_id = l.user_id
      WHERE l.user_id = ?
    `;

    const params = [req.user.id];

    if (subject_id) {
      query += ` AND l.subject_id = ?`;
      params.push(Number(subject_id));
    }

    if (status && status !== 'all') {
      query += ` AND lower(l.status) = lower(?)`;
      params.push(status.trim());
    }

    if (startDate) {
      query += ` AND l.study_date >= ?`;
      params.push(startDate.trim());
    }

    if (endDate) {
      query += ` AND l.study_date <= ?`;
      params.push(endDate.trim());
    }

    if (search && search.trim()) {
      query += ` AND (t.title LIKE ? OR l.note LIKE ? OR s.name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY l.study_date DESC, l.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const logs = db.prepare(query).all(...params);

    // Group logs by date for display convenience if desired
    res.json(logs);
  } catch (err) {
    console.error('Error fetching study logs:', err);
    res.status(500).json({ error: 'Failed to fetch study logs.' });
  }
});

// 2. Record / Log a study session
router.post('/', (req, res) => {
  try {
    const { subject_id, unit_id, topic_id, study_date, duration_minutes, status, note } = req.body;

    if (!subject_id || !topic_id || !study_date || !status) {
      return res.status(400).json({ error: 'Subject, topic, study date, and status are required.' });
    }

    // Verify ownership
    const topic = db.prepare(`
      SELECT t.id, t.unit_id, t.subject_id, t.title
      FROM topics t
      WHERE t.id = ? AND t.user_id = ?
    `).get(topic_id, req.user.id);

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found or does not belong to you.' });
    }

    const effectiveUnitId = unit_id || topic.unit_id;
    const duration = Math.max(0, parseInt(duration_minutes, 10) || 0);

    // Map status into standard topic status
    const statusMap = {
      'not started': 'not_started',
      'not_started': 'not_started',
      'in progress': 'in_progress',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'revision': 'revision'
    };
    const normalizedStatus = statusMap[status.toLowerCase()] || 'completed';

    const insertTx = db.transaction(() => {
      // 1. Insert log
      const logInsert = db.prepare(`
        INSERT INTO study_logs (user_id, subject_id, unit_id, topic_id, study_date, duration_minutes, status, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        topic.subject_id,
        effectiveUnitId,
        topic.id,
        study_date,
        duration,
        status, // keep user-entered casing
        note ? note.trim() : null
      );

      // 2. Update topic status
      db.prepare(`
        UPDATE topics
        SET status = ?,
            completed_at = CASE WHEN ? = 'completed' THEN coalesce(completed_at, datetime('now')) ELSE NULL END,
            updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(normalizedStatus, normalizedStatus, topic.id, req.user.id);

      // 3. If marked for revision, add to revision_topics list if not already active
      if (normalizedStatus === 'revision') {
        const existingRev = db.prepare(`
          SELECT id FROM revision_topics
          WHERE user_id = ? AND topic_id = ? AND is_resolved = 0
        `).get(req.user.id, topic.id);

        if (!existingRev) {
          db.prepare(`
            INSERT INTO revision_topics (user_id, topic_id, subject_id, reason)
            VALUES (?, ?, ?, ?)
          `).run(req.user.id, topic.id, topic.subject_id, note || 'Flagged during study session');
        }
      }

      return logInsert.lastInsertRowid;
    });

    const newLogId = insertTx();

    const createdLog = db.prepare(`
      SELECT 
        l.id, l.study_date, l.duration_minutes, l.status, l.note, l.created_at,
        s.id AS subject_id, s.name AS subject_name, s.color AS subject_color,
        u.id AS unit_id, u.title AS unit_title,
        t.id AS topic_id, t.title AS topic_title
      FROM study_logs l
      JOIN subjects s ON s.id = l.subject_id
      LEFT JOIN units u ON u.id = l.unit_id
      JOIN topics t ON t.id = l.topic_id
      WHERE l.id = ?
    `).get(newLogId);

    res.status(201).json({
      message: 'Study session recorded and progress updated.',
      log: createdLog
    });
  } catch (err) {
    console.error('Error recording study log:', err);
    res.status(500).json({ error: 'Failed to record study log.' });
  }
});

// 3. Delete a study log
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM study_logs WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Log entry not found.' });
    }
    res.json({ message: 'Study log removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete study log.' });
  }
});

module.exports = router;

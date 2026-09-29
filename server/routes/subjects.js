const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 1. Get all subjects for current user with computed progress stats
router.get('/', (req, res) => {
  try {
    const subjects = db.prepare(`
      SELECT 
        s.id, s.name, s.code, s.color, s.created_at,
        COUNT(DISTINCT u.id) AS total_units,
        COUNT(DISTINCT t.id) AS total_topics,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_topics,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_topics,
        SUM(CASE WHEN t.status = 'revision' THEN 1 ELSE 0 END) AS revision_topics,
        SUM(CASE WHEN t.status = 'not_started' OR t.status IS NULL THEN 1 ELSE 0 END) AS not_started_topics
      FROM subjects s
      LEFT JOIN units u ON u.subject_id = s.id AND u.user_id = s.user_id
      LEFT JOIN topics t ON t.unit_id = u.id AND t.user_id = s.user_id
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.id ASC
    `).all(req.user.id);

    const formatted = subjects.map(s => {
      const total = s.total_topics || 0;
      const completed = s.completed_topics || 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        ...s,
        total_units: Number(s.total_units || 0),
        total_topics: total,
        completed_topics: completed,
        in_progress_topics: Number(s.in_progress_topics || 0),
        revision_topics: Number(s.revision_topics || 0),
        not_started_topics: Number(s.not_started_topics || 0),
        progress_percentage: progress
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: 'Failed to fetch subjects.' });
  }
});

// 2. Get full details of a specific subject (including units and topics)
router.get('/:id', (req, res) => {
  try {
    const subject = db.prepare(`
      SELECT id, name, code, color, created_at
      FROM subjects
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    const units = db.prepare(`
      SELECT id, unit_number, title, created_at
      FROM units
      WHERE subject_id = ? AND user_id = ?
      ORDER BY unit_number ASC, id ASC
    `).all(subject.id, req.user.id);

    const topics = db.prepare(`
      SELECT id, unit_id, title, status, order_index, completed_at, updated_at
      FROM topics
      WHERE subject_id = ? AND user_id = ?
      ORDER BY order_index ASC, id ASC
    `).all(subject.id, req.user.id);

    // Group topics by unit
    const unitsWithTopics = units.map(u => {
      const unitTopics = topics.filter(t => t.unit_id === u.id);
      const total = unitTopics.length;
      const completed = unitTopics.filter(t => t.status === 'completed').length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        ...u,
        total_topics: total,
        completed_topics: completed,
        progress_percentage: progress,
        topics: unitTopics
      };
    });

    const totalTopics = topics.length;
    const completedTopics = topics.filter(t => t.status === 'completed').length;
    const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    res.json({
      ...subject,
      total_topics: totalTopics,
      completed_topics: completedTopics,
      progress_percentage: progress,
      units: unitsWithTopics
    });
  } catch (err) {
    console.error('Error fetching subject detail:', err);
    res.status(500).json({ error: 'Failed to fetch subject details.' });
  }
});

// 3. Create a new subject
router.post('/', (req, res) => {
  try {
    const { name, code, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Subject name is required.' });
    }

    const insert = db.prepare(`
      INSERT INTO subjects (user_id, name, code, color)
      VALUES (?, ?, ?, ?)
    `).run(
      req.user.id,
      name.trim(),
      code ? code.trim() : null,
      color || '#4f46e5'
    );

    const created = db.prepare('SELECT * FROM subjects WHERE id = ?').get(insert.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subject.' });
  }
});

// 4. Update a subject
router.put('/:id', (req, res) => {
  try {
    const { name, code, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Subject name is required.' });
    }

    const result = db.prepare(`
      UPDATE subjects
      SET name = ?, code = ?, color = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(name.trim(), code ? code.trim() : null, color || '#4f46e5', req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    const updated = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subject.' });
  }
});

// 5. Delete a subject
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM subjects WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Subject not found.' });
    }
    res.json({ message: 'Subject deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subject.' });
  }
});

// 6. Add a unit to a subject
router.post('/:id/units', (req, res) => {
  try {
    const subject = db.prepare('SELECT id FROM subjects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    const { title, unit_number } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Unit title is required.' });
    }

    // Determine unit number if not given
    let num = unit_number;
    if (!num) {
      const maxUnit = db.prepare('SELECT MAX(unit_number) as max_num FROM units WHERE subject_id = ?').get(subject.id);
      num = (maxUnit && maxUnit.max_num ? maxUnit.max_num : 0) + 1;
    }

    const insert = db.prepare(`
      INSERT INTO units (subject_id, user_id, unit_number, title)
      VALUES (?, ?, ?, ?)
    `).run(subject.id, req.user.id, num, title.trim());

    const created = db.prepare('SELECT * FROM units WHERE id = ?').get(insert.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add unit.' });
  }
});

// 7. Update a unit
router.put('/units/:unitId', (req, res) => {
  try {
    const { title, unit_number } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Unit title is required.' });
    }

    const result = db.prepare(`
      UPDATE units
      SET title = ?, unit_number = coalesce(?, unit_number)
      WHERE id = ? AND user_id = ?
    `).run(title.trim(), unit_number || null, req.params.unitId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Unit not found.' });
    }

    const updated = db.prepare('SELECT * FROM units WHERE id = ?').get(req.params.unitId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update unit.' });
  }
});

// 8. Delete a unit
router.delete('/units/:unitId', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM units WHERE id = ? AND user_id = ?').run(req.params.unitId, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Unit not found.' });
    }
    res.json({ message: 'Unit and associated topics deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete unit.' });
  }
});

// 9. Add topic(s) to a unit (supports single, array, or bulk newline-separated string)
router.post('/units/:unitId/topics', (req, res) => {
  try {
    const unit = db.prepare('SELECT id, subject_id FROM units WHERE id = ? AND user_id = ?').get(req.params.unitId, req.user.id);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found.' });
    }

    const { title, titles, bulk_text } = req.body;
    let topicList = [];

    if (Array.isArray(titles)) {
      topicList = titles.map(t => String(t).trim()).filter(Boolean);
    } else if (bulk_text && typeof bulk_text === 'string') {
      topicList = bulk_text
        .split('\n')
        .map(t => t.replace(/^[-*•0-9.)\s]+/, '').trim())
        .filter(Boolean);
    } else if (title && typeof title === 'string') {
      topicList = [title.trim()];
    }

    if (topicList.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one topic title.' });
    }

    const maxOrder = db.prepare('SELECT MAX(order_index) as max_o FROM topics WHERE unit_id = ?').get(unit.id);
    let orderIndex = (maxOrder && maxOrder.max_o ? maxOrder.max_o : 0) + 1;

    const insertStmt = db.prepare(`
      INSERT INTO topics (unit_id, subject_id, user_id, title, status, order_index)
      VALUES (?, ?, ?, ?, 'not_started', ?)
    `);

    const createdTopics = [];
    const insertMany = db.transaction((list) => {
      for (const t of list) {
        const info = insertStmt.run(unit.id, unit.subject_id, req.user.id, t, orderIndex++);
        createdTopics.push(db.prepare('SELECT * FROM topics WHERE id = ?').get(info.lastInsertRowid));
      }
    });

    insertMany(topicList);
    res.status(201).json(createdTopics);
  } catch (err) {
    console.error('Error adding topics:', err);
    res.status(500).json({ error: 'Failed to add topics.' });
  }
});

// 10. Update a topic title
router.put('/topics/:topicId', (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Topic title is required.' });
    }

    const result = db.prepare(`
      UPDATE topics
      SET title = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(title.trim(), req.params.topicId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Topic not found.' });
    }

    const updated = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.topicId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update topic.' });
  }
});

// 11. Update topic status (not_started, in_progress, completed, revision)
router.patch('/topics/:topicId/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['not_started', 'in_progress', 'completed', 'revision'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    const result = db.prepare(`
      UPDATE topics
      SET status = ?, 
          completed_at = CASE WHEN ? = 'completed' THEN coalesce(completed_at, datetime('now')) ELSE NULL END,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(status, status, req.params.topicId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Topic not found.' });
    }

    const updated = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.topicId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update topic status.' });
  }
});

// 12. Delete a topic
router.delete('/topics/:topicId', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM topics WHERE id = ? AND user_id = ?').run(req.params.topicId, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Topic not found.' });
    }
    res.json({ message: 'Topic deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete topic.' });
  }
});

// 13. One-click Sample Syllabus Loader (VLSI, AI/ML, Mobile Communication, IoT)
router.post('/seed-sample', (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has subjects
    const existing = db.prepare('SELECT COUNT(*) as count FROM subjects WHERE user_id = ?').get(userId);
    if (existing.count > 0) {
      return res.status(400).json({ error: 'You already have subjects configured. Create custom subjects or delete existing ones first.' });
    }

    const seedTx = db.transaction(() => {
      // 1. VLSI
      const vlsiId = db.prepare(`
        INSERT INTO subjects (user_id, name, code, color)
        VALUES (?, 'VLSI Design', 'EC801', '#4f46e5')
      `).run(userId).lastInsertRowid;

      const u1 = db.prepare(`INSERT INTO units (subject_id, user_id, unit_number, title) VALUES (?, ?, 1, 'Unit 1: MOS Transistor Theory')`).run(vlsiId, userId).lastInsertRowid;
      const u2 = db.prepare(`INSERT INTO units (subject_id, user_id, unit_number, title) VALUES (?, ?, 2, 'Unit 2: MOSFET Characteristics & Scaling')`).run(vlsiId, userId).lastInsertRowid;
      const u3 = db.prepare(`INSERT INTO units (subject_id, user_id, unit_number, title) VALUES (?, ?, 3, 'Unit 3: Advanced Device Architectures')`).run(vlsiId, userId).lastInsertRowid;

      const addTopic = db.prepare(`INSERT INTO topics (unit_id, subject_id, user_id, title, status, order_index, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);

      // Unit 1 topics
      addTopic.run(u1, vlsiId, userId, 'Energy Band Diagram', 'completed', 1, new Date().toISOString());
      addTopic.run(u1, vlsiId, userId, 'MOS under Bias', 'completed', 2, new Date().toISOString());
      addTopic.run(u1, vlsiId, userId, 'MOSFET Symbols', 'completed', 3, new Date().toISOString());
      addTopic.run(u1, vlsiId, userId, 'MOSFET Operation', 'completed', 4, new Date().toISOString());

      // Unit 2 topics
      addTopic.run(u2, vlsiId, userId, 'Channel Formation', 'completed', 1, new Date().toISOString());
      addTopic.run(u2, vlsiId, userId, 'Gradual Channel Approximation', 'in_progress', 2, null);
      addTopic.run(u2, vlsiId, userId, 'MOSFET I-V Characteristics', 'revision', 3, null);
      addTopic.run(u2, vlsiId, userId, 'Scaling', 'completed', 4, new Date().toISOString());

      // Unit 3 topics
      addTopic.run(u3, vlsiId, userId, 'SOI', 'not_started', 1, null);
      addTopic.run(u3, vlsiId, userId, 'High-K Metal Gate', 'not_started', 2, null);
      addTopic.run(u3, vlsiId, userId, 'FinFET', 'completed', 3, new Date().toISOString());
      addTopic.run(u3, vlsiId, userId, 'GAA FET', 'not_started', 4, null);

      // 2. Mobile Communication
      const mcId = db.prepare(`
        INSERT INTO subjects (user_id, name, code, color)
        VALUES (?, 'Mobile Communication', 'EC802', '#0ea5e9')
      `).run(userId).lastInsertRowid;

      const mcu1 = db.prepare(`INSERT INTO units (subject_id, user_id, unit_number, title) VALUES (?, ?, 1, 'Unit 1: Cellular Concepts & System Design')`).run(mcId, userId).lastInsertRowid;
      const mcu2 = db.prepare(`INSERT INTO units (subject_id, user_id, unit_number, title) VALUES (?, ?, 2, 'Unit 2: Mobile Radio Propagation')`).run(mcId, userId).lastInsertRowid;

      addTopic.run(mcu1, mcId, userId, 'Cellular Concept', 'completed', 1, new Date().toISOString());
      addTopic.run(mcu1, mcId, userId, 'Frequency Reuse', 'completed', 2, new Date().toISOString());
      addTopic.run(mcu1, mcId, userId, 'Handoff Strategies', 'completed', 3, new Date().toISOString());
      addTopic.run(mcu1, mcId, userId, 'Interference & System Capacity', 'not_started', 4, null);

      addTopic.run(mcu2, mcId, userId, 'Free Space Propagation Model', 'in_progress', 1, null);
      addTopic.run(mcu2, mcId, userId, 'Multipath Fading', 'not_started', 2, null);

      // 3. AI / Machine Learning
      const aiId = db.prepare(`
        INSERT INTO subjects (user_id, name, code, color)
        VALUES (?, 'AI / Machine Learning', 'CS701', '#8b5cf6')
      `).run(userId).lastInsertRowid;

      const aiu1 = db.prepare(`INSERT INTO units (subject_id, user_id, unit_number, title) VALUES (?, ?, 1, 'Unit 1: Foundations & Supervised Learning')`).run(aiId, userId).lastInsertRowid;
      addTopic.run(aiu1, aiId, userId, 'NumPy and Vectorized Math', 'completed', 1, new Date().toISOString());
      addTopic.run(aiu1, aiId, userId, 'Linear Regression & Cost Functions', 'completed', 2, new Date().toISOString());
      addTopic.run(aiu1, aiId, userId, 'Logistic Regression & Classification', 'completed', 3, new Date().toISOString());
      addTopic.run(aiu1, aiId, userId, 'Decision Trees and Random Forests', 'not_started', 4, null);

      // 4. Internet of Things (IoT)
      const iotId = db.prepare(`
        INSERT INTO subjects (user_id, name, code, color)
        VALUES (?, 'Internet of Things (IoT)', 'EC704', '#10b981')
      `).run(userId).lastInsertRowid;

      const iotu1 = db.prepare(`INSERT INTO units (subject_id, user_id, unit_number, title) VALUES (?, ?, 1, 'Unit 1: Microcontrollers & Sensors')`).run(iotId, userId).lastInsertRowid;
      addTopic.run(iotu1, iotId, userId, 'ESP32 basics and GPIO', 'completed', 1, new Date().toISOString());
      addTopic.run(iotu1, iotId, userId, 'MQTT Protocol & Cloud Brokers', 'in_progress', 2, null);
      addTopic.run(iotu1, iotId, userId, 'Sensor Interfacing & ADC', 'not_started', 3, null);

      // Seed some initial study logs so the user sees immediate historical tracking
      const logInsert = db.prepare(`
        INSERT INTO study_logs (user_id, subject_id, unit_id, topic_id, study_date, duration_minutes, status, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10);

      // Fetch some topic IDs for logs
      const tMosfet = db.prepare('SELECT id, unit_id, subject_id FROM topics WHERE title = ? AND user_id = ?').get('MOSFET Operation', userId);
      const tNumPy = db.prepare('SELECT id, unit_id, subject_id FROM topics WHERE title = ? AND user_id = ?').get('NumPy and Vectorized Math', userId);
      const tEsp = db.prepare('SELECT id, unit_id, subject_id FROM topics WHERE title = ? AND user_id = ?').get('ESP32 basics and GPIO', userId);
      const tChannel = db.prepare('SELECT id, unit_id, subject_id FROM topics WHERE title = ? AND user_id = ?').get('Channel Formation', userId);

      if (tMosfet) logInsert.run(userId, tMosfet.subject_id, tMosfet.unit_id, tMosfet.id, today, 80, 'Completed', 'Understood cutoff, triode, and saturation regions.');
      if (tNumPy) logInsert.run(userId, tNumPy.subject_id, tNumPy.unit_id, tNumPy.id, today, 45, 'Completed', 'Practiced broadcasting and array manipulations.');
      if (tEsp) logInsert.run(userId, tEsp.subject_id, tEsp.unit_id, tEsp.id, yesterday, 60, 'Completed', 'Wrote blink and button interrupt scripts.');
      if (tChannel) logInsert.run(userId, tChannel.subject_id, tChannel.unit_id, tChannel.id, twoDaysAgo, 40, 'In Progress', 'Need to review inversion layer carrier concentration.');
    });

    seedTx();
    res.json({ message: 'Sample syllabus loaded successfully!' });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Failed to seed sample syllabus.' });
  }
});

module.exports = router;

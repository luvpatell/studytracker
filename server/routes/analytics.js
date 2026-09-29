const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 1. Dashboard summary stats
router.get('/dashboard', (req, res) => {
  try {
    const userId = req.user.id;

    // Total counts across all subjects
    const counts = db.prepare(`
      SELECT 
        COUNT(DISTINCT s.id) AS total_subjects,
        COUNT(DISTINCT t.id) AS total_topics,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_topics,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_topics,
        SUM(CASE WHEN t.status = 'revision' THEN 1 ELSE 0 END) AS revision_topics,
        SUM(CASE WHEN t.status = 'not_started' OR t.status IS NULL THEN 1 ELSE 0 END) AS not_started_topics
      FROM subjects s
      LEFT JOIN topics t ON t.subject_id = s.id AND t.user_id = s.user_id
      WHERE s.user_id = ?
    `).get(userId);

    const totalTopics = counts.total_topics || 0;
    const completedTopics = counts.completed_topics || 0;
    const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    // Subject-wise progress
    const subjectProgress = db.prepare(`
      SELECT 
        s.id, s.name, s.code, s.color,
        COUNT(t.id) AS total_topics,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_topics,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_topics,
        SUM(CASE WHEN t.status = 'revision' THEN 1 ELSE 0 END) AS revision_topics,
        SUM(CASE WHEN t.status = 'not_started' OR t.status IS NULL THEN 1 ELSE 0 END) AS not_started_topics
      FROM subjects s
      LEFT JOIN topics t ON t.subject_id = s.id AND t.user_id = s.user_id
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.id ASC
    `).all(userId).map(s => {
      const tot = s.total_topics || 0;
      const comp = s.completed_topics || 0;
      return {
        ...s,
        progress_percentage: tot > 0 ? Math.round((comp / tot) * 100) : 0
      };
    });

    // Recent study logs (last 5)
    const recentLogs = db.prepare(`
      SELECT 
        l.id, l.study_date, l.duration_minutes, l.status, l.note,
        s.name AS subject_name, s.color AS subject_color,
        t.title AS topic_title
      FROM study_logs l
      JOIN subjects s ON s.id = l.subject_id
      JOIN topics t ON t.id = l.topic_id
      WHERE l.user_id = ?
      ORDER BY l.study_date DESC, l.id DESC
      LIMIT 5
    `).all(userId);

    // Recent test scores (last 5)
    const recentTests = db.prepare(`
      SELECT 
        t.id, t.test_name, t.test_date, t.total_marks, t.marks_obtained, t.percentage,
        s.name AS subject_name, s.color AS subject_color
      FROM tests t
      JOIN subjects s ON s.id = t.subject_id
      WHERE t.user_id = ?
      ORDER BY t.test_date DESC, t.id DESC
      LIMIT 5
    `).all(userId);

    // Total study time all-time (in minutes)
    const studyTimeResult = db.prepare(`
      SELECT COALESCE(SUM(duration_minutes), 0) AS total_minutes
      FROM study_logs
      WHERE user_id = ?
    `).get(userId);

    res.json({
      overall: {
        total_subjects: counts.total_subjects || 0,
        total_topics: totalTopics,
        completed_topics: completedTopics,
        in_progress_topics: counts.in_progress_topics || 0,
        revision_topics: counts.revision_topics || 0,
        remaining_topics: counts.not_started_topics || 0,
        progress_percentage: overallProgress,
        total_study_minutes: studyTimeResult.total_minutes
      },
      subjects: subjectProgress,
      recent_logs: recentLogs,
      recent_tests: recentTests
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics.' });
  }
});

// 2. Weekly review
router.get('/weekly-review', (req, res) => {
  try {
    const userId = req.user.id;

    // Calculate dates for current week (last 7 days) and previous week (day 8 to 14 ago)
    const now = new Date();
    const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const previousWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    // Current week stats
    const curWeekStats = db.prepare(`
      SELECT 
        COUNT(id) AS total_sessions,
        COALESCE(SUM(duration_minutes), 0) AS total_minutes,
        COUNT(DISTINCT topic_id) AS distinct_topics_studied
      FROM study_logs
      WHERE user_id = ? AND study_date >= ? AND study_date <= ?
    `).get(userId, currentWeekStart, todayStr);

    // Previous week stats
    const prevWeekStats = db.prepare(`
      SELECT 
        COUNT(id) AS total_sessions,
        COALESCE(SUM(duration_minutes), 0) AS total_minutes,
        COUNT(DISTINCT topic_id) AS distinct_topics_studied
      FROM study_logs
      WHERE user_id = ? AND study_date >= ? AND study_date < ?
    `).get(userId, previousWeekStart, currentWeekStart);

    // Topics completed during this week (by logs or completed_at)
    const completedThisWeek = db.prepare(`
      SELECT DISTINCT 
        t.id, t.title, s.name AS subject_name, s.color AS subject_color, l.study_date
      FROM study_logs l
      JOIN topics t ON t.id = l.topic_id
      JOIN subjects s ON s.id = l.subject_id
      WHERE l.user_id = ? AND lower(l.status) = 'completed' AND l.study_date >= ? AND l.study_date <= ?
      ORDER BY l.study_date DESC
    `).all(userId, currentWeekStart, todayStr);

    // Topics marked for revision this week
    const revisionThisWeek = db.prepare(`
      SELECT DISTINCT 
        r.id, t.title AS topic_title, s.name AS subject_name, s.color AS subject_color, r.reason, r.created_at
      FROM revision_topics r
      JOIN topics t ON t.id = r.topic_id
      JOIN subjects s ON s.id = r.subject_id
      WHERE r.user_id = ? AND date(r.created_at) >= ?
      ORDER BY r.created_at DESC
    `).all(userId, currentWeekStart);

    // Subject breakdown for this week
    const subjectBreakdown = db.prepare(`
      SELECT 
        s.id, s.name, s.color,
        COALESCE(SUM(l.duration_minutes), 0) AS minutes_studied,
        COUNT(l.id) AS sessions_count,
        COUNT(DISTINCT CASE WHEN lower(l.status) = 'completed' THEN l.topic_id END) AS topics_completed
      FROM subjects s
      LEFT JOIN study_logs l ON l.subject_id = s.id AND l.study_date >= ? AND l.study_date <= ?
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY minutes_studied DESC
    `).all(currentWeekStart, todayStr, userId);

    // Overall current status
    const overallCounts = db.prepare(`
      SELECT 
        COUNT(t.id) AS total_topics,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_topics,
        SUM(CASE WHEN t.status != 'completed' OR t.status IS NULL THEN 1 ELSE 0 END) AS remaining_topics
      FROM subjects s
      LEFT JOIN topics t ON t.subject_id = s.id AND t.user_id = s.user_id
      WHERE s.user_id = ?
    `).get(userId);

    const minutesDiff = curWeekStats.total_minutes - prevWeekStats.total_minutes;
    const topicsCompletedCur = completedThisWeek.length;

    res.json({
      period: {
        start: currentWeekStart,
        end: todayStr
      },
      current_week: {
        total_study_minutes: curWeekStats.total_minutes,
        total_sessions: curWeekStats.total_sessions,
        topics_completed_count: topicsCompletedCur,
        topics_studied_count: curWeekStats.distinct_topics_studied,
        revision_flagged_count: revisionThisWeek.length
      },
      previous_week: {
        total_study_minutes: prevWeekStats.total_minutes,
        total_sessions: prevWeekStats.total_sessions
      },
      comparison: {
        minutes_diff: minutesDiff,
        minutes_trend: minutesDiff >= 0 ? `+${minutesDiff}m` : `${minutesDiff}m`,
        sessions_diff: curWeekStats.total_sessions - prevWeekStats.total_sessions
      },
      syllabus_summary: {
        total_topics: overallCounts.total_topics || 0,
        completed_topics: overallCounts.completed_topics || 0,
        remaining_topics: overallCounts.remaining_topics || 0
      },
      completed_topics: completedThisWeek,
      revision_topics: revisionThisWeek,
      subject_breakdown: subjectBreakdown
    });
  } catch (err) {
    console.error('Weekly review error:', err);
    res.status(500).json({ error: 'Failed to fetch weekly review.' });
  }
});

// 3. Analytics charts data
router.get('/charts', (req, res) => {
  try {
    const userId = req.user.id;

    // Daily study time over last 14 days
    const dailyStudy = db.prepare(`
      SELECT 
        study_date,
        SUM(duration_minutes) as minutes,
        COUNT(id) as sessions
      FROM study_logs
      WHERE user_id = ? AND study_date >= date('now', '-13 days')
      GROUP BY study_date
      ORDER BY study_date ASC
    `).all(userId);

    // Test score history (all tests)
    const testScores = db.prepare(`
      SELECT 
        t.id, t.test_name, t.test_date, t.percentage, t.marks_obtained, t.total_marks,
        s.name AS subject_name, s.color AS subject_color
      FROM tests t
      JOIN subjects s ON s.id = t.subject_id
      WHERE t.user_id = ?
      ORDER BY t.test_date ASC, t.id ASC
    `).all(userId);

    // Subject breakdown
    const subjectStats = db.prepare(`
      SELECT 
        s.id, s.name, s.color,
        COUNT(t.id) as total_topics,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_topics,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_topics,
        SUM(CASE WHEN t.status = 'revision' THEN 1 ELSE 0 END) as revision_topics,
        SUM(CASE WHEN t.status = 'not_started' OR t.status IS NULL THEN 1 ELSE 0 END) as not_started_topics
      FROM subjects s
      LEFT JOIN topics t ON t.subject_id = s.id AND t.user_id = s.user_id
      WHERE s.user_id = ?
      GROUP BY s.id
    `).all(userId);

    res.json({
      daily_study: dailyStudy,
      test_scores: testScores,
      subject_stats: subjectStats
    });
  } catch (err) {
    console.error('Analytics charts error:', err);
    res.status(500).json({ error: 'Failed to fetch charts data.' });
  }
});

module.exports = router;

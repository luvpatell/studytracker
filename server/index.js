const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/study-logs', require('./routes/studyLogs'));
app.use('/api/papers', require('./routes/papers'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/revision', require('./routes/revision'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'StudyTrack API', timestamp: new Date().toISOString() });
});

// SPA fallback
app.use((req, res) => {
  // If requesting API that doesn't exist, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` StudyTrack Server running at http://localhost:${PORT}`);
    console.log(`===============================================`);
  });
}

module.exports = app;

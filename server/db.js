const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'studytrack.db');
const db = new Database(DB_PATH);

// Performance & integrity pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reset_code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    color TEXT DEFAULT '#4f46e5',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    unit_number INTEGER,
    title TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'revision'
    order_index INTEGER DEFAULT 0,
    completed_at TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS study_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    unit_id INTEGER,
    topic_id INTEGER NOT NULL,
    study_date TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS question_papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    total_marks INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    question_types TEXT,
    topic_ids_json TEXT NOT NULL,
    paper_data_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    paper_id INTEGER,
    subject_id INTEGER NOT NULL,
    test_name TEXT NOT NULL,
    test_date TEXT NOT NULL,
    total_marks REAL NOT NULL,
    marks_obtained REAL NOT NULL,
    percentage REAL NOT NULL,
    remarks TEXT,
    topics_tested_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (paper_id) REFERENCES question_papers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS revision_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    test_id INTEGER,
    reason TEXT,
    is_resolved INTEGER DEFAULT 0,
    resolved_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
  CREATE INDEX IF NOT EXISTS idx_units_subject ON units(subject_id);
  CREATE INDEX IF NOT EXISTS idx_topics_unit ON topics(unit_id);
  CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
  CREATE INDEX IF NOT EXISTS idx_topics_user_status ON topics(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_study_logs_user_date ON study_logs(user_id, study_date);
  CREATE INDEX IF NOT EXISTS idx_tests_user ON tests(user_id);
  CREATE INDEX IF NOT EXISTS idx_revision_user_resolved ON revision_topics(user_id, is_resolved);
`);

module.exports = db;

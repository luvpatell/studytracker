const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'studytrack_super_secret_jwt_key_2026';

function authenticateToken(req, res, next) {
  let token = null;

  // Check Authorization header: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, email, full_name FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};

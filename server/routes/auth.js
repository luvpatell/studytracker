const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 1. Sign Up
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check existing
    const existing = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(trimmedUsername, trimmedEmail);
    if (existing) {
      if (existing.username === trimmedUsername) {
        return res.status(409).json({ error: 'Username is already taken.' });
      }
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name)
      VALUES (?, ?, ?, ?)
    `).run(trimmedUsername, trimmedEmail, password_hash, full_name ? full_name.trim() : trimmedUsername);

    const user = {
      id: result.lastInsertRowid,
      username: trimmedUsername,
      email: trimmedEmail,
      full_name: full_name ? full_name.trim() : trimmedUsername
    };

    const token = generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// 2. Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const user = db.prepare(`
      SELECT id, username, email, password_hash, full_name
      FROM users
      WHERE username = ? OR email = ?
    `).get(cleanId, cleanId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name
    };

    const token = generateToken(userData);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.json({
      message: 'Login successful.',
      token,
      user: userData
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 3. Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
});

// 4. Current user session
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// 5. Update Profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { full_name } = req.body;
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name cannot be empty.' });
    }

    db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(full_name.trim(), req.user.id);
    const updatedUser = db.prepare('SELECT id, username, email, full_name FROM users WHERE id = ?').get(req.user.id);

    res.json({ message: 'Profile updated successfully.', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// 6. Change Password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// 7. Request Password Reset Code
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      // Don't leak user existence for security, but return code for easy local reset
      return res.json({
        message: 'If an account exists with this email, a reset code has been generated.',
        demo_code: null
      });
    }

    // 6-digit random code
    const reset_code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    db.prepare(`
      INSERT INTO password_resets (user_id, reset_code, expires_at)
      VALUES (?, ?, ?)
    `).run(user.id, reset_code, expires_at);

    // In a production server with email service, this is emailed.
    // For this self-contained app, we return the reset_code directly so the user can easily reset without requiring an external SMTP gateway.
    res.json({
      message: 'Password reset code generated successfully.',
      reset_code: reset_code,
      note: 'In this environment, your reset code is displayed directly above.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process forgot password request.' });
  }
});

// 8. Reset Password with Code
router.post('/reset-password', async (req, res) => {
  try {
    const { email, reset_code, new_password } = req.body;
    if (!email || !reset_code || !new_password) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(400).json({ error: 'Invalid reset request or email.' });
    }

    const now = new Date().toISOString();
    const resetRecord = db.prepare(`
      SELECT id FROM password_resets
      WHERE user_id = ? AND reset_code = ? AND used = 0 AND expires_at > ?
      ORDER BY id DESC LIMIT 1
    `).get(user.id, reset_code.trim(), now);

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

module.exports = router;

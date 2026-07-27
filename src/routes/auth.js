const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'İstifadəçi adı və parol tələb olunur' });
  }

  const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'İstifadəçi adı və ya parol yanlışdır' });
  }

  const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  res.cookie('admin_token', token, COOKIE_OPTIONS);
  res.json({ ok: true, username: admin.username });
});

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token', COOKIE_OPTIONS);
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

router.post('/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Hər iki sahə tələb olunur' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Yeni parol ən azı 6 simvol olmalıdır' });
  }

  const admin = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.admin.id);
  if (!admin || !bcrypt.compareSync(currentPassword, admin.password_hash)) {
    return res.status(401).json({ error: 'Hazırkı parol yanlışdır' });
  }

  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(hash, admin.id);
  res.json({ ok: true });
});

module.exports = router;

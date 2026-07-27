const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all();
  res.json(categories);
});

router.post('/', requireAdmin, (req, res) => {
  const { name_az, name_ru, name_en } = req.body || {};
  if (!name_az || !name_ru || !name_en) {
    return res.status(400).json({ error: '3 dildə də ad daxil edin' });
  }
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories').get().m || 0;
  const info = db
    .prepare('INSERT INTO categories (name_az, name_ru, name_en, sort_order) VALUES (?, ?, ?, ?)')
    .run(name_az, name_ru, name_en, maxOrder + 1);
  res.json({ ok: true, id: info.lastInsertRowid });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

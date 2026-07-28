const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function parseCard(row) {
  if (!row) return row;
  return { ...row, is_active: !!row.is_active };
}

// Public: only active cards, shown to customers at checkout
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM payment_cards WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
    .all();
  res.json(rows.map(parseCard));
});

// Admin: every card, active or not
router.get('/admin', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM payment_cards ORDER BY sort_order ASC, id ASC').all();
  res.json(rows.map(parseCard));
});

router.post('/', requireAdmin, (req, res) => {
  const { bank_name, card_number, card_holder, is_active } = req.body || {};
  if (!bank_name || !card_number) {
    return res.status(400).json({ error: 'Bank adı və kart nömrəsi tələb olunur' });
  }
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM payment_cards').get().m || 0;
  const info = db
    .prepare(
      'INSERT INTO payment_cards (bank_name, card_number, card_holder, is_active, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    .run(bank_name, card_number, card_holder || '', is_active === false ? 0 : 1, maxOrder + 1);
  res.json({ ok: true, id: info.lastInsertRowid });
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM payment_cards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Kart tapılmadı' });

  const { bank_name, card_number, card_holder, is_active } = req.body || {};
  if (!bank_name || !card_number) {
    return res.status(400).json({ error: 'Bank adı və kart nömrəsi tələb olunur' });
  }
  db.prepare(
    'UPDATE payment_cards SET bank_name = ?, card_number = ?, card_holder = ?, is_active = ? WHERE id = ?'
  ).run(bank_name, card_number, card_holder || '', is_active === false ? 0 : 1, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM payment_cards WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

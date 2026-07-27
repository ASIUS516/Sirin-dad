const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const EDITABLE_FIELDS = [
  'phone',
  'address_az', 'address_ru', 'address_en',
  'description_az', 'description_ru', 'description_en',
  'card_number', 'card_holder', 'card_bank',
  'instagram', 'working_hours',
];

router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings || {});
});

router.put('/', requireAdmin, (req, res) => {
  const body = req.body || {};
  const current = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};

  const updated = {};
  EDITABLE_FIELDS.forEach((field) => {
    updated[field] = body[field] !== undefined ? String(body[field]) : (current[field] || '');
  });

  db.prepare(
    `UPDATE settings SET
      phone = ?, address_az = ?, address_ru = ?, address_en = ?,
      description_az = ?, description_ru = ?, description_en = ?,
      card_number = ?, card_holder = ?, card_bank = ?,
      instagram = ?, working_hours = ?
     WHERE id = 1`
  ).run(
    updated.phone, updated.address_az, updated.address_ru, updated.address_en,
    updated.description_az, updated.description_ru, updated.description_en,
    updated.card_number, updated.card_holder, updated.card_bank,
    updated.instagram, updated.working_hours
  );

  res.json({ ok: true });
});

module.exports = router;

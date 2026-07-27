const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { notifyNewOrder } = require('../utils/telegram');

const router = express.Router();

const VALID_STATUSES = ['yeni', 'təsdiqləndi', 'hazırlanır', 'yoldadır', 'tamamlandı', 'ləğv edildi'];

function parseOrder(row) {
  if (!row) return row;
  let items = [];
  try {
    items = JSON.parse(row.items || '[]');
  } catch (err) {
    items = [];
  }
  return { ...row, items };
}

// Public: create a new order
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const { customer_name, customer_phone, customer_address, comment, items, payment_last4, payment_note } = body;

    if (!customer_name || !customer_phone || !customer_address) {
      return res.status(400).json({ error: 'Ad, telefon və ünvan tələb olunur' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Səbət boşdur' });
    }

    // Never trust client-sent prices — recompute from the database
    const enrichedItems = [];
    let total = 0;
    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.id);
      if (!product) continue;
      const qty = Math.max(1, parseInt(item.qty, 10) || 1);
      enrichedItems.push({ id: product.id, name: product.name_az, price: product.price, qty });
      total += product.price * qty;
    }

    if (enrichedItems.length === 0) {
      return res.status(400).json({ error: 'Səbətdəki məhsullar mövcud deyil' });
    }

    const info = db
      .prepare(
        `INSERT INTO orders
          (customer_name, customer_phone, customer_address, comment, items, total_amount, payment_last4, payment_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        customer_name, customer_phone, customer_address,
        comment || '', JSON.stringify(enrichedItems), total,
        payment_last4 || '', payment_note || ''
      );

    const order = parseOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid));
    notifyNewOrder(order).catch(() => {});

    res.json({ ok: true, id: order.id });
  } catch (err) {
    console.error('[orders] create error:', err.message);
    res.status(500).json({ error: 'Sifariş göndərilərkən xəta baş verdi' });
  }
});

// Admin: list all orders
router.get('/', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  res.json(rows.map(parseOrder));
});

// Admin: update order status
router.patch('/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Yanlış status dəyəri' });
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

module.exports = router;

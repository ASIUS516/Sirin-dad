const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { notifyNewOrder } = require('../utils/telegram');

const router = express.Router();

const VALID_STATUSES = ['yeni', 'təsdiqləndi', 'hazırlanır', 'yoldadır', 'tamamlandı', 'ləğv edildi'];
const EPSILON = 0.01; // float rounding tolerance for AZN comparisons

function paymentStatus(totalAmount, paidAmount) {
  const total = Number(totalAmount) || 0;
  const paid = Number(paidAmount) || 0;
  if (paid <= EPSILON) return 'unpaid';
  if (paid + EPSILON < total) return 'partial';
  if (paid > total + EPSILON) return 'overpaid';
  return 'paid';
}

function parseOrder(row) {
  if (!row) return row;
  let items = [];
  try {
    items = JSON.parse(row.items || '[]');
  } catch (err) {
    items = [];
  }
  const paid_amount = Number(row.paid_amount) || 0;
  const remaining = Math.max(0, Math.round((Number(row.total_amount) - paid_amount) * 100) / 100);
  return {
    ...row,
    items,
    paid_amount,
    remaining,
    payment_status: paymentStatus(row.total_amount, paid_amount),
  };
}

// Public: create a new order
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const { customer_name, customer_phone, customer_address, comment, items, payment_last4, payment_note, payment_card_id } = body;

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

    // Validate the chosen payment card actually exists & is active (if provided)
    let cardId = null;
    if (payment_card_id) {
      const card = db.prepare('SELECT id FROM payment_cards WHERE id = ? AND is_active = 1').get(payment_card_id);
      if (card) cardId = card.id;
    }

    const info = db
      .prepare(
        `INSERT INTO orders
          (customer_name, customer_phone, customer_address, comment, items, total_amount, payment_last4, payment_note, payment_card_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        customer_name, customer_phone, customer_address,
        comment || '', JSON.stringify(enrichedItems), total,
        payment_last4 || '', payment_note || '', cardId
      );

    const order = parseOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid));
    notifyNewOrder(order).catch(() => {});

    res.json({ ok: true, id: order.id });
  } catch (err) {
    console.error('[orders] create error:', err.message);
    res.status(500).json({ error: 'Sifariş göndərilərkən xəta baş verdi' });
  }
});

// Admin: list all orders (with the bank name of the card the customer picked, if any)
router.get('/', requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, pc.bank_name as payment_card_bank
       FROM orders o
       LEFT JOIN payment_cards pc ON pc.id = o.payment_card_id
       ORDER BY o.id DESC`
    )
    .all();
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

// Admin: record how much the customer has actually paid so far
router.patch('/:id/payment', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Sifariş tapılmadı' });

  const amount = parseFloat(req.body && req.body.paid_amount);
  if (Number.isNaN(amount) || amount < 0) {
    return res.status(400).json({ error: 'Düzgün məbləğ daxil edin' });
  }

  db.prepare('UPDATE orders SET paid_amount = ? WHERE id = ?').run(amount, req.params.id);
  const updated = parseOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id));
  res.json({ ok: true, order: updated });
});

module.exports = router;

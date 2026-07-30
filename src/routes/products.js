const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { uploadBuffer, deleteByUrl } = require('../utils/cloudinary');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

function parseProduct(row) {
  if (!row) return row;
  let images = [];
  try {
    images = JSON.parse(row.images || '[]');
  } catch (err) {
    images = [];
  }
  return { ...row, images };
}

// Public: active products only
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY id DESC').all();
  res.json(rows.map(parseProduct));
});

// Admin: all products (active + inactive)
router.get('/admin', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  res.json(rows.map(parseProduct));
});
// Public: single product by id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Məhsul tapılmadı' });
  res.json(parseProduct(row));
});

router.post('/', requireAdmin, upload.array('images', 6), async (req, res) => {
  try {
    const body = req.body || {};
    const { category_id, name_az, name_ru, name_en, desc_az, desc_ru, desc_en, price } = body;

    if (!name_az || !name_ru || !name_en || !price) {
      return res.status(400).json({ error: '3 dildə ad və qiymət tələb olunur' });
    }

    const files = req.files || [];
    const uploadedUrls = await Promise.all(files.map((f) => uploadBuffer(f.buffer)));

    const info = db
      .prepare(
        `INSERT INTO products
          (category_id, name_az, name_ru, name_en, desc_az, desc_ru, desc_en, price, images, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        category_id || null,
        name_az, name_ru, name_en,
        desc_az || '', desc_ru || '', desc_en || '',
        parseFloat(price),
        JSON.stringify(uploadedUrls),
        body.is_active === 'false' ? 0 : 1
      );

    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error('[products] create error:', err.message);
    res.status(500).json({ error: 'Məhsul yaradılarkən xəta baş verdi' });
  }
});

router.put('/:id', requireAdmin, upload.array('images', 6), async (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Məhsul tapılmadı' });

    const body = req.body || {};
    const { category_id, name_az, name_ru, name_en, desc_az, desc_ru, desc_en, price } = body;

    if (!name_az || !name_ru || !name_en || !price) {
      return res.status(400).json({ error: '3 dildə ad və qiymət tələb olunur' });
    }

    let keepImages = [];
    try {
      keepImages = JSON.parse(body.keep_images || '[]');
    } catch (err) {
      keepImages = [];
    }

    const oldImages = JSON.parse(existing.images || '[]');
    const removedImages = oldImages.filter((url) => !keepImages.includes(url));
    await Promise.all(removedImages.map((url) => deleteByUrl(url)));

    const files = req.files || [];
    const uploadedUrls = await Promise.all(files.map((f) => uploadBuffer(f.buffer)));
    const finalImages = [...keepImages, ...uploadedUrls];

    db.prepare(
      `UPDATE products SET
        category_id = ?, name_az = ?, name_ru = ?, name_en = ?,
        desc_az = ?, desc_ru = ?, desc_en = ?, price = ?, images = ?, is_active = ?
       WHERE id = ?`
    ).run(
      category_id || null,
      name_az, name_ru, name_en,
      desc_az || '', desc_ru || '', desc_en || '',
      parseFloat(price),
      JSON.stringify(finalImages),
      body.is_active === 'false' ? 0 : 1,
      req.params.id
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[products] update error:', err.message);
    res.status(500).json({ error: 'Məhsul yenilənərkən xəta baş verdi' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Məhsul tapılmadı' });

    const images = JSON.parse(existing.images || '[]');
    await Promise.all(images.map((url) => deleteByUrl(url)));

    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[products] delete error:', err.message);
    res.status(500).json({ error: 'Məhsul silinərkən xəta baş verdi' });
  }
});

module.exports = router;

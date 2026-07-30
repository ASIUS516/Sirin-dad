const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'sirindad.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  phone TEXT DEFAULT '',
  address_az TEXT DEFAULT '',
  address_ru TEXT DEFAULT '',
  address_en TEXT DEFAULT '',
  description_az TEXT DEFAULT '',
  description_ru TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  card_number TEXT DEFAULT '',
  card_holder TEXT DEFAULT '',
  card_bank TEXT DEFAULT 'Birbank',
  instagram TEXT DEFAULT '',
  working_hours TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_az TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name_az TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  desc_az TEXT DEFAULT '',
  desc_ru TEXT DEFAULT '',
  desc_en TEXT DEFAULT '',
  price REAL NOT NULL,
  images TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  comment TEXT DEFAULT '',
  items TEXT NOT NULL,
  total_amount REAL NOT NULL,
  payment_last4 TEXT DEFAULT '',
  payment_note TEXT DEFAULT '',
  status TEXT DEFAULT 'yeni',
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// Seed default row for settings (single row table)
const settingsRow = db.prepare('SELECT id FROM settings WHERE id = 1').get();
if (!settingsRow) {
  db.prepare(`INSERT INTO settings (id, phone, description_az, description_ru, description_en)
              VALUES (1, '+994 50 000 00 00', 'Şirin Dad — sifarişlə hazırlanan tort və şirniyyatlar.',
              'Şirin Dad — торты и выпечка на заказ.', 'Şirin Dad — custom cakes and pastries made to order.')`).run();
}

// ----- Migrations for features added after initial release -----
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = cols.some((c) => c.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('settings', 'location_lat', "TEXT DEFAULT ''");
ensureColumn('settings', 'location_lng', "TEXT DEFAULT ''");
ensureColumn('settings', 'location_link', "TEXT DEFAULT ''");
ensureColumn('orders', 'paid_amount', 'REAL DEFAULT 0');
ensureColumn('orders', 'payment_card_id', 'INTEGER');
ensureColumn('settings', 'whatsapp', "TEXT DEFAULT ''");
ensureColumn('settings', 'tiktok', "TEXT DEFAULT ''");
ensureColumn('settings', 'youtube', "TEXT DEFAULT ''");

db.exec(`
CREATE TABLE IF NOT EXISTS payment_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_name TEXT NOT NULL,
  card_number TEXT NOT NULL,
  card_holder TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// One-time migration: move the old single card (settings.card_number) into the
// new payment_cards table, but only if the admin had actually filled it in before.
const cardCount = db.prepare('SELECT COUNT(*) as c FROM payment_cards').get().c;
if (cardCount === 0) {
  const oldCard = db.prepare('SELECT card_number, card_holder, card_bank FROM settings WHERE id = 1').get();
  if (oldCard && oldCard.card_number) {
    db.prepare(
      'INSERT INTO payment_cards (bank_name, card_number, card_holder, is_active, sort_order) VALUES (?, ?, ?, 1, 1)'
    ).run(oldCard.card_bank || 'Bank', oldCard.card_number, oldCard.card_holder || '');
    console.log('[db] Köhnə kart məlumatı "payment_cards" cədvəlinə köçürüldü');
  }
}

// Seed default admin user from env (only on first boot, or if no admins exist yet)
const adminCount = db.prepare('SELECT COUNT(*) as c FROM admin_users').get().c;
if (adminCount === 0) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'change_me_123';
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`[db] İlk admin istifadəçisi yaradıldı: ${username} (parolu .env faylınızdan götürülüb)`);
}

// Seed a couple of starter categories if none exist, so the site isn't empty on first run
const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
if (catCount === 0) {
  const insertCat = db.prepare('INSERT INTO categories (name_az, name_ru, name_en, sort_order) VALUES (?, ?, ?, ?)');
  insertCat.run('Tortlar', 'Торты', 'Cakes', 1);
  insertCat.run('Şirniyyatlar', 'Выпечка', 'Pastries', 2);
}

module.exports = db;

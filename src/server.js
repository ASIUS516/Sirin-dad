require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Initializing this also creates/migrates the SQLite database and seeds
// the first admin user + starter categories on first boot.
require('./db');

const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const cardsRoutes = require('./routes/cards');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false, // keep simple for now; app has no third-party scripts beyond fonts/cloudinary images
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.CLIENT_URL) {
  app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
}

// Basic rate limiting on the admin login endpoint to slow down brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/admin/auth/login', loginLimiter);

// Health check used by render.yaml and by the admin panel's keep-alive ping
app.get('/health', (req, res) => res.json({ ok: true }));

// ===== API routes =====
app.use('/api/admin/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/cards', cardsRoutes);

// ===== Static site =====
app.use(express.static(PUBLIC_DIR));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});
app.get('/product/:id', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'product.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// 404 for anything else under /api
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Şirin Dad ${PORT} portunda işə düşdü`);
});

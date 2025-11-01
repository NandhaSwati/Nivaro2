import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import pool, { initDb } from './db.js';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4002;
const NOTIFICATION_URL = process.env.NOTIFICATION_URL || 'http://localhost:4003/notify';

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

// Helper to get user from headers (set by gateway)
function getUser(req) {
  const id = req.headers['x-user-id'];
  const email = req.headers['x-user-email'];
  const name = req.headers['x-user-name'];
  if (id) return { id: parseInt(id, 10), email: email || null, name: name || null };
  // Fallback: decode JWT payload (without verify) to extract user id/email/name
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) {
    try {
      const payload = JSON.parse(Buffer.from((token.split('.')[1] || ''), 'base64').toString('utf8')) || {};
      if (payload.sub) return { id: parseInt(payload.sub, 10), email: payload.email || null, name: payload.name || null };
    } catch (_) {}
  }
  return null;
}

// Services catalog
app.get('/services', async (_req, res) => {
  const { rows } = await pool.query('SELECT id, name FROM services ORDER BY name');
  res.json({ services: rows });
});

// Service details
app.get('/services/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    const svc = await pool.query('SELECT id, name FROM services WHERE id=$1', [id]);
    if (!svc.rows[0]) return res.status(404).json({ error: 'Service not found' });
    const cnt = await pool.query('SELECT COUNT(*)::int AS helpers FROM helpers WHERE service_id=$1', [id]);
    res.json({ service: { ...svc.rows[0], helpers: cnt.rows[0].helpers } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helpers for a service
app.get('/services/:id/helpers', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await pool.query(
      'SELECT id, name, bio, fee_cents, rating FROM helpers WHERE service_id=$1 ORDER BY rating DESC, name',
      [id]
    );
    res.json({ helpers: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Listings feed (public)
app.get('/listings', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT l.id, l.title, l.description, l.price_cents, l.location_text, l.created_at, l.service_id,
            s.name AS service_name,
            h.id AS helper_id, h.name AS helper_name, h.rating
     FROM listings l
     JOIN services s ON s.id=l.service_id
     JOIN helpers h ON h.id=l.helper_id
     WHERE l.active=true
     ORDER BY l.created_at DESC`
  );
  res.json({ listings: rows });
});

// Create listing (helper only)
app.post('/listings', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { service_id, title, description, price_cents, location_text } = req.body || {};
  if (!service_id || !title || !price_cents) return res.status(400).json({ error: 'Missing fields' });
  let h = await pool.query('SELECT id FROM helpers WHERE user_id=$1', [user.id]);
  if (!h.rowCount) {
    // auto-create helper profile for this user if missing
    const created = await pool.query(
      `INSERT INTO helpers (service_id, name, bio, fee_cents, rating, experience_years, location_text, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [service_id, user.name || 'Provider', null, price_cents, 4.7, 3, location_text || null, user.id]
    );
    h = { rows: [{ id: created.rows[0].id }] };
  }
  const helper_id = h.rows[0].id;
  const ins = await pool.query(
    `INSERT INTO listings (helper_id, service_id, title, description, price_cents, location_text)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, helper_id, service_id, title, description, price_cents, location_text, active, created_at`,
    [helper_id, service_id, title, description || null, price_cents, location_text || null]
  );
  res.status(201).json({ listing: ins.rows[0] });
});

// Helper details
app.get('/helpers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await pool.query(
      `SELECT h.id, h.name, h.bio, h.fee_cents, h.rating, h.experience_years, h.location_text, h.user_id, h.service_id, s.name AS service_name
       FROM helpers h JOIN services s ON s.id=h.service_id WHERE h.id=$1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Helper not found' });
    res.json({ helper: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper profile (for authenticated helper user)
app.get('/helpers/me', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { rows } = await pool.query(
    `SELECT h.id, h.name, h.bio, h.fee_cents, h.rating, h.experience_years, h.location_text, h.user_id, h.service_id
     FROM helpers h WHERE user_id=$1`,
    [user.id]
  );
  res.json({ helper: rows[0] || null });
});

app.put('/helpers/me', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { service_id, name, bio, fee_cents, experience_years, location_text } = req.body || {};
  if (!service_id || !name) return res.status(400).json({ error: 'Missing fields' });
  // ensure service exists
  const svc = await pool.query('SELECT 1 FROM services WHERE id=$1', [service_id]);
  if (!svc.rowCount) return res.status(400).json({ error: 'Invalid service' });
  const existing = await pool.query('SELECT id FROM helpers WHERE user_id=$1', [user.id]);
  if (existing.rowCount) {
    await pool.query(
      `UPDATE helpers SET service_id=$1, name=$2, bio=$3, fee_cents=$4, experience_years=$5, location_text=$6 WHERE user_id=$7`,
      [service_id, name, bio || null, fee_cents || 0, experience_years || 0, location_text || null, user.id]
    );
  } else {
    await pool.query(
      `INSERT INTO helpers (service_id, name, bio, fee_cents, rating, experience_years, location_text, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [service_id, name, bio || null, fee_cents || 0, 4.5, experience_years || 0, location_text || null, user.id]
    );
  }
  const { rows } = await pool.query(
    `SELECT id, service_id, name, bio, fee_cents, experience_years, location_text, user_id FROM helpers WHERE user_id=$1`,
    [user.id]
  );
  res.json({ helper: rows[0] });
});

// List my bookings
app.get('/bookings', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { rows } = await pool.query(
    `SELECT b.id, b.service_id, s.name AS service_name, b.helper_id, h.name AS helper_name,
            b.scheduled_at, b.notes, b.status, b.created_at
     FROM bookings b
     JOIN services s ON s.id=b.service_id
     LEFT JOIN helpers h ON h.id=b.helper_id
     WHERE user_id=$1 ORDER BY b.created_at DESC`,
    [user.id]
  );
  res.json({ bookings: rows });
});

// Create booking
app.post('/bookings', async (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { service_id, helper_id, scheduled_at, notes } = req.body || {};
    if (!service_id || !helper_id || !scheduled_at) return res.status(400).json({ error: 'Missing fields' });
    // Validate helper belongs to service
    const chk = await pool.query('SELECT 1 FROM helpers WHERE id=$1 AND service_id=$2', [helper_id, service_id]);
    if (!chk.rowCount) return res.status(400).json({ error: 'Helper not available for service' });
    const { rows } = await pool.query(
      `INSERT INTO bookings (user_id, user_email, service_id, helper_id, scheduled_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, service_id, helper_id, scheduled_at, notes, status, created_at`,
      [user.id, user.email, service_id, helper_id, scheduled_at, notes || null]
    );
    const booking = rows[0];
    // Fire-and-forget notify
    try {
      await axios.post(NOTIFICATION_URL, {
        to: user.email || 'test@example.com',
        subject: 'Booking confirmed',
        text: `Your booking #${booking.id} is confirmed for service ${service_id} at ${scheduled_at}.`
      }, { timeout: 2000 });
    } catch (e) {
      console.warn('Notification failed:', e.message);
    }
    res.status(201).json({ booking });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel booking
app.post('/bookings/:id/cancel', async (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const id = parseInt(req.params.id, 10);
    const { rows } = await pool.query(
      `UPDATE bookings SET status='cancelled' WHERE id=$1 AND user_id=$2 AND status<>'cancelled' RETURNING id, service_id, helper_id, scheduled_at, notes, status, created_at`,
      [id, user.id]
    );
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

initDb().then(() => {
  app.listen(PORT, () => console.log(`Booking Service listening on :${PORT}`));
});

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

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

// Helper to get user from headers (set by gateway)
function getUser(req) {
  const id = req.headers['x-user-id'];
  const email = req.headers['x-user-email'];
  if (!id) return null;
  return { id: parseInt(id, 10), email: email || null };
}

// Services catalog
app.get('/services', async (_req, res) => {
  const { rows } = await pool.query('SELECT id, name FROM services ORDER BY name');
  res.json({ services: rows });
});

// Service details
app.get('/services/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const svc = await pool.query('SELECT id, name FROM services WHERE id=$1', [id]);
  if (!svc.rows[0]) return res.status(404).json({ error: 'Service not found' });
  const cnt = await pool.query('SELECT COUNT(*)::int AS helpers FROM helpers WHERE service_id=$1', [id]);
  res.json({ service: { ...svc.rows[0], helpers: cnt.rows[0].helpers } });
});

// Helpers for a service
app.get('/services/:id/helpers', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rows } = await pool.query(
    'SELECT id, name, bio, fee_cents, rating FROM helpers WHERE service_id=$1 ORDER BY rating DESC, name',
    [id]
  );
  res.json({ helpers: rows });
});

// Helper details
app.get('/helpers/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rows } = await pool.query(
    `SELECT h.id, h.name, h.bio, h.fee_cents, h.rating, h.service_id, s.name AS service_name
     FROM helpers h JOIN services s ON s.id=h.service_id WHERE h.id=$1`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Helper not found' });
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

initDb().then(() => {
  app.listen(PORT, () => console.log(`Booking Service listening on :${PORT}`));
});

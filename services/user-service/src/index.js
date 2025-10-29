import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool, { initDb } from './db.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

function signToken(user) {
  const payload = { sub: user.id, email: user.email, role: user.role, name: user.name };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

app.post('/auth/register', async (req, res) => {
  try {
    let { name, email, password, role = 'user' } = req.body || {};
    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
    if (password.length < 6) return res.status(400).json({ error: 'Password too short' });
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,created_at',
      [name, email, hash, role]
    );
    const user = rows[0];
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    let { email, password } = req.body || {};
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Authenticated profile
app.get('/users/me', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query('SELECT id,name,email,role,created_at FROM users WHERE id=$1', [payload.sub]);
    const me = rows[0];
    res.json({ user: me });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

initDb().then(() => {
  app.listen(PORT, () => console.log(`User Service listening on :${PORT}`));
});

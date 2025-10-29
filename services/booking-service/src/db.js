import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'booker',
  password: process.env.DB_PASSWORD || 'pass',
  database: process.env.DB_NAME || 'bookings_db',
});

async function waitForDb(retries = 30, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

export async function initDb() {
  await waitForDb();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS helpers (
      id SERIAL PRIMARY KEY,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      bio TEXT,
      fee_cents INTEGER NOT NULL DEFAULT 2500,
      rating REAL NOT NULL DEFAULT 4.5,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      user_email TEXT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
      helper_id INTEGER REFERENCES helpers(id) ON DELETE SET NULL,
      scheduled_at TIMESTAMPTZ NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Ensure helper_id column exists (for upgraded deployments)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='bookings' AND column_name='helper_id'
      ) THEN
        ALTER TABLE bookings ADD COLUMN helper_id INTEGER REFERENCES helpers(id) ON DELETE SET NULL;
      END IF;
    END$$;
  `);

  // seed services if empty
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM services');
  if (rows[0].count === 0) {
    const names = ['Plumber', 'Carpenter', 'Cleaner', 'Salon', 'Electrician', 'Painter'];
    for (const n of names) {
      await pool.query('INSERT INTO services (name) VALUES ($1) ON CONFLICT DO NOTHING', [n]);
    }
  }

  // seed helpers if empty
  const hcount = await pool.query('SELECT COUNT(*)::int AS count FROM helpers');
  if (hcount.rows[0].count === 0) {
    const svc = await pool.query('SELECT id, name FROM services');
    for (const s of svc.rows) {
      const base = s.name;
      const helpers = [
        { name: `${base} Pro A`, bio: `Experienced ${base.toLowerCase()} with 5+ years.`, fee: 3000, rating: 4.6 },
        { name: `${base} Pro B`, bio: `Certified ${base.toLowerCase()} specialist.`, fee: 3500, rating: 4.8 },
      ];
      for (const h of helpers) {
        await pool.query(
          'INSERT INTO helpers (service_id, name, bio, fee_cents, rating) VALUES ($1,$2,$3,$4,$5)',
          [s.id, h.name, h.bio, h.fee, h.rating]
        );
      }
    }
  }
}

export default pool;

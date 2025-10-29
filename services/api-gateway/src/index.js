const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:4001';
const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://booking-service:4002';

// Simple request id for correlation in logs
app.use((req, _res, next) => {
  req.id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  next();
});

app.get('/health', (_, res) => res.json({ ok: true }));

// JWT auth for protected /api routes (auth and services are public)
app.use((req, res, next) => {
  const isApi = req.path.startsWith('/api');
  const isPublic = req.path.startsWith('/api/auth') || req.path.startsWith('/api/services') || req.path.startsWith('/api/helpers');
  if (isApi && !isPublic) {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  next();
});

// Shared proxy factory with robust error logging and clear client errors
function makeProxy(target, label, pathRewrite) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 15000,
    timeout: 20000,
    pathRewrite,
    onError(err, req, res) {
      const msg = `[proxy:${label}] ${req.method} ${req.originalUrl} -> ${target} failed: ${err.code || ''} ${err.message}`;
      console.error(msg);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
      }
      res.end(JSON.stringify({ error: 'Upstream error', details: err.message }));
    },
    onProxyRes(proxyRes, req) {
      console.log(`[proxy:${label}] ${req.method} ${req.originalUrl} -> ${target} responded ${proxyRes.statusCode}`);
    },
    onProxyReq(proxyReq, req, res) {
      // Forward user context headers if present
      if (req.user) {
        try {
          if (req.user.sub) proxyReq.setHeader('x-user-id', String(req.user.sub));
          if (req.user.email) proxyReq.setHeader('x-user-email', req.user.email);
        } catch (_) {}
      }
      // Re-stream JSON body if it was already parsed by express.json()
      try {
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      } catch (e) {
        console.warn(`[proxy:${label}] failed to forward body:`, e.message);
      }
    },
  });
}

// User service: auth and user profile
app.use('/api/auth', makeProxy(USER_SERVICE_URL, 'users', (path) => '/auth' + path));
app.use('/api/users', makeProxy(USER_SERVICE_URL, 'users', (path) => '/users' + path));

// Booking service: services catalog and bookings
app.use('/api/bookings', makeProxy(BOOKING_SERVICE_URL, 'bookings', (path) => '/bookings' + path));
app.use('/api/services', makeProxy(BOOKING_SERVICE_URL, 'bookings', (path) => '/services' + path));
app.use('/api/helpers', makeProxy(BOOKING_SERVICE_URL, 'bookings', (path) => '/helpers' + path));

// 404 for unknown routes (JSON)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Centralized error handler to ensure visibility
app.use((err, _req, res, _next) => {
  console.error('[gateway:error]', err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`[api-gateway] listening on ${PORT}`));

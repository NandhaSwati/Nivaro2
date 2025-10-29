const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 4003;

app.get('/health', (_, res) => res.json({ ok: true }));

app.post('/api/notify', (req, res) => {
  const { to, subject, text } = req.body || {};
  console.log(`[notification-service] email -> to: ${to}, subject: ${subject}, text: ${text}`);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`[notification-service] listening on ${PORT}`));

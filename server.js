const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD || 'changeme';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

/* ── Auth helpers ── */

function isAuthenticated(req) {
  return req.session && req.session.authenticated;
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  res.redirect('/login');
}

function requireApiAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

/* ── Login page ── */

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Login · Expense Tracker</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; font-family: Calibri, 'Calibri Light', 'Gill Sans', 'Trebuchet MS', sans-serif; }
body { background:#f4f5f8; min-height:100vh; display:flex; align-items:center; justify-content:center; }
.card { background:#fff; border-radius:18px; padding:40px 36px; width:100%; max-width:380px; box-shadow:0 6px 28px rgba(0,0,0,0.1); text-align:center; }
.logo { font-size:38px; margin-bottom:10px; }
h1 { font-size:22px; font-weight:700; color:#1a1c2e; margin-bottom:4px; }
p { font-size:14px; color:#5a5d78; margin-bottom:24px; }
input { width:100%; background:#eef0f5; border:1px solid rgba(0,0,0,0.09); color:#1a1c2e; padding:12px 14px; border-radius:9px; font-size:16px; outline:none; margin-bottom:16px; }
input:focus { border-color:#5b4ef0; }
button { width:100%; background:#5b4ef0; border:none; color:#fff; padding:12px; border-radius:9px; font-size:16px; font-weight:700; cursor:pointer; transition:opacity .18s; }
button:hover { opacity:.88; }
.error { color:#e03557; font-size:13px; margin-top:10px; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">💰</div>
  <h1>Expense Tracker</h1>
  <p>Enter your password to continue</p>
  <form method="POST" action="/api/login">
    <input type="password" name="password" placeholder="Password" autofocus required>
    <button type="submit">Unlock</button>
  </form>
  <div class="error" id="error"></div>
</div>
<script>
if (window.location.search.includes('error=1')) document.getElementById('error').textContent='Incorrect password.';
</script>
</body>
</html>`;

app.get('/login', (req, res) => {
  if (isAuthenticated(req)) return res.redirect('/');
  res.send(LOGIN_HTML);
});

app.post('/api/login', express.urlencoded({ extended: false }), (req, res) => {
  if (req.body.password === APP_PASSWORD) {
    req.session.authenticated = true;
    return res.redirect('/');
  }
  res.redirect('/login?error=1');
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

/* ── Static files (authenticated) ── */

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ── API routes (all authenticated) ── */

app.use('/api/data', requireApiAuth);
app.use('/api/categories', requireApiAuth);
app.use('/api/import', requireApiAuth);

/* Transactions */

app.get('/api/data', (req, res) => {
  const transactions = db.getAllTransactions();
  res.json(transactions);
});

app.post('/api/data', (req, res) => {
  const t = req.body;
  if (!t.id || !t.type || !t.desc || t.amount == null || !t.date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  db.addTransaction(t);
  res.json(db.getAllTransactions());
});

app.put('/api/data/:id', (req, res) => {
  db.updateTransaction(req.params.id, req.body);
  res.json(db.getAllTransactions());
});

app.delete('/api/data/:id', (req, res) => {
  db.deleteTransaction(req.params.id);
  res.json(db.getAllTransactions());
});

/* Custom Categories */

app.get('/api/categories', (req, res) => {
  res.json(db.getCustomCategories());
});

app.post('/api/categories', (req, res) => {
  const c = req.body;
  if (!c.id || !c.label || !c.icon || !c.color) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  db.addCustomCategory(c);
  res.json(db.getCustomCategories());
});

app.delete('/api/categories/:id', (req, res) => {
  db.deleteCustomCategory(req.params.id);
  res.json(db.getCustomCategories());
});

/* Import */

app.post('/api/import', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Expected an array of transactions' });
  }
  for (const t of items) {
    db.addTransaction(t);
  }
  res.json(db.getAllTransactions());
});

/* ── Start ── */

app.listen(PORT, () => {
  console.log(`Expense Tracker running at http://localhost:${PORT}`);
});

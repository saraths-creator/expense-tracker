const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

/* ── Migrate legacy data on first start ── */
db.migrateLegacyData();

/* ── Auth helpers ── */

function isAuthenticated(req) {
  return req.session && req.session.userId;
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  res.redirect('/login');
}

function requireApiAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

/* ── Login page (inline) ── */

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Login · Expense Tracker</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; font-family: Calibri, 'Calibri Light', 'Gill Sans', 'Trebuchet MS', sans-serif; }
body { background:#f4f5f8; min-height:100vh; display:flex; align-items:center; justify-content:center; }
.card { background:#fff; border-radius:18px; padding:40px 36px; width:100%; max-width:400px; box-shadow:0 6px 28px rgba(0,0,0,0.1); text-align:center; }
.logo { font-size:38px; margin-bottom:10px; }
h1 { font-size:22px; font-weight:700; color:#1a1c2e; margin-bottom:4px; }
p { font-size:14px; color:#5a5d78; margin-bottom:20px; }
.tabs { display:flex; gap:0; margin-bottom:20px; border:1px solid rgba(0,0,0,0.09); border-radius:9px; overflow:hidden; }
.tab { flex:1; padding:9px; font-size:14px; font-weight:600; cursor:pointer; border:none; background:var(--bg3,#eef0f5); color:var(--text2,#5a5d78); transition:all .15s; }
.tab.active { background:#5b4ef0; color:#fff; }
.form { display:none; }
.form.active { display:block; }
input { width:100%; background:#eef0f5; border:1px solid rgba(0,0,0,0.09); color:#1a1c2e; padding:12px 14px; border-radius:9px; font-size:15px; outline:none; margin-bottom:14px; }
input:focus { border-color:#5b4ef0; }
button[type=submit] { width:100%; background:#5b4ef0; border:none; color:#fff; padding:12px; border-radius:9px; font-size:15px; font-weight:700; cursor:pointer; transition:opacity .18s; }
button[type=submit]:hover { opacity:.88; }
.error { color:#e03557; font-size:13px; margin-top:10px; }
.success { color:#0fa867; font-size:13px; margin-top:10px; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">💰</div>
  <h1>Expense Tracker</h1>
  <p>Sign in or create an account</p>
  <div class="tabs">
    <button class="tab active" id="tabLogin" onclick="switchTab('login')">Sign In</button>
    <button class="tab" id="tabRegister" onclick="switchTab('register')">Register</button>
  </div>

  <form class="form active" id="formLogin" method="POST" action="/api/login">
    <input type="text" name="username" placeholder="Username" autofocus required>
    <input type="password" name="password" placeholder="Password" required>
    <button type="submit">Sign In</button>
    <div class="error" id="loginError"></div>
  </form>

  <form class="form" id="formRegister" method="POST" action="/api/register">
    <input type="text" name="username" placeholder="Choose a username" required>
    <input type="text" name="name" placeholder="Your display name" required>
    <input type="password" name="password" placeholder="Choose a password" required>
    <input type="password" name="confirm" placeholder="Confirm password" required>
    <button type="submit">Create Account</button>
    <div class="error" id="registerError"></div>
    <div class="success" id="registerSuccess"></div>
  </form>
</div>
<script>
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
  document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  document.getElementById('form' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  if (tab === 'register') {
    document.getElementById('formLogin').querySelector('input').blur();
    document.getElementById('formRegister').querySelector('input').focus();
  }
}
const params = new URLSearchParams(window.location.search);
if (params.get('error')) document.getElementById('loginError').textContent = 'Invalid username or password.';
if (params.get('registered')) { switchTab('login'); document.getElementById('loginError').style.color = '#0fa867'; document.getElementById('loginError').textContent = 'Account created! Sign in below.'; }
if (params.get('username')) document.getElementById('formLogin').querySelector('input').value = params.get('username');
</script>
</body>
</html>`;

app.get('/login', (req, res) => {
  if (isAuthenticated(req)) return res.redirect('/');
  res.send(LOGIN_HTML);
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.getUserByUsername(username);
  if (!user || !db.verifyPassword(password, user.passwordHash)) {
    return res.redirect('/login?error=1');
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.name = user.name;
  res.redirect('/');
});

app.post('/api/register', (req, res) => {
  const { username, name, password, confirm } = req.body;
  if (password !== confirm) return res.redirect('/login?rerror=passwords');
  if (username.length < 2) return res.redirect('/login?rerror=short');
  const existing = db.getUserByUsername(username);
  if (existing) return res.redirect('/login?rerror=taken');
  const user = db.createUser(username, password, name || username);
  if (!user) return res.redirect('/login?rerror=error');
  res.redirect('/login?registered=1&username=' + encodeURIComponent(username));
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/api/user', requireApiAuth, (req, res) => {
  res.json({ username: req.session.username, name: req.session.name });
});

/* ── Static files ── */

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ── API routes ── */

app.use('/api/data', requireApiAuth);
app.use('/api/categories', requireApiAuth);
app.use('/api/import', requireApiAuth);

app.get('/api/data', (req, res) => {
  res.json(db.getAllTransactions(req.session.userId));
});

app.post('/api/data', (req, res) => {
  const t = req.body;
  if (!t.id || !t.type || !t.desc || t.amount == null || !t.date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  t.userId = req.session.userId;
  db.addTransaction(t);
  res.json(db.getAllTransactions(req.session.userId));
});

app.put('/api/data/:id', (req, res) => {
  db.updateTransaction(req.params.id, { ...req.body, userId: req.session.userId });
  res.json(db.getAllTransactions(req.session.userId));
});

app.delete('/api/data/:id', (req, res) => {
  db.deleteTransaction(req.params.id);
  res.json(db.getAllTransactions(req.session.userId));
});

app.get('/api/categories', (req, res) => {
  res.json(db.getCustomCategories(req.session.userId));
});

app.post('/api/categories', (req, res) => {
  const c = req.body;
  if (!c.id || !c.label || !c.icon || !c.color) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  c.userId = req.session.userId;
  db.addCustomCategory(c);
  res.json(db.getCustomCategories(req.session.userId));
});

app.delete('/api/categories/:id', (req, res) => {
  db.deleteCustomCategory(req.params.id);
  res.json(db.getCustomCategories(req.session.userId));
});

app.post('/api/import', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Expected an array of transactions' });
  }
  for (const t of items) {
    t.userId = req.session.userId;
    db.addTransaction(t);
  }
  res.json(db.getAllTransactions(req.session.userId));
});

/* ── Start ── */

app.listen(PORT, () => {
  console.log(`Expense Tracker running at http://localhost:${PORT}`);
});

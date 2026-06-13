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

/* ── Login page ── */

const LOGIN_HTML = '<!DOCTYPE html>' +
'<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
'<title>Login · Expense Tracker</title>' +
'<style>*{box-sizing:border-box;margin:0;padding:0;font-family:Calibri,sans-serif}' +
'body{background:#f4f5f8;min-height:100vh;display:flex;align-items:center;justify-content:center}' +
'.card{background:#fff;border-radius:18px;padding:40px 36px;width:100%;max-width:400px;box-shadow:0 6px 28px rgba(0,0,0,0.1);text-align:center}' +
'.logo{font-size:38px;margin-bottom:10px}' +
'h1{font-size:22px;font-weight:700;color:#1a1c2e;margin-bottom:4px}' +
'p{font-size:14px;color:#5a5d78;margin-bottom:20px}' +
'.tabs{display:flex;margin-bottom:20px;border:1px solid rgba(0,0,0,0.09);border-radius:9px;overflow:hidden}' +
'.tab{flex:1;padding:9px;font-size:14px;font-weight:600;cursor:pointer;border:none;background:#eef0f5;color:#5a5d78}' +
'.tab.active{background:#5b4ef0;color:#fff}' +
'.form{display:none}.form.active{display:block}' +
'input{width:100%;background:#eef0f5;border:1px solid rgba(0,0,0,0.09);color:#1a1c2e;padding:12px 14px;border-radius:9px;font-size:15px;outline:none;margin-bottom:14px}' +
'input:focus{border-color:#5b4ef0}' +
'button[type=submit]{width:100%;background:#5b4ef0;border:none;color:#fff;padding:12px;border-radius:9px;font-size:15px;font-weight:700;cursor:pointer}' +
'button[type=submit]:hover{opacity:.88}' +
'.error{color:#e03557;font-size:13px;margin-top:10px}' +
'.success{color:#0fa867;font-size:13px;margin-top:10px}' +
'</style></head><body><div class="card">' +
'<div class="logo">💰</div><h1>Expense Tracker</h1><p>Sign in or create an account</p>' +
'<div class="tabs"><button class="tab active" id="tabLogin" onclick="switchTab(\'login\')">Sign In</button>' +
'<button class="tab" id="tabRegister" onclick="switchTab(\'register\')">Register</button></div>' +
'<form class="form active" id="formLogin" method="POST" action="/api/login">' +
'<input type="text" name="username" placeholder="Username" autofocus required>' +
'<input type="password" name="password" placeholder="Password" required>' +
'<button type="submit">Sign In</button><div class="error" id="loginError"></div></form>' +
'<form class="form" id="formRegister" method="POST" action="/api/register">' +
'<input type="text" name="username" placeholder="Choose a username" required>' +
'<input type="text" name="name" placeholder="Your display name" required>' +
'<input type="password" name="password" placeholder="Choose a password" required>' +
'<input type="password" name="confirm" placeholder="Confirm password" required>' +
'<button type="submit">Create Account</button>' +
'<div class="error" id="registerError"></div><div class="success" id="registerSuccess"></div></form></div>' +
'<script>' +
'function switchTab(t){document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));' +
'document.querySelectorAll(".form").forEach(x=>x.classList.remove("active"));' +
'document.getElementById("tab"+t[0].toUpperCase()+t.slice(1)).classList.add("active");' +
'document.getElementById("form"+t[0].toUpperCase()+t.slice(1)).classList.add("active");' +
'if(t==="register")document.getElementById("formRegister").querySelector("input").focus()}' +
'const p=new URLSearchParams(window.location.search);' +
'if(p.get("error"))document.getElementById("loginError").textContent="Invalid username or password.";' +
'if(p.get("registered")){switchTab("login");document.getElementById("loginError").style.color="#0fa867";' +
'document.getElementById("loginError").textContent="Account created! Sign in below.";}' +
'if(p.get("username"))document.getElementById("formLogin").querySelector("input").value=p.get("username");' +
'</script></body></html>';

app.get('/login', (req, res) => {
  if (isAuthenticated(req)) return res.redirect('/');
  res.send(LOGIN_HTML);
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.getUserByUsername(username);
  if (!user || !db.verifyPassword(password, user.passwordHash)) {
    return res.redirect('/login?error=1');
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.name = user.name;
  res.redirect('/');
});

app.post('/api/register', async (req, res) => {
  const { username, name, password, confirm } = req.body;
  if (password !== confirm) return res.redirect('/login?rerror=passwords');
  if (username.length < 2) return res.redirect('/login?rerror=short');
  const user = await db.createUser(username, password, name || username);
  if (!user) return res.redirect('/login?rerror=taken');
  res.redirect('/login?registered=1&username=' + encodeURIComponent(username));
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/api/user', requireApiAuth, (req, res) => {
  res.json({ username: req.session.username, name: req.session.name });
});

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/data', requireApiAuth);
app.use('/api/categories', requireApiAuth);
app.use('/api/import', requireApiAuth);

app.get('/api/data', async (req, res) => {
  res.json(await db.getAllTransactions(req.session.userId));
});

app.post('/api/data', async (req, res) => {
  const t = req.body;
  if (!t.id || !t.type || !t.desc || t.amount == null || !t.date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  t.userId = req.session.userId;
  await db.addTransaction(t);
  res.json(await db.getAllTransactions(req.session.userId));
});

app.put('/api/data/:id', async (req, res) => {
  await db.updateTransaction(req.params.id, { ...req.body, userId: req.session.userId });
  res.json(await db.getAllTransactions(req.session.userId));
});

app.delete('/api/data/:id', async (req, res) => {
  await db.deleteTransaction(req.params.id);
  res.json(await db.getAllTransactions(req.session.userId));
});

app.get('/api/categories', async (req, res) => {
  res.json(await db.getCustomCategories(req.session.userId));
});

app.post('/api/categories', async (req, res) => {
  const c = req.body;
  if (!c.id || !c.label || !c.icon || !c.color) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  c.userId = req.session.userId;
  await db.addCustomCategory(c);
  res.json(await db.getCustomCategories(req.session.userId));
});

app.delete('/api/categories/:id', async (req, res) => {
  await db.deleteCustomCategory(req.params.id);
  res.json(await db.getCustomCategories(req.session.userId));
});

app.post('/api/import', async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Expected an array of transactions' });
  }
  for (const t of items) {
    t.userId = req.session.userId;
    await db.addTransaction(t);
  }
  res.json(await db.getAllTransactions(req.session.userId));
});

/* ── Start ── */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

db.connect(MONGODB_URI).then(() => {
  app.listen(PORT, () => console.log('Expense Tracker running at http://localhost:' + PORT));
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

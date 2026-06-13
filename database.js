const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.json');

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: [], transactions: [], customCategories: [] };
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/* ── Migrate legacy data (no userId) to admin ── */
function migrateLegacyData() {
  const db = readDb();
  let changed = false;
  const adminUser = db.users.find(u => u.username === 'admin');
  if (!adminUser) return;
  db.transactions.forEach(t => { if (!t.userId) { t.userId = adminUser.id; changed = true; } });
  db.customCategories.forEach(c => { if (!c.userId) { c.userId = adminUser.id; changed = true; } });
  if (changed) writeDb(db);
}

/* ── Users ── */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verify;
}

function createUser(username, password, name) {
  const db = readDb();
  if (db.users.find(u => u.username === username)) return null;
  const user = { id: 'user_' + Date.now(), username, name, passwordHash: hashPassword(password) };
  db.users.push(user);
  writeDb(db);
  migrateLegacyData();
  return user;
}

function getUserByUsername(username) {
  return readDb().users.find(u => u.username === username) || null;
}

function getUserById(id) {
  return readDb().users.find(u => u.id === id) || null;
}

/* ── Transactions ── */

function getAllTransactions(userId) {
  return readDb().transactions.filter(t => t.userId === userId);
}

function addTransaction(t) {
  const db = readDb();
  db.transactions.push(t);
  writeDb(db);
  return t;
}

function updateTransaction(id, t) {
  const db = readDb();
  const idx = db.transactions.findIndex(x => x.id === id);
  if (idx !== -1) {
    db.transactions[idx] = { ...db.transactions[idx], ...t };
    writeDb(db);
  }
}

function deleteTransaction(id) {
  const db = readDb();
  db.transactions = db.transactions.filter(x => x.id !== id);
  writeDb(db);
}

/* ── Custom Categories ── */

function getCustomCategories(userId) {
  return readDb().customCategories.filter(c => c.userId === userId);
}

function addCustomCategory(c) {
  const db = readDb();
  db.customCategories.push(c);
  writeDb(db);
  return c;
}

function deleteCustomCategory(id) {
  const db = readDb();
  db.customCategories = db.customCategories.filter(x => x.id !== id);
  writeDb(db);
}

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  verifyPassword,
  getAllTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getCustomCategories,
  addCustomCategory,
  deleteCustomCategory,
  migrateLegacyData,
};

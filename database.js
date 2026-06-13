const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.json');

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { transactions: [], customCategories: [] };
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/* ── Transactions ── */

function getAllTransactions() {
  return readDb().transactions;
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

function getCustomCategories() {
  return readDb().customCategories;
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
  getAllTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getCustomCategories,
  addCustomCategory,
  deleteCustomCategory,
};

const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let client, db;

async function connect(uri) {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db('expenses');
  await migrateFromJson();
}

async function migrateFromJson() {
  const jsonPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(jsonPath)) return;
  try {
    const legacy = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (legacy.users?.length) await db.collection('users').insertMany(legacy.users);
    if (legacy.transactions?.length) await db.collection('transactions').insertMany(legacy.transactions);
    if (legacy.customCategories?.length) await db.collection('customCategories').insertMany(legacy.customCategories);
    fs.renameSync(jsonPath, jsonPath + '.bak');
    console.log('Migrated legacy data.json to MongoDB');
  } catch (e) {
    console.log('Migration skipped:', e.message);
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  return hash === crypto.scryptSync(password, salt, 64).toString('hex');
}

async function createUser(username, password, name) {
  const existing = await db.collection('users').findOne({ username });
  if (existing) return null;
  const user = { id: 'user_' + Date.now(), username, name, passwordHash: hashPassword(password) };
  await db.collection('users').insertOne(user);
  return user;
}

async function getUserByUsername(username) {
  return db.collection('users').findOne({ username });
}

async function getUserById(id) {
  return db.collection('users').findOne({ id });
}

async function getAllTransactions(userId) {
  return db.collection('transactions').find({ userId }).sort({ date: -1 }).toArray();
}

async function addTransaction(t) {
  await db.collection('transactions').insertOne(t);
  return t;
}

async function updateTransaction(id, t) {
  await db.collection('transactions').updateOne({ id }, { $set: t });
}

async function deleteTransaction(id) {
  await db.collection('transactions').deleteOne({ id });
}

async function getCustomCategories(userId) {
  return db.collection('customCategories').find({ userId }).sort({ label: 1 }).toArray();
}

async function addCustomCategory(c) {
  await db.collection('customCategories').insertOne(c);
  return c;
}

async function deleteCustomCategory(id) {
  await db.collection('customCategories').deleteOne({ id });
}

module.exports = {
  connect,
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
};

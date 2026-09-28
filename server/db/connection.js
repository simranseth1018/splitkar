const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'expense.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migration: add phone column if missing
try {
  db.prepare("SELECT phone FROM members LIMIT 0").run();
} catch {
  db.exec("ALTER TABLE members ADD COLUMN phone TEXT DEFAULT ''");
}

// Migration: add email column if missing
try {
  db.prepare("SELECT email FROM members LIMIT 0").run();
} catch {
  db.exec("ALTER TABLE members ADD COLUMN email TEXT DEFAULT ''");
}

// Migration: add user_id column to members
try {
  db.prepare("SELECT user_id FROM members LIMIT 0").run();
} catch {
  db.exec("ALTER TABLE members ADD COLUMN user_id INTEGER REFERENCES users(id)");
}

// Migration: add created_by column to groups
try {
  db.prepare("SELECT created_by FROM groups LIMIT 0").run();
} catch {
  db.exec("ALTER TABLE groups ADD COLUMN created_by INTEGER REFERENCES users(id)");
}

// Migration: add expense_date column to expenses
try {
  db.prepare("SELECT expense_date FROM expenses LIMIT 0").run();
} catch {
  db.exec("ALTER TABLE expenses ADD COLUMN expense_date TEXT");
  db.exec("UPDATE expenses SET expense_date = date(created_at) WHERE expense_date IS NULL");
}

module.exports = db;

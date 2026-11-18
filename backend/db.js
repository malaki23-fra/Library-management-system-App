const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'library.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    membership_id TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'member')),
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    genre TEXT,
    isbn TEXT UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('add', 'borrow', 'return')),
    quantity INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`);

// Seed default admin if no users
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (name, membership_id, role, password)
    VALUES (?, ?, ?, ?)
  `).run('Admin User', 'ADMIN001', 'admin', hashedPassword);

  // Seed some sample books
  const insertBook = db.prepare(`
    INSERT INTO books (title, author, genre, isbn, quantity)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertBook.run('The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', '978-0743273565', 5);
  insertBook.run('To Kill a Mockingbird', 'Harper Lee', 'Fiction', '978-0061120084', 3);
  insertBook.run('1984', 'George Orwell', 'Dystopian', '978-0451524935', 1);
  insertBook.run('Pride and Prejudice', 'Jane Austen', 'Romance', '978-0141439518', 4);
  insertBook.run('The Hobbit', 'J.R.R. Tolkien', 'Fantasy', '978-0547928227', 2);

  console.log('Database seeded with default admin (membership_id: ADMIN001, password: admin123) and sample books.');
}

module.exports = db;

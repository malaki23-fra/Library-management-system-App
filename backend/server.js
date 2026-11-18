require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'library-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ========== AUTH ROUTES ==========
app.post('/api/auth/login', (req, res) => {
  try {
    const { membership_id, password } = req.body;
    if (!membership_id || !password) {
      return res.status(400).json({ error: 'Membership ID and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE membership_id = ?').get(membership_id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, membership_id: user.membership_id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        membership_id: user.membership_id,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== BOOKS ROUTES ==========
// Get all books
app.get('/api/books', (req, res) => {
  try {
    const books = db.prepare('SELECT * FROM books ORDER BY title').all();
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Get single book
app.get('/api/books/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Create book
app.post('/api/books', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, author, genre, isbn, quantity } = req.body;
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }
    const qty = parseInt(quantity) || 0;

    const result = db.prepare(`
      INSERT INTO books (title, author, genre, isbn, quantity)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, author, genre || null, isbn || null, qty);

    // Log transaction if quantity > 0
    if (qty > 0) {
      db.prepare(`
        INSERT INTO transactions (book_id, user_id, type, quantity, notes)
        VALUES (?, ?, 'add', ?, ?)
      `).run(result.lastInsertRowid, req.user.id, qty, 'Initial stock');
    }

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(book);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'ISBN already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

// Update book
app.put('/api/books/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, author, genre, isbn, quantity } = req.body;
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    db.prepare(`
      UPDATE books
      SET title = ?, author = ?, genre = ?, isbn = ?, quantity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || book.title,
      author || book.author,
      genre !== undefined ? genre : book.genre,
      isbn !== undefined ? isbn : book.isbn,
      quantity !== undefined ? parseInt(quantity) : book.quantity,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'ISBN already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// Delete book
app.delete('/api/books/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// ========== TRANSACTIONS ROUTES ==========
// Get all transactions
app.get('/api/transactions', authenticateToken, (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT t.*, b.title as book_title, u.name as user_name
      FROM transactions t
      LEFT JOIN books b ON t.book_id = b.id
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `).all();
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Add stock
app.post('/api/transactions/add-stock', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { book_id, quantity, notes } = req.body;
    if (!book_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid book_id and positive quantity required' });
    }

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    db.prepare('UPDATE books SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(quantity, book_id);

    const result = db.prepare(`
      INSERT INTO transactions (book_id, user_id, type, quantity, notes)
      VALUES (?, ?, 'add', ?, ?)
    `).run(book_id, req.user.id, quantity, notes || 'Stock added');

    const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
    res.status(201).json({ transaction_id: result.lastInsertRowid, book: updatedBook });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// Borrow book (deduct stock)
app.post('/api/transactions/borrow', authenticateToken, (req, res) => {
  try {
    const { book_id, quantity, notes } = req.body;
    const qty = parseInt(quantity) || 1;
    if (!book_id || qty <= 0) {
      return res.status(400).json({ error: 'Valid book_id and positive quantity required' });
    }

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.quantity < qty) {
      return res.status(400).json({ error: `Not enough stock. Available: ${book.quantity}` });
    }

    db.prepare('UPDATE books SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(qty, book_id);

    const result = db.prepare(`
      INSERT INTO transactions (book_id, user_id, type, quantity, notes)
      VALUES (?, ?, 'borrow', ?, ?)
    `).run(book_id, req.user.id, qty, notes || 'Book borrowed');

    const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
    res.status(201).json({ transaction_id: result.lastInsertRowid, book: updatedBook });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to borrow book' });
  }
});

// Return book (add stock back)
app.post('/api/transactions/return', authenticateToken, (req, res) => {
  try {
    const { book_id, quantity, notes } = req.body;
    const qty = parseInt(quantity) || 1;
    if (!book_id || qty <= 0) {
      return res.status(400).json({ error: 'Valid book_id and positive quantity required' });
    }

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    db.prepare('UPDATE books SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(qty, book_id);

    const result = db.prepare(`
      INSERT INTO transactions (book_id, user_id, type, quantity, notes)
      VALUES (?, ?, 'return', ?, ?)
    `).run(book_id, req.user.id, qty, notes || 'Book returned');

    const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
    res.status(201).json({ transaction_id: result.lastInsertRowid, book: updatedBook });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to return book' });
  }
});

// ========== USERS ROUTES ==========
// Get all users (admin only)
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, membership_id, role, created_at FROM users ORDER BY name').all();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user (admin only)
app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, membership_id, role, password } = req.body;
    if (!name || !membership_id || !password) {
      return res.status(400).json({ error: 'Name, membership_id and password are required' });
    }
    const userRole = role === 'admin' ? 'admin' : 'member';
    const hashed = bcrypt.hashSync(password, 10);

    const result = db.prepare(`
      INSERT INTO users (name, membership_id, role, password)
      VALUES (?, ?, ?, ?)
    `).run(name, membership_id, userRole, hashed);

    const user = db.prepare('SELECT id, name, membership_id, role, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Membership ID already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
app.put('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, membership_id, role, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let hashed = user.password;
    if (password) {
      hashed = bcrypt.hashSync(password, 10);
    }

    db.prepare(`
      UPDATE users
      SET name = ?, membership_id = ?, role = ?, password = ?
      WHERE id = ?
    `).run(
      name || user.name,
      membership_id || user.membership_id,
      role === 'admin' || role === 'member' ? role : user.role,
      hashed,
      req.params.id
    );

    const updated = db.prepare('SELECT id, name, membership_id, role, created_at FROM users WHERE id = ?')
      .get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Membership ID already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Dashboard stats
app.get('/api/dashboard', authenticateToken, (req, res) => {
  try {
    const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
    const totalStock = db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM books').get().total;
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM books WHERE quantity < 2').get().count;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const recentTransactions = db.prepare(`
      SELECT t.*, b.title as book_title
      FROM transactions t
      LEFT JOIN books b ON t.book_id = b.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `).all();

    res.json({
      totalBooks,
      totalStock,
      lowStock,
      totalUsers,
      recentTransactions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Library API is running' });
});

// Read-only database browser for administrators; password hashes are never exposed.
app.get('/api/database', authenticateToken, requireAdmin, (req, res) => {
  try {
    const tables = [
      { name: 'books', columns: ['id', 'title', 'author', 'genre', 'isbn', 'quantity', 'created_at', 'updated_at'] },
      { name: 'users', columns: ['id', 'name', 'membership_id', 'role', 'created_at'] },
      { name: 'transactions', columns: ['id', 'book_id', 'user_id', 'type', 'quantity', 'notes', 'created_at'] }
    ].map(({ name, columns }) => ({
      name,
      columns,
      rows: db.prepare(`SELECT ${columns.join(', ')} FROM ${name} ORDER BY id DESC LIMIT 500`).all(),
      total: db.prepare(`SELECT COUNT(*) AS count FROM ${name}`).get().count
    }));
    res.json({ database: 'SQLite (library.db)', tables });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read database' });
  }
});

// Return JSON for unknown API paths instead of an empty Express 404.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve the built browser app from the same backend port for a one-command setup.
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.listen(PORT, () => {
  console.log(`Library backend running on http://localhost:${PORT}`);
});

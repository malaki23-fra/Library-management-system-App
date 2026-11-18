import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [books, setBooks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashData, booksData] = await Promise.all([
          authFetch('/dashboard'),
          authFetch('/books')
        ]);
        setStats(dashData);
        setBooks(booksData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="error-msg">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="value">{stats.totalBooks}</div>
          <div className="label">Total Books</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.totalStock}</div>
          <div className="label">Total Stock</div>
        </div>
        <div className={`stat-card ${stats.lowStock > 0 ? 'warning' : ''}`}>
          <div className="value">{stats.lowStock}</div>
          <div className="label">Low Stock (&lt;2)</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.totalUsers}</div>
          <div className="label">Users</div>
        </div>
      </div>

      <div className="card">
        <h2>Book Availability</h2>
        {books.length === 0 ? (
          <div className="empty-state">
            <p>No books yet.</p>
            <Link to="/books" className="btn btn-primary">Add Books</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Genre</th>
                  <th>ISBN</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={book.id} className={book.quantity < 2 ? 'low-stock' : ''}>
                    <td>{book.title}</td>
                    <td>{book.author}</td>
                    <td>{book.genre || '—'}</td>
                    <td>{book.isbn || '—'}</td>
                    <td>
                      <strong style={{ color: book.quantity < 2 ? '#dc2626' : 'inherit' }}>
                        {book.quantity}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {stats.recentTransactions?.length > 0 && (
        <div className="card">
          <h2>Recent Transactions</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTransactions.map((t) => (
                  <tr key={t.id}>
                    <td>{t.book_title || '—'}</td>
                    <td>
                      <span className={`badge badge-${t.type}`}>{t.type}</span>
                    </td>
                    <td>{t.quantity}</td>
                    <td>{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

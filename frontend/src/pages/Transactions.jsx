import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Transactions() {
  const { authFetch, isAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [action, setAction] = useState(null); // 'add' | 'borrow' | 'return'
  const [form, setForm] = useState({ book_id: '', quantity: 1, notes: '' });

  const load = async () => {
    try {
      const [txData, booksData] = await Promise.all([
        authFetch('/transactions'),
        authFetch('/books')
      ]);
      setTransactions(txData);
      setBooks(booksData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAction = (type) => {
    setAction(type);
    setForm({ book_id: '', quantity: 1, notes: '' });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const endpoint = action === 'add' ? '/transactions/add-stock'
        : action === 'borrow' ? '/transactions/borrow'
        : '/transactions/return';
      
      await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          book_id: parseInt(form.book_id),
          quantity: parseInt(form.quantity),
          notes: form.notes
        })
      });
      setSuccess(`${action === 'add' ? 'Stock added' : action === 'borrow' ? 'Book borrowed' : 'Book returned'} successfully`);
      setAction(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading transactions...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Transactions</h1>
        <div className="btn-group">
          {isAdmin && (
            <button className="btn btn-success" onClick={() => openAction('add')}>+ Add Stock</button>
          )}
          <button className="btn btn-primary" onClick={() => openAction('borrow')}>Borrow</button>
          <button className="btn btn-secondary" onClick={() => openAction('return')}>Return</button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <div className="card">
        <h2>Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Book</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>User</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.created_at).toLocaleString()}</td>
                    <td>{t.book_title || '—'}</td>
                    <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                    <td>{t.quantity}</td>
                    <td>{t.user_name || '—'}</td>
                    <td>{t.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {action && (
        <div className="modal-overlay" onClick={() => setAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {action === 'add' ? 'Add Stock' : action === 'borrow' ? 'Borrow Book' : 'Return Book'}
            </h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Book *</label>
                <select
                  value={form.book_id}
                  onChange={(e) => setForm({ ...form, book_id: e.target.value })}
                  required
                >
                  <option value="">Select a book</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} (Stock: {b.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setAction(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

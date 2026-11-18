import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Books() {
  const { authFetch, isAdmin } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', author: '', genre: '', isbn: '', quantity: 0
  });

  const loadBooks = async () => {
    try {
      const data = await authFetch('/books');
      setBooks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBooks(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', author: '', genre: '', isbn: '', quantity: 0 });
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (book) => {
    setEditing(book);
    setForm({
      title: book.title,
      author: book.author,
      genre: book.genre || '',
      isbn: book.isbn || '',
      quantity: book.quantity
    });
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editing) {
        await authFetch(`/books/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
        setSuccess('Book updated successfully');
      } else {
        await authFetch('/books', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        setSuccess('Book added successfully');
      }
      setShowModal(false);
      loadBooks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await authFetch(`/books/${id}`, { method: 'DELETE' });
      setSuccess('Book deleted');
      loadBooks();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading books...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Book Management</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openAdd}>+ Add Book</button>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <div className="card">
        {books.length === 0 ? (
          <div className="empty-state">
            <p>No books in the library yet.</p>
            {isAdmin && <button className="btn btn-primary" onClick={openAdd}>Add your first book</button>}
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
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={book.id} className={book.quantity < 2 ? 'low-stock' : ''}>
                    <td>{book.title}</td>
                    <td>{book.author}</td>
                    <td>{book.genre || '—'}</td>
                    <td>{book.isbn || '—'}</td>
                    <td><strong>{book.quantity}</strong></td>
                    {isAdmin && (
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-sm btn-secondary" onClick={() => openEdit(book)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(book.id)}>Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit Book' : 'Add New Book'}</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Author *</label>
                <input
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Genre</label>
                  <input
                    value={form.genre}
                    onChange={(e) => setForm({ ...form, genre: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>ISBN</label>
                  <input
                    value={form.isbn}
                    onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Book'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

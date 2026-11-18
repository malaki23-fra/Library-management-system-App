import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { authFetch } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', membership_id: '', role: 'member', password: ''
  });

  const loadUsers = async () => {
    try {
      const data = await authFetch('/users');
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', membership_id: '', role: 'member', password: '' });
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name,
      membership_id: user.membership_id,
      role: user.role,
      password: ''
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
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await authFetch(`/users/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setSuccess('User updated successfully');
      } else {
        if (!form.password) {
          setError('Password is required for new users');
          return;
        }
        await authFetch('/users', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        setSuccess('User created successfully');
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await authFetch(`/users/${id}`, { method: 'DELETE' });
      setSuccess('User deleted');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>User Management</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add User</button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <div className="card">
        {users.length === 0 ? (
          <div className="empty-state"><p>No users found.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Membership ID</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.membership_id}</td>
                    <td>
                      <span className={`badge badge-${user.role}`}>{user.role}</span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(user)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}>Delete</button>
                      </div>
                    </td>
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
            <h2>{editing ? 'Edit User' : 'Add New User'}</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Membership ID *</label>
                <input
                  value={form.membership_id}
                  onChange={(e) => setForm({ ...form, membership_id: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editing}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

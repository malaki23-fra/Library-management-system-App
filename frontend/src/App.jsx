import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Transactions from './pages/Transactions';
import Users from './pages/Users';
import Database from './pages/Database';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="login-page">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h1>📚 Library MS</h1>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/books">Books</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          {isAdmin && <NavLink to="/users">Users</NavLink>}
          {isAdmin && <NavLink to="/database">Database</NavLink>}
        </nav>
        <div className="user-info">
          <div>
            <div style={{ color: 'white', fontWeight: 500 }}>{user?.name}</div>
            <span>{user?.role}</span>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="login-page">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/books" element={
        <ProtectedRoute>
          <Layout><Books /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/transactions" element={
        <ProtectedRoute>
          <Layout><Transactions /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute adminOnly>
          <Layout><Users /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/database" element={
        <ProtectedRoute adminOnly>
          <Layout><Database /></Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

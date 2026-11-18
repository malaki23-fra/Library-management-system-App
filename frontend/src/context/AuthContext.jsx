import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = '/api';

async function readJsonResponse(res) {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`The server returned an empty response (HTTP ${res.status}). Check that the library backend is running on port 5002.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`The server returned an invalid response (HTTP ${res.status}). Check that the frontend proxy points to the library backend on port 5002.`);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (token && stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, [token]);

  const login = async (membership_id, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membership_id, password })
    });
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || 'Login failed');
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}${url}`, { ...options, headers });
    const data = await readJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        logout();
      }
      throw new Error(data.error || 'Request failed');
    }
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authFetch, loading, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

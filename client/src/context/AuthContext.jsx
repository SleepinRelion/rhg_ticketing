import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setTokens, clearTokens, setLogoutHandler } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    api('/auth/logout', { method: 'POST' }).catch(() => {});
    clearTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    setLogoutHandler(logout);

    // Verify token on mount
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api'}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          } else if (res.status === 401) {
            // Token is truly invalid — log out
            clearTokens();
            setUser(null);
          } else {
            // Server error (500, 503, etc.) — keep existing session, don't kick user out
            const stored = localStorage.getItem('user');
            if (stored) setUser(JSON.parse(stored));
          }
        })
        .catch(() => {
          // Network error — keep existing session
          const stored = localStorage.getItem('user');
          if (stored) setUser(JSON.parse(stored));
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [logout]);

  const login = async (email, password, mfaCode, emailConfirm) => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, mfaCode, _email_confirm: emailConfirm }),
    });

    if (data.mfaRequired) {
      return { mfaRequired: true };
    }

    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    return { success: true, user: data.user };
  };

  const hasRole = (...roles) => user && roles.includes(user.role);
  const isAdmin = () => hasRole('admin');
  const isManager = () => hasRole('admin', 'manager');
  const isTechnician = () => hasRole('admin', 'manager', 'technician');

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasRole, isAdmin, isManager, isTechnician }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;

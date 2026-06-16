import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setTokens, clearTokens, setLogoutHandler } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('user');
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
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      api('/auth/me')
        .then((data) => {
          setUser(data.user);
          sessionStorage.setItem('user', JSON.stringify(data.user));
        })
        .catch(() => {
          clearTokens();
          setUser(null);
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
    sessionStorage.setItem('user', JSON.stringify(data.user));
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

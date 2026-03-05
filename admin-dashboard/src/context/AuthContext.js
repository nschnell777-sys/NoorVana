import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminLogin, adminLogout } from '../services/api';

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem('admin');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    adminLogout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    localStorage.removeItem('loginTime');
    setToken(null);
    setAdmin(null);
  }, []);

  // Session timeout check
  useEffect(() => {
    if (!token) return;

    const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
    const elapsed = Date.now() - loginTime;

    if (elapsed >= SESSION_TIMEOUT_MS) {
      logout();
      return;
    }

    const timer = setTimeout(() => logout(), SESSION_TIMEOUT_MS - elapsed);
    return () => clearTimeout(timer);
  }, [token, logout]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await adminLogin(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('admin', JSON.stringify(data.admin));
      localStorage.setItem('loginTime', Date.now().toString());
      setToken(data.token);
      setAdmin(data.admin);
      return data;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ token, admin, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

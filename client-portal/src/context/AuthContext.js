import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clientLogin as apiLogin, clientLogout as apiLogout, verify2FA as apiVerify2FA } from '../services/api';

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('client_token'));
  const [client, setClient] = useState(() => {
    const stored = localStorage.getItem('client_data');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    apiLogout().catch(() => {});
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_data');
    localStorage.removeItem('client_loginTime');
    setToken(null);
    setClient(null);
  }, []);

  const updateClient = useCallback((updates) => {
    setClient((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem('client_data', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Session timeout check
  useEffect(() => {
    if (!token) return;

    const loginTime = parseInt(localStorage.getItem('client_loginTime') || '0', 10);
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
      const { data } = await apiLogin(email, password);

      // If 2FA is required, return without storing token
      if (data.requires_2fa) {
        return data;
      }

      localStorage.setItem('client_token', data.token);
      localStorage.setItem('client_data', JSON.stringify(data.client));
      localStorage.setItem('client_loginTime', Date.now().toString());
      setToken(data.token);
      setClient(data.client);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const complete2FALogin = async (tempToken, code) => {
    setLoading(true);
    try {
      const { data } = await apiVerify2FA(tempToken, code);
      localStorage.setItem('client_token', data.token);
      localStorage.setItem('client_data', JSON.stringify(data.client));
      localStorage.setItem('client_loginTime', Date.now().toString());
      setToken(data.token);
      setClient(data.client);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const isUnenrolled = client?.is_active === false;

  const value = {
    token,
    client,
    loading,
    login,
    complete2FALogin,
    logout,
    updateClient,
    isAuthenticated: !!token,
    isUnenrolled
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

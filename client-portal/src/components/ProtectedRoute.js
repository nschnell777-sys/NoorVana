import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, client } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to setup if not completed (but don't redirect if already on /setup)
  if (client && client.setup_completed === false && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  return children;
};

export default ProtectedRoute;

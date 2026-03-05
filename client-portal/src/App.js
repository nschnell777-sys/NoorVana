import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import RedeemRewardsPage from './pages/RedeemRewardsPage';
import BenefitsPage from './pages/BenefitsPage';
import OffersPage from './pages/OffersPage';
import AccountPage from './pages/AccountPage';
import SetupPage from './pages/SetupPage';

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
    <Route
      path="/*"
      element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/redeem" element={<RedeemRewardsPage />} />
              <Route path="/benefits" element={<BenefitsPage />} />
              <Route path="/offers" element={<OffersPage />} />
              <Route path="/account" element={<AccountPage />} />
              {/* Redirects for old URLs */}
              <Route path="/rewards-store" element={<Navigate to="/redeem" replace />} />
              <Route path="/redemptions" element={<Navigate to="/redeem" replace />} />
              <Route path="/community" element={<Navigate to="/offers" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      }
    />
  </Routes>
);

export default App;

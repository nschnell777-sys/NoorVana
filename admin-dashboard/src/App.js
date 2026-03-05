import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientListPage from './pages/ClientListPage';
import ClientDetailPage from './pages/ClientDetailPage';
import ReportsPage from './pages/ReportsPage';
import FulfillmentCenterPage from './pages/FulfillmentCenterPage';
import OffersPage from './pages/OffersPage';
import TransactionsPage from './pages/TransactionsPage';
import AxisCareSyncPage from './pages/AxisCareSyncPage';
import MarketsPage from './pages/MarketsPage';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/clients" element={<ClientListPage />} />
                <Route path="/clients/:id" element={<ClientDetailPage />} />
                <Route path="/markets" element={<MarketsPage />} />
                <Route path="/redemptions" element={<FulfillmentCenterPage />} />
                <Route path="/fulfillment" element={<Navigate to="/redemptions" replace />} />
                <Route path="/card-requests" element={<Navigate to="/redemptions" replace />} />
                <Route path="/gift-claims" element={<Navigate to="/redemptions" replace />} />
                <Route path="/concierge" element={<Navigate to="/redemptions" replace />} />
                <Route path="/offers" element={<OffersPage />} />
                <Route path="/axiscare" element={<AxisCareSyncPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;


import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/authContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AsinAnalytics } from './pages/AsinAnalytics';
import { AsinDatewise } from './pages/AsinDatewise';
import { AccessDenied } from './pages/AccessDenied';
import { Welcome } from './pages/Welcome';
import { AccountHistory } from './pages/AccountHistory';

function App() {
  return (
    <AuthProvider>
      {/* HashRouter is required for standard static hosting/previews to prevent 404 on refresh */}
      <HashRouter>
        <Routes>
            {/* Welcome page stands alone outside main layout */}
            <Route path="/" element={<Welcome />} />
            
            {/* Main App Routes */}
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/history" element={<Layout><AccountHistory /></Layout>} />
            
            {/* New Deep Dive Structure */}
            <Route path="/analytics" element={<Layout><AsinAnalytics /></Layout>} />
            <Route path="/analytics/:asin" element={<Layout><AsinAnalytics /></Layout>} />
            <Route path="/analytics/:asin/pivot" element={<Layout><AsinDatewise /></Layout>} />
            
            <Route path="/no-access" element={<AccessDenied />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;

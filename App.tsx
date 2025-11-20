import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/authContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AsinDetail } from './pages/AsinDetail';
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
            <Route path="/asin/:asin" element={<Layout><AsinDetail /></Layout>} />
            <Route path="/asin/:asin/datewise" element={<Layout><AsinDatewise /></Layout>} />
            
            <Route path="/no-access" element={<AccessDenied />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
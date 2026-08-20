import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Journal from './pages/Journal';
import Relaxation from './pages/Relaxation';
import Settings from './pages/Settings';
import TherapistDashboard from './pages/TherapistDashboard';
import AdminDashboard from './pages/AdminDashboard';
import VideoAnalyzer from './components/VideoAnalyzer';
import VoiceChat from './components/VoiceChat';
import api from './api';

// Protected Route component
const ProtectedRoute = ({ user, children, allowedRoles = ['user', 'therapist', 'admin'] }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/auth" replace />;
  if (user && !allowedRoles.includes(user.role)) {
    // Redirect if they try to access something they aren't allowed to
    return <Navigate to={user.role === 'user' ? '/' : '/therapist'} replace />;
  }
  return children;
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Validate the persisted session before rendering protected pages.
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const restoreSession = async () => {
      if (storedUser && token) {
        try {
          const response = await api.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (err) {
          console.warn('Stored session is no longer valid.', err);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    restoreSession();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleUserUpdate = (updatedUserData) => {
    setUser(updatedUserData);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#070b13] text-cyan-400 gap-3">
        <span className="material-icons animate-spin text-4xl">sync</span>
        <span className="text-sm font-semibold uppercase tracking-wider">Loading Session Context...</span>
      </div>
    );
  }

  const isAuthPage = location.pathname === '/auth';

  return (
    <div className="min-h-screen bg-[#0b0f19] flex">
      {/* Conditionally render sidebar if logged in & not auth page */}
      {user && !isAuthPage && (
        <Sidebar user={user} onLogout={handleLogout} />
      )}

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Conditionally render navbar */}
        {user && !isAuthPage && (
          <Navbar user={user} />
        )}

        {/* Page Content area */}
        <main className={`flex-1 ${user && !isAuthPage ? 'pl-64' : ''}`}>
          <Routes>
            <Route path="/auth" element={
              user ? <Navigate to={user.role === 'user' ? '/' : '/therapist'} replace /> : <Auth onLoginSuccess={handleLoginSuccess} />
            } />
            
            <Route path="/" element={
              <ProtectedRoute user={user} allowedRoles={['user', 'therapist', 'admin']}>
                {user?.role === 'user' ? <Dashboard /> : <Navigate to="/therapist" replace />}
              </ProtectedRoute>
            } />

            <Route path="/chat" element={
              <ProtectedRoute user={user} allowedRoles={['user']}>
                <Chat />
              </ProtectedRoute>
            } />

            <Route path="/journal" element={
              <ProtectedRoute user={user} allowedRoles={['user']}>
                <Journal />
              </ProtectedRoute>
            } />

            <Route path="/relaxation" element={
              <ProtectedRoute user={user} allowedRoles={['user']}>
                <Relaxation />
              </ProtectedRoute>
            } />

            <Route path="/video" element={
              <ProtectedRoute user={user} allowedRoles={['user']}>
                <div className="p-8 max-w-4xl mx-auto space-y-6">
                  <div className="glass-card rounded-2xl p-6 border border-gray-850">
                    <h2 className="text-xl font-extrabold text-white">Aesthetic video analysis</h2>
                    <p className="text-xs text-gray-400">Sit upright, face the camera, and track concentration curves in real time</p>
                  </div>
                  <VideoAnalyzer />
                </div>
              </ProtectedRoute>
            } />

            <Route path="/voice" element={
              <ProtectedRoute user={user} allowedRoles={['user']}>
                <div className="p-8 max-w-4xl mx-auto space-y-6">
                  <div className="glass-card rounded-2xl p-6 border border-gray-850">
                    <h2 className="text-xl font-extrabold text-white">Voice analysis</h2>
                    <p className="text-xs text-gray-400">Speak into your microphone. Let Librosa evaluate your speech speed, energy, and volume</p>
                  </div>
                  <VoiceChat />
                </div>
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute user={user} allowedRoles={['user', 'therapist', 'admin']}>
                <Settings user={user} onUserUpdate={handleUserUpdate} onLogout={handleLogout} />
              </ProtectedRoute>
            } />

            <Route path="/therapist" element={
              <ProtectedRoute user={user} allowedRoles={['therapist', 'admin']}>
                <TherapistDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Fallback Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;

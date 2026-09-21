import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import AdminDashboard from './components/admin/AdminDashboard';
import FairGradeDashboard from './components/fairgrade/FairGradeDashboard';
import StudentPortal from './components/student/StudentPortal';

import ProtectedRoute from './components/auth/ProtectedRoute';

import TeacherLayout from './components/teacher/TeacherLayout';
import StudentLayout from './components/student/StudentLayout';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('skillforge_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState(() => {
    try {
      const stored = localStorage.getItem('skillforge_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role === 'ADMIN') return 'admin-dashboard';
        if (parsed.role === 'TEACHER') return 'teacher-dashboard';
        return 'student-dashboard';
      }
    } catch {}
    return 'login';
  });

  const [resetTokenForFlow, setResetTokenForFlow] = useState('');

  // Validate session token on mount
  useEffect(() => {
    const token = localStorage.getItem('skillforge_token');
    if (token && user) {
      fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data) {
            setUser(json.data);
            localStorage.setItem('skillforge_user', JSON.stringify(json.data));
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleLoginSuccess = (authenticatedUser, token) => {
    setUser(authenticatedUser);
    const role = authenticatedUser.role?.toUpperCase();

    // Direct role-based redirection to respective dashboards
    if (role === 'ADMIN') {
      setCurrentView('admin-dashboard');
    } else if (role === 'TEACHER') {
      setCurrentView('teacher-dashboard');
    } else {
      setCurrentView('student-dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('skillforge_token');
    localStorage.removeItem('skillforge_user');
    setUser(null);
    setCurrentView('login');
  };

  const isPortalView = currentView === 'admin-dashboard' || currentView === 'teacher-dashboard' || currentView === 'student-dashboard';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        user={user}
        currentView={currentView}
        onNavigate={setCurrentView}
        onLogout={handleLogout}
      />

      <main style={{ flex: 1, padding: isPortalView || currentView === 'login' || currentView === 'forgot-password' || currentView === 'reset-password' ? '0' : '1rem' }}>
        {/* Auth Views */}
        {currentView === 'login' && (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onNavigateToForgot={() => setCurrentView('forgot-password')}
          />
        )}

        {currentView === 'forgot-password' && (
          <ForgotPassword
            onNavigateToLogin={() => setCurrentView('login')}
            onNavigateToReset={(token) => {
              setResetTokenForFlow(token);
              setCurrentView('reset-password');
            }}
          />
        )}

        {currentView === 'reset-password' && (
          <ResetPassword
            initialToken={resetTokenForFlow}
            onNavigateToLogin={() => setCurrentView('login')}
          />
        )}

        {/* Role Dashboards - Guarded by ProtectedRoute */}
        {currentView === 'admin-dashboard' && (
          <ProtectedRoute
            user={user}
            allowedRoles={['ADMIN']}
            onNavigate={setCurrentView}
            onLoginSuccess={handleLoginSuccess}
          >
            <AdminDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        )}

        {currentView === 'teacher-dashboard' && (
          <ProtectedRoute
            user={user}
            allowedRoles={['TEACHER', 'ADMIN']}
            onNavigate={setCurrentView}
            onLoginSuccess={handleLoginSuccess}
          >
            <TeacherLayout user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        )}

        {currentView === 'student-dashboard' && (
          <ProtectedRoute
            user={user}
            allowedRoles={['STUDENT', 'TEACHER', 'ADMIN']}
            onNavigate={setCurrentView}
            onLoginSuccess={handleLoginSuccess}
          >
            <StudentLayout user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        )}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '1.25rem 2rem',
          textAlign: 'center',
          fontSize: '0.785rem',
          color: 'var(--color-text-muted)',
          background: 'var(--color-bg-subtle)',
        }}
      >
        SkillForge AI • Adaptive Classroom Platform • Enterprise Role-Based Access Control & FairGrade Evaluation Engine
      </footer>
    </div>
  );
}

import React from 'react';

export default function Unauthorized({ user, onNavigate }) {
  const getDashboardView = () => {
    if (!user) return 'login';
    const role = user.role?.toUpperCase();
    if (role === 'ADMIN') return 'admin-dashboard';
    if (role === 'TEACHER') return 'teacher-dashboard';
    return 'student-dashboard';
  };

  const getDashboardLabel = () => {
    if (!user) return 'Sign In';
    const role = user.role?.toUpperCase();
    if (role === 'ADMIN') return '👑 Go to Admin Console';
    if (role === 'TEACHER') return '👨‍🏫 Go to Teacher Portal';
    return '🎓 Go to Student Portal';
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '70vh',
        padding: '2rem',
      }}
    >
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '520px', width: '100%', padding: '3rem', textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid var(--danger)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            color: 'var(--danger)',
            marginBottom: '1.5rem',
          }}
        >
          🚫
        </div>

        <div className="badge badge-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
          403 Forbidden • Access Denied
        </div>

        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Unauthorized Access Attempt</h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Your active account role (<strong>{user?.role || 'ANONYMOUS'}</strong>) does not have sufficient permissions to view or interact with this restricted route. Role-Based Access Control (RBAC) is strictly enforced on both the client and backend API.
        </p>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div><strong>User Account:</strong> {user?.name || 'Unauthenticated'} ({user?.email || 'N/A'})</div>
          <div><strong>Assigned Role:</strong> {user?.role || 'NONE'}</div>
          <div><strong>Security Policy:</strong> Route Guard Enforced</div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate(getDashboardView())}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.85rem', fontWeight: 600 }}
        >
          {getDashboardLabel()}
        </button>
      </div>
    </div>
  );
}

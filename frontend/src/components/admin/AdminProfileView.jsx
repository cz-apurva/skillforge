import React from 'react';

export default function AdminProfileView({ user }) {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>👤 Administrator Profile & Credentials</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Active administrator account credentials, permissions, and security session attributes.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '680px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.2)',
              border: '2px solid var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
            }}
          >
            👑
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{user?.name || user?.email || 'Administrator'}</h3>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{user?.email || ''}</div>
            <span className="badge badge-warning" style={{ marginTop: '0.4rem' }}>Role: {user?.role || 'ADMIN'} (Full Oversight)</span>
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Account ID:</span>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{user?.id || 'N/A'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Department:</span>
            <strong>Platform Infrastructure & Governance</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cryptographic Authentication:</span>
            <strong style={{ color: 'var(--success)' }}>JWT Bearer (Bcrypt Verified)</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>RBAC Policy:</span>
            <strong style={{ color: '#60a5fa' }}>Platform Admin • Zero Academic Mutation</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

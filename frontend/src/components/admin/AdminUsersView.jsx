import React, { useState, useEffect } from 'react';

export default function AdminUsersView({ defaultRole = 'ALL', title = 'User Management' }) {
  const [users, setUsers] = useState([
    { id: 'usr-1', name: 'Platform Administrator', email: 'admin@skillforge.ai', role: 'ADMIN', status: 'active', department: 'IT & Platform Administration', created_at: '2026-08-01' },
    { id: 'usr-2', name: 'Prof. A. Anupam', email: 'teacher@skillforge.ai', role: 'TEACHER', status: 'active', department: 'Computer Science & Engineering', created_at: '2026-08-10' },
    { id: 'usr-3', name: 'Alice Smith', email: 'student@skillforge.ai', role: 'STUDENT', status: 'active', department: 'MCA Department', created_at: '2026-09-01' },
    { id: 'usr-4', name: 'Bob Johnson', email: 'bob@skillforge.ai', role: 'STUDENT', status: 'active', department: 'MCA Department', created_at: '2026-09-02' },
    { id: 'usr-5', name: 'Dr. Sarah Connor', email: 'sarah@skillforge.ai', role: 'TEACHER', status: 'active', department: 'Computer Science & Engineering', created_at: '2026-08-15' },
    { id: 'usr-6', name: 'Prof. Marcus Vance', email: 'marcus@skillforge.ai', role: 'TEACHER', status: 'active', department: 'Computer Systems', created_at: '2026-08-18' },
    { id: 'usr-7', name: 'Charlie Davis', email: 'charlie@skillforge.ai', role: 'STUDENT', status: 'active', department: 'MCA Department', created_at: '2026-09-03' },
    { id: 'usr-8', name: 'Diana Prince', email: 'diana@skillforge.ai', role: 'STUDENT', status: 'active', department: 'MCA Department', created_at: '2026-09-04' },
  ]);

  const [roleFilter, setRoleFilter] = useState(defaultRole);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    const token = localStorage.getItem('skillforge_token');
    const params = new URLSearchParams();
    if (roleFilter !== 'ALL') params.append('role', roleFilter);
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    fetch(`/api/admin/users?${params.toString()}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data && Array.isArray(data.data)) {
          setUsers(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleStatus = (user) => {
    const token = localStorage.getItem('skillforge_token');
    const nextStatus = user.status === 'active' ? 'deactivated' : 'active';

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    );
    if (selectedUser && selectedUser.id === user.id) {
      setSelectedUser({ ...selectedUser, status: nextStatus });
    }

    fetch(`/api/admin/users/${user.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActionMessage(`User account '${user.name}' marked as ${nextStatus.toUpperCase()}`);
          setTimeout(() => setActionMessage(''), 4000);
        }
      })
      .catch(() => {
        // Revert on failure
        fetchUsers();
      });
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (statusFilter !== 'ALL' && u.status !== statusFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title & Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>{title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Search, inspect account metadata, and control user access states across the platform.
            </p>
          </div>
          <span className="badge badge-info">{filteredUsers.length} Accounts Found</span>
        </div>

        {actionMessage && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--success)',
              color: 'var(--success)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            ✓ {actionMessage}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '240px', display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Search by name, email, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ flex: 1, padding: '0.65rem 1rem' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1rem' }}>
              🔍 Search
            </button>
          </form>

          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-input"
              style={{ padding: '0.65rem', minWidth: '130px' }}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admins Only</option>
              <option value="TEACHER">Teachers Only</option>
              <option value="STUDENT">Students Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ padding: '0.65rem', minWidth: '130px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.75rem 1rem' }}>User Profile</th>
              <th style={{ padding: '0.75rem 1rem' }}>Email Address</th>
              <th style={{ padding: '0.75rem 1rem' }}>Role</th>
              <th style={{ padding: '0.75rem 1rem' }}>Department / Cohort</th>
              <th style={{ padding: '0.75rem 1rem' }}>Account Status</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ID: {user.id}
                  </div>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                <td style={{ padding: '1rem' }}>
                  <span
                    className={`badge ${
                      user.role === 'ADMIN'
                        ? 'badge-warning'
                        : user.role === 'TEACHER'
                        ? 'badge-info'
                        : 'badge-success'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                  {user.department || 'N/A'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span
                    className={`badge ${
                      user.status === 'active' ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    ● {user.status ? user.status.toUpperCase() : 'ACTIVE'}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    >
                      👁️ View Profile
                    </button>
                    {user.role !== 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        className={`btn ${user.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                      >
                        {user.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No users match the specified search and filter criteria.
          </div>
        )}
      </div>

      {/* View Profile Drawer / Modal */}
      {selectedUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="glass-panel animate-fade-in"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              border: '1px solid var(--border-glow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                  }}
                >
                  {selectedUser.role === 'ADMIN' ? '👑' : selectedUser.role === 'TEACHER' ? '👨‍🏫' : '🎓'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{selectedUser.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Account Metadata</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>User ID:</div>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedUser.id}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Assigned Role:</div>
                  <span className="badge badge-info">{selectedUser.role}</span>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Email Address:</div>
                  <strong>{selectedUser.email}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Department:</div>
                  <strong>{selectedUser.department}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Member Since:</div>
                  <strong>{selectedUser.created_at || '2026-08-01'}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Account Status:</div>
                  <strong style={{ color: selectedUser.status === 'active' ? 'var(--success)' : 'var(--danger)' }}>
                    ● {(selectedUser.status || 'active').toUpperCase()}
                  </strong>
                </div>
              </div>

              {/* Privacy Notice Card */}
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#93c5fd', display: 'block', marginBottom: '0.25rem' }}>
                  🔒 Academic Privacy Assurance
                </strong>
                In compliance with institution privacy policies, individual student written answers, teacher-student private feedback, and raw grading evaluations are restricted from the administrative panel and accessible only by respective students and course instructors.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              {selectedUser.role !== 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedUser)}
                  className={`btn ${selectedUser.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                  style={{ fontSize: '0.85rem' }}
                >
                  {selectedUser.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

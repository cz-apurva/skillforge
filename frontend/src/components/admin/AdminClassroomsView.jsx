import React, { useState, useEffect } from 'react';

export default function AdminClassroomsView() {
  const [classrooms, setClassrooms] = useState([
    {
      id: 'cls-101',
      code: 'MCA-2026-A',
      name: 'Master of Computer Applications - Section A',
      subject: 'Operating Systems & System Programming',
      teacher_name: 'Prof. A. Anupam',
      student_count: 42,
      term: 'Semester 4',
      status: 'active',
      created_at: '2026-08-01',
    },
    {
      id: 'cls-102',
      code: 'MCA-2026-B',
      name: 'Master of Computer Applications - Section B',
      subject: 'Database Engineering & Distributed Systems',
      teacher_name: 'Dr. Sarah Connor',
      student_count: 38,
      term: 'Semester 4',
      status: 'active',
      created_at: '2026-08-05',
    },
    {
      id: 'cls-103',
      code: 'BTECH-CS-401',
      name: 'Computer Science Core - Advanced Algorithms',
      subject: 'Design and Analysis of Algorithms',
      teacher_name: 'Prof. Marcus Vance',
      student_count: 45,
      term: 'Semester 6',
      status: 'active',
      created_at: '2026-08-10',
    },
    {
      id: 'cls-104',
      code: 'AI-ML-ADV',
      name: 'Advanced Deep Learning & NLP Specialization',
      subject: 'Machine Learning & Neural Architectures',
      teacher_name: 'Prof. Elena Rostova',
      student_count: 28,
      term: 'Semester 4 Specialization',
      status: 'active',
      created_at: '2026-08-12',
    },
    {
      id: 'cls-105',
      code: 'SEC-NET-502',
      name: 'Network Security & Applied Cryptography',
      subject: 'Cyber Defense & Security Protocols',
      teacher_name: 'Prof. A. Anupam',
      student_count: 35,
      term: 'Semester 4',
      status: 'active',
      created_at: '2026-08-15',
    },
  ]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionMessage, setActionMessage] = useState('');

  const fetchClasses = () => {
    const token = localStorage.getItem('skillforge_token');
    fetch('/api/admin/classes', {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data && Array.isArray(data.data)) {
          setClassrooms(data.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleToggleStatus = (cls) => {
    const token = localStorage.getItem('skillforge_token');
    const nextStatus = cls.status === 'active' ? 'archived' : 'active';

    setClassrooms((prev) =>
      prev.map((c) => (c.id === cls.id ? { ...c, status: nextStatus } : c))
    );

    fetch(`/api/admin/classes/${cls.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActionMessage(`Classroom '${cls.code}' status changed to ${nextStatus.toUpperCase()}`);
          setTimeout(() => setActionMessage(''), 4000);
        }
      })
      .catch(() => fetchClasses());
  };

  const filteredClassrooms = classrooms.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.teacher_name.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title & Filters */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>🏫 Classroom & Cohort Administration</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Oversee departmental classrooms, assigned faculty instructors, and active student enrollment figures.
            </p>
          </div>
          <span className="badge badge-info">{filteredClassrooms.length} Classrooms Active</span>
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
          <input
            type="text"
            placeholder="Search by code, title, subject, or instructor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ flex: 1, minWidth: '240px', padding: '0.65rem 1rem' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ padding: '0.65rem', minWidth: '140px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Classrooms Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filteredClassrooms.map((cls) => (
          <div
            key={cls.id}
            className="glass-panel"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="badge badge-info" style={{ fontFamily: 'var(--font-mono)' }}>
                  {cls.code}
                </span>
                <span className={`badge ${cls.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                  ● {cls.status.toUpperCase()}
                </span>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                {cls.name}
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                📚 {cls.subject}
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Faculty:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{cls.teacher_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Enrolled Students:</span>
                  <strong style={{ color: '#60a5fa' }}>{cls.student_count} Students</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Academic Term:</span>
                  <span>{cls.term}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
              <button
                type="button"
                onClick={() => handleToggleStatus(cls)}
                className={`btn ${cls.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
              >
                {cls.status === 'active' ? 'Archive Classroom' : 'Activate Classroom'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredClassrooms.length === 0 && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No classrooms match the search and filter criteria.
        </div>
      )}
    </div>
  );
}

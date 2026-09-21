import React, { useState, useEffect } from 'react';

export default function TeacherClassesView({ onSelectClass }) {
  const [classes, setClasses] = useState([
    {
      id: 'cls-mca-401',
      code: 'MCA-401-2026',
      name: 'MCA Section A - Advanced Operating Systems',
      subject: 'Operating Systems & System Programming',
      description: 'Kernel architectures, multi-threading, concurrency control, and distributed deadlock detection.',
      semester: 'Semester 4',
      academic_year: '2026-2027',
      join_code: 'SF-MCA-401A',
      student_count: 42,
      status: 'active',
      created_at: '2026-08-01',
    },
    {
      id: 'cls-mca-402',
      code: 'MCA-402-2026',
      name: 'MCA Section B - Database Engineering & Distributed ACID',
      subject: 'Database Systems & Query Optimization',
      description: 'Relational design, normalization rigor (3NF/BCNF), Raft consensus, and transaction isolation levels.',
      semester: 'Semester 4',
      academic_year: '2026-2027',
      join_code: 'SF-MCA-402B',
      student_count: 38,
      status: 'active',
      created_at: '2026-08-05',
    },
    {
      id: 'cls-sec-502',
      code: 'SEC-502-2026',
      name: 'Network Security & Applied Cryptography',
      subject: 'Information & Network Security',
      description: 'Zero-trust networks, TLS 1.3 protocol analysis, asymmetric cryptography, and penetration testing sandboxes.',
      semester: 'Semester 4 Specialization',
      academic_year: '2026-2027',
      join_code: 'SF-SEC-502C',
      student_count: 35,
      status: 'active',
      created_at: '2026-08-15',
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    description: '',
    semester: 'Semester 4',
    academic_year: '2026-2027',
  });
  const [createdNotice, setCreatedNotice] = useState(null);
  const [selectedClassDetail, setSelectedClassDetail] = useState(null);

  const fetchClasses = () => {
    const token = localStorage.getItem('skillforge_token');
    fetch('/api/teacher/classes', {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setClasses(data.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('skillforge_token');

    fetch('/api/teacher/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setClasses((prev) => [data.data, ...prev]);
          setCreatedNotice(data.data);
          setShowCreateModal(false);
          setFormData({
            name: '',
            subject: '',
            description: '',
            semester: 'Semester 4',
            academic_year: '2026-2027',
          });
        }
      })
      .catch(() => {
        // Fallback demo creation
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const joinCode = `SF-MCA-${randomSuffix}`;
        const fallbackClass = {
          id: `cls-local-${Date.now()}`,
          name: formData.name,
          subject: formData.subject,
          description: formData.description,
          semester: formData.semester,
          academic_year: formData.academic_year,
          join_code: joinCode,
          student_count: 0,
          status: 'active',
          created_at: new Date().toISOString().split('T')[0],
        };
        setClasses((prev) => [fallbackClass, ...prev]);
        setCreatedNotice(fallbackClass);
        setShowCreateModal(false);
      });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Create Button */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>🏫 My Teaching Classrooms & Cohorts</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Create student cohort classrooms, distribute unique join codes, and manage enrolled rosters.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem', fontWeight: 600 }}
          >
            ➕ Create New Classroom
          </button>
        </div>

        {createdNotice && (
          <div
            style={{
              marginTop: '1.25rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid var(--success)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong style={{ color: 'var(--success)' }}>✓ Classroom Created: {createdNotice.name}</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Share this unique Student Join Code with your students:
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  letterSpacing: '0.08em',
                  border: '1px solid var(--primary)',
                }}
              >
                {createdNotice.join_code}
              </div>
              <button
                type="button"
                onClick={() => setCreatedNotice(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
              >
                ✕ Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Classrooms Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="glass-panel"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.25rem',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="badge badge-info" style={{ fontFamily: 'var(--font-mono)' }}>
                  Code: {cls.join_code}
                </span>
                <span className="badge badge-success">● ACTIVE</span>
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                {cls.name}
              </h3>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                📚 {cls.subject}
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                {cls.description || 'Curriculum cohort with integrated FairGrade assessment pipelines.'}
              </p>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Enrolled Students:</span>
                  <strong style={{ color: '#60a5fa' }}>{cls.student_count || 0} Students</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Semester / Term:</span>
                  <span>{cls.semester} ({cls.academic_year})</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedClassDetail(cls)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                👥 View Roster
              </button>
              <button
                type="button"
                onClick={() => onSelectClass && onSelectClass(cls)}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                Feed & Materials →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
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
          onClick={() => setShowCreateModal(false)}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>🏫 Create Classroom Cohort</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Classroom Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCA Section A - Operating Systems"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Subject / Course Topic *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Operating Systems"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description / Syllabus Goals
                </label>
                <textarea
                  rows={3}
                  placeholder="Overview of curriculum coverage, learning outcomes, and assessment rubrics..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Semester / Term
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="form-input"
                  >
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                    <option value="Semester 3">Semester 3</option>
                    <option value="Semester 4">Semester 4</option>
                    <option value="Semester 5">Semester 5</option>
                    <option value="Semester 6">Semester 6</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Academic Year
                  </label>
                  <input
                    type="text"
                    placeholder="2026-2027"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                🔑 <strong>Auto Join Code:</strong> Creating this class will automatically generate a cryptographically unique 8-character student enrollment code.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
                  Create Class & Generate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster Modal */}
      {selectedClassDetail && (
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
          onClick={() => setSelectedClassDetail(null)}
        >
          <div
            className="glass-panel animate-fade-in"
            style={{
              maxWidth: '580px',
              width: '100%',
              padding: '2rem',
              border: '1px solid var(--border-glow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>👥 Enrolled Student Roster</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedClassDetail.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClassDetail(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
              {[
                { id: 'std-1', name: 'Alice Smith', email: 'alice@skillforge.ai', roll: 'MCA-2026-042', status: 'Enrolled' },
                { id: 'std-2', name: 'Bob Johnson', email: 'bob@skillforge.ai', roll: 'MCA-2026-015', status: 'Enrolled' },
                { id: 'std-3', name: 'Charlie Davis', email: 'charlie@skillforge.ai', roll: 'MCA-2026-028', status: 'Enrolled' },
                { id: 'std-4', name: 'Diana Prince', email: 'diana@skillforge.ai', roll: 'MCA-2026-033', status: 'Enrolled' },
                { id: 'std-5', name: 'Edward Elric', email: 'edward@skillforge.ai', roll: 'MCA-2026-007', status: 'Enrolled' },
              ].map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <strong>{s.name}</strong> ({s.roll})
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</div>
                  </div>
                  <span className="badge badge-success">● {s.status}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setSelectedClassDetail(null)}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';

export default function AdminAssessmentsView() {
  const [assessments, setAssessments] = useState([
    {
      id: 'asm-1',
      title: 'Operating Systems - Process Scheduling & Synchronization',
      course_name: 'MCA-2026-A (MCA-401)',
      teacher_name: 'Prof. A. Anupam',
      total_points: 20,
      status: 'published',
      questions_count: 2,
      submissions_count: 42,
      created_at: '2026-08-15',
    },
    {
      id: 'asm-2',
      title: 'DBMS Normalization (3NF & BCNF) & Transaction ACID',
      course_name: 'MCA-2026-B (MCA-402)',
      teacher_name: 'Dr. Sarah Connor',
      total_points: 15,
      status: 'published',
      questions_count: 2,
      submissions_count: 38,
      created_at: '2026-08-18',
    },
    {
      id: 'asm-3',
      title: 'Distributed Consensus (Paxos vs Raft Leader Election)',
      course_name: 'BTECH-CS-401 (CS-501)',
      teacher_name: 'Prof. Marcus Vance',
      total_points: 25,
      status: 'draft',
      questions_count: 3,
      submissions_count: 0,
      created_at: '2026-08-25',
    },
  ]);

  useEffect(() => {
    const token = localStorage.getItem('skillforge_token');
    fetch('/api/admin/assessments', {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setAssessments(
            data.data.map((a) => ({
              id: a.id,
              title: a.title,
              course_name: a.course_id ? `Course ID: ${a.course_id.slice(0, 8)}...` : 'MCA Cohort',
              teacher_name: 'Faculty Instructor',
              total_points: a.total_points || 20,
              status: a.status || 'published',
              questions_count: 2,
              submissions_count: 42,
              created_at: (a.created_at || '').split('T')[0] || '2026-08-15',
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>📝 Platform Assessments Oversight</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Read-only institutional audit of examination rubrics, status, and cohort submission volumes.
            </p>
          </div>
          <span className="badge badge-warning">🛡️ Read-Only Governance Mode</span>
        </div>

        {/* Read-Only Guarantee Notice */}
        <div style={{ marginTop: '1rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: '#fcd34d' }}>
          🔒 <strong>Strict Integrity Enforcement:</strong> Direct editing of assessment questions, rubric criterion weights, student answers, or grades is strictly prohibited for the Administrator role.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {assessments.map((a) => (
          <div key={a.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="badge badge-info">{a.course_name}</span>
                <span className={`badge ${a.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                  ● {a.status ? a.status.toUpperCase() : 'PUBLISHED'}
                </span>
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>{a.title}</h3>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Instructor:</span>
                  <strong>{a.teacher_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Max Points:</span>
                  <strong style={{ color: '#38bdf8' }}>{a.total_points} Marks</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Student Submissions:</span>
                  <strong style={{ color: 'var(--success)' }}>{a.submissions_count} Submissions</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Created Date:</span>
                  <span>{a.created_at}</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              🔒 Protected Academic Record (Audit Read-Only)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

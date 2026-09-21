import React, { useState, useEffect } from 'react';

export default function AdminSubjectsView() {
  const [subjects, setSubjects] = useState([
    { id: 'sub-1', code: 'MCA-401', name: 'Advanced Operating Systems & Kernel Architecture', credits: 4, department: 'MCA Department', cohorts_count: 3 },
    { id: 'sub-2', code: 'MCA-402', name: 'Database Management Systems & Distributed ACID', credits: 4, department: 'MCA Department', cohorts_count: 2 },
    { id: 'sub-3', code: 'MCA-403', name: 'Computer Networks & Security Protocols', credits: 4, department: 'MCA Department', cohorts_count: 4 },
    { id: 'sub-4', code: 'MCA-404', name: 'Cloud Computing & Microservices Architecture', credits: 3, department: 'MCA Department', cohorts_count: 2 },
    { id: 'sub-5', code: 'MCA-405', name: 'Machine Learning & Fair Evaluation Methodologies', credits: 4, department: 'MCA Department', cohorts_count: 3 },
  ]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>📚 Departmental Subjects & Curriculum</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Registered courses, academic credit weightings, and active teaching cohorts.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {subjects.map((sub) => (
          <div key={sub.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-info" style={{ fontFamily: 'var(--font-mono)' }}>{sub.code}</span>
              <span className="badge badge-success">{sub.credits} Credits</span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{sub.name}</h3>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                <span>{sub.department}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Active Cohorts:</span>
                <strong style={{ color: '#60a5fa' }}>{sub.cohorts_count} Classes</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

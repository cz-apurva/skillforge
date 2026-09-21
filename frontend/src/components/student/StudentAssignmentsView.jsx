import React, { useState } from 'react';

export default function StudentAssignmentsView({ onLaunchSandbox, onLaunchWritten }) {
  const [activeTab, setActiveTab] = useState('ALL');

  const [assignments, setAssignments] = useState([
    {
      id: 'asg-001',
      title: 'Assignment 01: Multi-Threaded Chandy-Misra-Haas Deadlock Detector',
      type: 'PROGRAMMING',
      language: 'C++',
      classroom_name: 'MCA Section A - Advanced Operating Systems',
      due_date: '2026-03-20T23:59:00.000Z',
      max_score: 100,
      status: 'IN_PROGRESS',
      description: 'Implement distributed probe propagation in asynchronous wait-for networks with strict RAII mutex controls.',
    },
    {
      id: 'asg-002',
      title: 'Midterm Written: Relational Schema BCNF Decomposition & Functional Dependencies',
      type: 'WRITTEN',
      classroom_name: 'MCA Section B - Database Engineering & Distributed ACID',
      due_date: '2026-03-18T18:00:00.000Z',
      max_score: 100,
      status: 'PENDING',
      description: 'Prove dependency preservation and compute canonical covers for complex multi-attribute schemas using FairGrade blind evaluation.',
    },
    {
      id: 'asg-003',
      title: 'Assignment 03: Zero-Trust Token Verification Engine',
      type: 'PROGRAMMING',
      language: 'Python',
      classroom_name: 'Network Security & Applied Cryptography',
      due_date: '2026-03-25T23:59:00.000Z',
      max_score: 100,
      status: 'PENDING',
      description: 'Implement ECDSA signature verification for JSON Web Tokens in a zero-trust sandbox architecture.',
    },
  ]);

  const filtered = assignments.filter((a) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PROGRAMMING') return a.type === 'PROGRAMMING';
    if (activeTab === 'WRITTEN') return a.type === 'WRITTEN';
    return true;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>📝</span> Academic Assignments & Coursework
        </h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
          Complete programming challenges in the automated Judge0 Sandbox or submit written analytical exams evaluated by AI FairGrade.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'ALL', label: '🌐 All Assignments' },
          { id: 'PROGRAMMING', label: '💻 Programming Challenges (Sandbox)' },
          { id: 'WRITTEN', label: '⚖️ Written Exams (FairGrade)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${activeTab === tab.id ? '#6366f1' : '#334155'}`,
              background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
              color: activeTab === tab.id ? '#c7d2fe' : '#94a3b8',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Assignments Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
        {filtered.map((asg) => (
          <div
            key={asg.id}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: asg.type === 'PROGRAMMING' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    color: asg.type === 'PROGRAMMING' ? '#38bdf8' : '#c7d2fe',
                  }}
                >
                  {asg.type === 'PROGRAMMING' ? `💻 PROGRAMMING (${asg.language || 'Python'})` : '⚖️ WRITTEN / FAIRGRADE'}
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Max: <strong style={{ color: '#f8fafc' }}>{asg.max_score} pts</strong>
                </span>
              </div>

              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc', margin: '0 0 6px 0' }}>
                {asg.title}
              </h2>

              <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '12px' }}>
                🏫 {asg.classroom_name}
              </div>

              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                {asg.description}
              </p>
            </div>

            <div style={{ borderTop: '1px solid #334155', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#f87171', fontWeight: '600' }}>
                ⏰ Due: {new Date(asg.due_date).toLocaleDateString()}
              </span>

              {asg.type === 'PROGRAMMING' ? (
                <button
                  onClick={() => onLaunchSandbox && onLaunchSandbox(asg.id)}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#0f172a',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>💻</span> Open Sandbox
                </button>
              ) : (
                <button
                  onClick={() => onLaunchWritten && onLaunchWritten(asg.id)}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>⚖️</span> Take Written Exam
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

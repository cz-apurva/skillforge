import React, { useState } from 'react';

export default function StudentGradesView({ onNavigateToAppeal }) {
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [grades, setGrades] = useState([
    {
      id: 'sub-recent-1',
      title: 'Lab 02: Completely Fair Scheduler vruntime Simulation',
      classroom_name: 'MCA Section A - Advanced Operating Systems',
      type: 'PROGRAMMING',
      score: 94,
      max_score: 100,
      percentage: 94,
      letter_grade: 'A+',
      evaluated_by: 'Judge0 Automated Sandbox Benchmarks',
      evaluated_at: '2026-03-09T14:30:00.000Z',
      appeal_status: null,
      criteria_breakdown: [
        { criterion: 'Sample Testcases (CFS Basic)', awarded: 40, max: 40, feedback: 'All sample test cases executed within 0.02s.' },
        { criterion: 'Stress Benchmarks (N=500 Processes)', awarded: 54, max: 60, feedback: 'Passed 9/10 high concurrency stress tests.' },
      ],
      strengths: ['Efficient red-black tree insertion', 'Accurate nice value scaling formula'],
      missing_concepts: ['Edge case with zero latency target parameter'],
    },
    {
      id: 'sub-recent-2',
      title: 'Quiz 01: Relational Algebra & Armstrong Axioms',
      classroom_name: 'MCA Section B - Database Engineering',
      type: 'WRITTEN',
      score: 85,
      max_score: 100,
      percentage: 85,
      letter_grade: 'A',
      evaluated_by: 'AI FairGrade Multi-Pass Evaluator',
      evaluated_at: '2026-03-07T11:00:00.000Z',
      appeal_status: 'APPEALED',
      criteria_breakdown: [
        { criterion: 'Formal Distinction (Preemptive vs Non-Preemptive)', awarded: 45, max: 50, feedback: 'Clear explanation of hardware timer interrupts.' },
        { criterion: 'Context Switching Tradeoffs & Overhead', awarded: 40, max: 50, feedback: 'Could detail cache invalidation effects during context switches.' },
      ],
      strengths: ['Strong mathematical proofs', 'Clear Armstrong Axiom decomposition'],
      missing_concepts: ['Multivalued dependency decomposition (4NF)'],
    },
  ]);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🎯</span> Verified Academic Grades & Rubric Feedback
        </h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
          Inspect criterion-level marks, AI evidence rationales, strengths, and missing concepts for all completed evaluations.
        </p>
      </div>

      {/* Grades List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {grades.map((g) => (
          <div
            key={g.id}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: g.type === 'PROGRAMMING' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                      color: g.type === 'PROGRAMMING' ? '#38bdf8' : '#c7d2fe',
                    }}
                  >
                    {g.type}
                  </span>
                  <span style={{ fontSize: '12px', color: '#38bdf8' }}>{g.classroom_name}</span>
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                  {g.title}
                </h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Evaluated by {g.evaluated_by} • {new Date(g.evaluated_at).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#34d399' }}>
                    {g.score} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ {g.max_score}</span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#34d399' }}>Grade: {g.letter_grade} ({g.percentage}%)</div>
                </div>

                <button
                  onClick={() => setSelectedSubmission(g)}
                  style={{
                    padding: '8px 14px',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#38bdf8',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  👁️ Criterion Details
                </button>
              </div>
            </div>

            {/* Strengths & Missing Concepts Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#0f172a', padding: '14px', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', marginBottom: '4px' }}>✨ Strengths Identified:</div>
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{g.strengths.join(' • ')}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24', marginBottom: '4px' }}>🔍 Key Concepts to Review:</div>
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{g.missing_concepts.join(' • ')}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Criterion Breakdown Modal */}
      {selectedSubmission && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #6366f1',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 0 35px rgba(99, 102, 241, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: '0 0 4px 0' }}>
                  Criterion Evaluation Report
                </h2>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>{selectedSubmission.title}</div>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {selectedSubmission.criteria_breakdown.map((cb, idx) => (
                <div key={idx} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', color: '#f8fafc', fontSize: '13px' }}>{cb.criterion}</span>
                    <span style={{ fontWeight: '700', color: '#34d399', fontSize: '13px' }}>{cb.awarded} / {cb.max} pts</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{cb.feedback}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {onNavigateToAppeal ? (
                <button
                  onClick={() => {
                    setSelectedSubmission(null);
                    onNavigateToAppeal(selectedSubmission.id);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '6px',
                    color: '#f87171',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ⚖️ Request Blind FairGrade Re-evaluation (Appeal)
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedSubmission(null)}
                style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
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

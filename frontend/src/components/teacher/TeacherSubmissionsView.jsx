import React, { useState } from 'react';

export default function TeacherSubmissionsView({ onNavigateToFlagged }) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [submissions, setSubmissions] = useState([
    {
      id: 'sub-101',
      student_name: 'Rahul Sharma',
      student_roll: 'SF-MCA-001',
      classroom_name: 'MCA Section B - Database Engineering',
      assignment_title: 'Midterm Written: Relational Schema BCNF Decomposition',
      assignment_type: 'WRITTEN',
      submitted_at: '2026-03-09T14:20:00.000Z',
      status: 'FLAGGED',
      requires_human_review: true,
      ai_score: 72,
      max_score: 100,
      confidence_score: 0.68,
      flag_reason: 'Ambiguous proof of lossless join property in 3NF decomposition step; low confidence multi-pass variance.',
      eval_report: {
        criterion_scores: [
          { criterion: 'Candidate Key Closure Derivation', awarded: 28, max: 30, feedback: 'Strong proof of minimal closure.' },
          { criterion: 'BCNF Violation Analysis', awarded: 26, max: 40, feedback: 'Did not fully verify determinant primality condition.' },
          { criterion: 'Lossless-Join Matrix Test', awarded: 18, max: 30, feedback: 'Matrix decomposition lacks full chase row convergence.' },
        ],
        bias_check: { passed: true, scrubbed_pii: ['Rahul Sharma', 'SF-MCA-001'] },
      },
    },
    {
      id: 'sub-102',
      student_name: 'Priya Patel',
      student_roll: 'SF-MCA-002',
      classroom_name: 'MCA Section A - Advanced Operating Systems',
      assignment_title: 'Assignment 01: Chandy-Misra-Haas Deadlock Detector',
      assignment_type: 'PROGRAMMING',
      submitted_at: '2026-03-09T16:45:00.000Z',
      status: 'EVALUATED',
      requires_human_review: false,
      ai_score: 95,
      max_score: 100,
      confidence_score: 0.98,
      eval_report: {
        criterion_scores: [
          { criterion: 'Sample Testcases Passed', awarded: 40, max: 40, feedback: '100% sample cases passed.' },
          { criterion: 'Hidden Stress Benchmarks', awarded: 55, max: 60, feedback: 'Passed 9/10 stress tests under 2.0s limit.' },
        ],
      },
    },
    {
      id: 'sub-103',
      student_name: 'Amit Verma',
      student_roll: 'SF-MCA-003',
      classroom_name: 'MCA Section B - Database Engineering',
      assignment_title: 'Midterm Written: Relational Schema BCNF Decomposition',
      assignment_type: 'WRITTEN',
      submitted_at: '2026-03-08T11:10:00.000Z',
      status: 'FLAGGED',
      requires_human_review: true,
      ai_score: 64,
      max_score: 100,
      confidence_score: 0.71,
      flag_reason: 'Contradictory explanation of functional dependency preservation vs BCNF guarantee.',
      eval_report: {
        criterion_scores: [
          { criterion: 'Candidate Key Closure Derivation', awarded: 22, max: 30, feedback: 'Missed second candidate key in schema.' },
          { criterion: 'BCNF Violation Analysis', awarded: 24, max: 40, feedback: 'Confused 3NF prime attribute rule with BCNF.' },
          { criterion: 'Lossless-Join Matrix Test', awarded: 18, max: 30, feedback: 'Missing decomposition step.' },
        ],
      },
    },
    {
      id: 'sub-104',
      student_name: 'Ananya Gupta',
      student_roll: 'SF-MCA-004',
      classroom_name: 'MCA Section A - Advanced Operating Systems',
      assignment_title: 'Assignment 01: Chandy-Misra-Haas Deadlock Detector',
      assignment_type: 'PROGRAMMING',
      submitted_at: '2026-03-08T18:30:00.000Z',
      status: 'EVALUATED',
      requires_human_review: false,
      ai_score: 100,
      max_score: 100,
      confidence_score: 0.99,
      eval_report: {
        criterion_scores: [
          { criterion: 'All Testcases & Concurrency Stress', awarded: 100, max: 100, feedback: 'Flawless execution with zero race conditions.' },
        ],
      },
    },
    {
      id: 'sub-105',
      student_name: 'Vikram Mehta',
      student_roll: 'SF-MCA-005',
      classroom_name: 'Network Security & Applied Cryptography',
      assignment_title: 'Assignment 03: Zero-Trust Token Verification Engine',
      assignment_type: 'PROGRAMMING',
      submitted_at: '2026-03-07T19:00:00.000Z',
      status: 'PENDING',
      requires_human_review: false,
      ai_score: null,
      max_score: 100,
      confidence_score: null,
    },
  ]);

  const filtered = submissions.filter((s) => {
    const matchesFilter =
      activeFilter === 'ALL' ||
      (activeFilter === 'FLAGGED' && s.requires_human_review) ||
      (activeFilter === 'EVALUATED' && s.status === 'EVALUATED') ||
      (activeFilter === 'PENDING' && s.status === 'PENDING');

    const matchesSearch =
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_roll.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.assignment_title.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📥</span> Student Submissions & Grading Roster
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            View incoming student submissions, monitor AI FairGrade evaluation status, and review flagged edge cases.
          </p>
        </div>

        {onNavigateToFlagged && (
          <button
            onClick={onNavigateToFlagged}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            }}
          >
            <span>⚠️</span> Review Flagged Answers ({submissions.filter((s) => s.requires_human_review).length})
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ALL', label: '🌐 All Submissions' },
            { id: 'FLAGGED', label: '⚠️ Flagged for Human Review' },
            { id: 'EVALUATED', label: '✅ AI Graded' },
            { id: 'PENDING', label: '⏳ Pending Evaluation' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: `1px solid ${activeFilter === tab.id ? '#6366f1' : '#334155'}`,
                background: activeFilter === tab.id ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
                color: activeFilter === tab.id ? '#c7d2fe' : '#94a3b8',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by student, roll number, or assignment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 14px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '13px',
            width: '320px',
            outline: 'none',
          }}
        />
      </div>

      {/* Submissions Table */}
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 18px' }}>Student</th>
              <th style={{ padding: '14px 18px' }}>Assignment & Classroom</th>
              <th style={{ padding: '14px 18px' }}>Submitted At</th>
              <th style={{ padding: '14px 18px' }}>FairGrade Status</th>
              <th style={{ padding: '14px 18px' }}>Score</th>
              <th style={{ padding: '14px 18px' }}>Confidence</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub) => (
              <tr
                key={sub.id}
                style={{
                  borderBottom: '1px solid #334155',
                  background: sub.requires_human_review ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                }}
              >
                <td style={{ padding: '16px 18px' }}>
                  <div style={{ fontWeight: '600', color: '#f8fafc' }}>{sub.student_name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{sub.student_roll}</div>
                </td>

                <td style={{ padding: '16px 18px' }}>
                  <div style={{ fontWeight: '500', color: '#e2e8f0', fontSize: '13px' }}>{sub.assignment_title}</div>
                  <div style={{ fontSize: '12px', color: '#38bdf8' }}>{sub.classroom_name}</div>
                </td>

                <td style={{ padding: '16px 18px', fontSize: '12px', color: '#94a3b8' }}>
                  {new Date(sub.submitted_at).toLocaleString()}
                </td>

                <td style={{ padding: '16px 18px' }}>
                  {sub.requires_human_review ? (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      ⚠️ FLAGGED REVIEW
                    </span>
                  ) : sub.status === 'EVALUATED' ? (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      ✓ FAIRGRADE GRADED
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: 'rgba(251, 191, 36, 0.2)',
                        color: '#fbbf24',
                      }}
                    >
                      ⏳ QUEUED
                    </span>
                  )}
                </td>

                <td style={{ padding: '16px 18px', fontWeight: '700', fontSize: '14px' }}>
                  {sub.ai_score !== null ? (
                    <span style={{ color: sub.ai_score >= 80 ? '#34d399' : sub.ai_score >= 60 ? '#fbbf24' : '#f87171' }}>
                      {sub.ai_score} / {sub.max_score}
                    </span>
                  ) : (
                    <span style={{ color: '#64748b' }}>—</span>
                  )}
                </td>

                <td style={{ padding: '16px 18px', fontSize: '13px' }}>
                  {sub.confidence_score ? (
                    <span style={{ color: sub.confidence_score >= 0.8 ? '#34d399' : '#f87171', fontWeight: '600' }}>
                      {(sub.confidence_score * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span style={{ color: '#64748b' }}>—</span>
                  )}
                </td>

                <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                  <button
                    onClick={() => setSelectedSubmission(sub)}
                    style={{
                      padding: '6px 12px',
                      background: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    👁️ View Report
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Evaluation Detail Modal */}
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
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 0 35px rgba(99, 102, 241, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: '0 0 4px 0' }}>
                  ⚖️ FairGrade Criterion Evaluation Report
                </h2>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {selectedSubmission.student_name} ({selectedSubmission.student_roll}) • {selectedSubmission.assignment_title}
                </div>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {selectedSubmission.requires_human_review && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: '#fca5a5',
                  fontSize: '13px',
                }}
              >
                <strong>⚠️ Flagged Reason:</strong> {selectedSubmission.flag_reason}
              </div>
            )}

            {selectedSubmission.eval_report && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {selectedSubmission.eval_report.criterion_scores.map((cs, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600', color: '#f8fafc', fontSize: '13px' }}>{cs.criterion}</span>
                      <span style={{ fontWeight: '700', color: '#34d399', fontSize: '13px' }}>
                        {cs.awarded} / {cs.max} pts
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{cs.feedback}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setSelectedSubmission(null)}
                style={{
                  padding: '10px 20px',
                  background: '#334155',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';

export default function StudentProgressView() {
  const [data, setData] = useState({
    progress: {
      cumulative_mastery: 79.1,
      assessments_completed: 12,
      total_assigned: 14,
      completion_rate: '85.7%',
      learning_streak_days: 8,
      appeals_filed: 1,
    },
    topic_mastery: [
      {
        topic: 'Relational Normalization & BCNF',
        percentage: 82.0,
        status: 'Proficient',
        category: 'STRONG',
        color: '#38bdf8',
        assessments_completed: 4,
        strengths: 'Lossless join proofs, functional dependency covers',
        recommended_review: null,
      },
      {
        topic: 'Network Security & Applied Cryptography',
        percentage: 90.5,
        status: 'Mastered',
        category: 'STRONG',
        color: '#10b981',
        assessments_completed: 5,
        strengths: 'TLS 1.3 handshakes, ECDSA signature verification',
        recommended_review: null,
      },
      {
        topic: 'Linux CFS & Concurrency Control',
        percentage: 76.0,
        status: 'Good Understanding',
        category: 'MEDIUM',
        color: '#6366f1',
        assessments_completed: 3,
        strengths: 'Deadlock detection, vruntime fairness scheduling',
        recommended_review: 'Review context switching CPU cache invalidation trade-offs',
      },
      {
        topic: 'Distributed ACID & Raft Consensus',
        percentage: 68.0,
        status: 'Needs Revision',
        category: 'WEAK',
        color: '#fbbf24',
        assessments_completed: 2,
        strengths: '2PC protocol flow',
        recommended_review: 'Practice leader election quorum calculation in Raft',
      },
    ],
    strong_topics: [
      {
        topic: 'Network Security & Applied Cryptography',
        percentage: 90.5,
        strengths: 'TLS 1.3 handshakes, ECDSA signature verification',
      },
      {
        topic: 'Relational Normalization & BCNF',
        percentage: 82.0,
        strengths: 'Lossless join proofs, functional dependency covers',
      },
    ],
    weak_topics: [
      {
        topic: 'Distributed ACID & Raft Consensus',
        percentage: 68.0,
        recommended_review: 'Practice leader election quorum calculation in Raft',
      },
    ],
    grade_history: [
      { title: 'OS Process Scheduling Written Exam', date: '2026-09-08', score: 8.5, max_score: 10, grade: 'A', status: 'Graded' },
      { title: 'Algorithm Complexity & Binary Heap Lab', date: '2026-09-05', score: 9.0, max_score: 10, grade: 'A+', status: 'Graded' },
      { title: 'Network Protocol & Port Scanner Sandbox', date: '2026-08-28', score: 10.0, max_score: 10, grade: 'A+', status: 'Graded' },
      { title: 'Relational Schema Normalization Quiz', date: '2026-08-20', score: 8.0, max_score: 10, grade: 'A', status: 'Graded' },
      { title: 'Distributed Deadlock & Lock Table Midterm', date: '2026-08-14', score: 6.8, max_score: 10, grade: 'B', status: 'Graded' },
    ],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('skillforge_token');
    if (token) {
      setLoading(true);
      fetch('/api/analytics/student', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data) {
            setData(json.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const { progress, topic_mastery, strong_topics, weak_topics, grade_history } = data;

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Privacy Notice Banner */}
      <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            <strong style={{ color: '#38bdf8' }}>Private Student View:</strong> You are viewing your personal academic progress, topic mastery, and grade history. Only you and your course instructors have access to these evaluations.
          </span>
        </div>
        <span className="badge badge-info" style={{ fontSize: '11px' }}>FERPA / Zero-PII Isolated</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📈</span> My Progress & Conceptual Mastery
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            AI-evaluated mastery percentages across core computer science competencies and theoretical domains.
          </p>
        </div>
        {loading && <span className="badge badge-warning">Refreshing...</span>}
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Cumulative Mastery</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#38bdf8', margin: '4px 0' }}>
            {progress?.cumulative_mastery}%
          </div>
          <div style={{ fontSize: '11px', color: '#34d399' }}>↑ Continuous AI evaluation</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Completion Rate</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#34d399', margin: '4px 0' }}>
            {progress?.completion_rate}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            {progress?.assessments_completed} of {progress?.total_assigned} tasks submitted
          </div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Learning Streak</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#fbbf24', margin: '4px 0' }}>
            {progress?.learning_streak_days} Days 🔥
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Active tutor & lab practice</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Appeals Filed</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#a78bfa', margin: '4px 0' }}>
            {progress?.appeals_filed || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#34d399' }}>FairGrade multi-agent verified</div>
        </div>
      </div>

      {/* Weak & Strong Topics Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Strong Topics */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '18px' }}>🌟</span>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#34d399', margin: 0 }}>Strong Competencies (≥80%)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(strong_topics || []).map((st, idx) => (
              <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 14px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px', color: '#f8fafc' }}>{st.topic}</strong>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>{st.percentage}%</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Strengths: {st.strengths}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Topics / Areas for Improvement */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '18px' }}>🎯</span>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fbbf24', margin: 0 }}>Focus & Revision Areas (&lt;75%)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(weak_topics || []).map((wt, idx) => (
              <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 14px', borderRadius: '8px', borderLeft: '4px solid #fbbf24' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px', color: '#f8fafc' }}>{wt.topic}</strong>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#fbbf24' }}>{wt.percentage}%</span>
                </div>
                {wt.recommended_review && (
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                    💡 <strong>AI Recommendation:</strong> {wt.recommended_review}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Topic Mastery Breakdown */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 16px 0', color: '#f8fafc' }}>
          📊 Detailed Topic Mastery Index
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(topic_mastery || []).map((tm, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc', margin: '0 0 4px 0' }}>
                    {tm.topic}
                  </h4>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {tm.assessments_completed} Assessments Graded • Strong in {tm.strengths}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: tm.color || '#38bdf8' }}>
                    {tm.percentage}%
                  </span>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{tm.status}</div>
                </div>
              </div>

              <div style={{ width: '100%', height: '8px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${tm.percentage}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${tm.color || '#38bdf8'}, #38bdf8)`,
                    borderRadius: '4px',
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>

              {tm.recommended_review && (
                <div style={{ fontSize: '12px', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                  📌 <strong>Remedial Suggestion:</strong> {tm.recommended_review}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* My Grade History Table */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 16px 0', color: '#f8fafc' }}>
          📝 My Recent Grade History
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '10px 12px' }}>Date</th>
                <th style={{ padding: '10px 12px' }}>Assessment Title</th>
                <th style={{ padding: '10px 12px' }}>Score</th>
                <th style={{ padding: '10px 12px' }}>Grade</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(grade_history || []).map((gh, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
                  <td style={{ padding: '12px', color: '#94a3b8' }}>{gh.date}</td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc' }}>{gh.title}</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#38bdf8' }}>
                    {gh.score} / {gh.max_score}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge badge-success" style={{ fontSize: '11px' }}>{gh.grade}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge badge-info" style={{ fontSize: '11px' }}>{gh.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

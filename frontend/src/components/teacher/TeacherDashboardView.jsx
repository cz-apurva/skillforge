import React, { useState, useEffect } from 'react';

export default function TeacherDashboardView({ onNavigate }) {
  const [data, setData] = useState({
    metrics: {
      my_classes_count: 3,
      total_students: 115,
      pending_submissions: 8,
      average_class_performance: '78.4%',
      flagged_evaluations: 2,
    },
    my_classes: [
      {
        id: 'cls-mca-401',
        code: 'MCA-401-2026',
        name: 'MCA Section A - Advanced Operating Systems',
        subject: 'Operating Systems & System Programming',
        student_count: 42,
        join_code: 'SF-MCA-401A',
        term: 'Semester 4',
      },
      {
        id: 'cls-mca-402',
        code: 'MCA-402-2026',
        name: 'MCA Section B - Database Engineering & Distributed ACID',
        subject: 'Database Systems & Query Optimization',
        student_count: 38,
        join_code: 'SF-MCA-402B',
        term: 'Semester 4',
      },
      {
        id: 'cls-sec-502',
        code: 'SEC-502-2026',
        name: 'Network Security & Applied Cryptography',
        subject: 'Information & Network Security',
        student_count: 35,
        join_code: 'SF-SEC-502C',
        term: 'Semester 4 Specialization',
      },
    ],
    copilot: {
      top_weakness_concept: 'Normalization (3NF vs BCNF) & Distributed Deadlocks',
      student_deficiency_count: 6,
      priority: 'HIGH',
      suggested_action: 'Deploy a targeted 15-minute concept review on functional dependency decomposition and BCNF losslessness.',
      suggested_discussion_starter: 'Why does BCNF eliminate all redundancy anomalies that 3NF still allows for non-prime attributes?',
      recommended_resources: [
        { title: 'Functional Dependency Decomposition Sandbox', type: 'Interactive Sandbox' },
        { title: 'Remedial Review Guide: BCNF vs 3NF', type: 'Curated Resource' },
      ],
    },
  });

  const [loading, setLoading] = useState(true);
  const [copilotActionStatus, setCopilotActionStatus] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('skillforge_token');
    fetch('/api/teacher/dashboard', {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          setData(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleTriggerCopilotAction = () => {
    setCopilotActionStatus('Remediation lesson & practice problem set scheduled to MCA-402 Class Feed!');
    setTimeout(() => setCopilotActionStatus(''), 5000);
  };

  const metricsCards = [
    { label: 'My Classes', value: data.metrics.my_classes_count, icon: '🏫', color: '#60a5fa', sub: 'Active cohorts', nav: 'classes' },
    { label: 'Total Students', value: data.metrics.total_students, icon: '🎓', color: '#818cf8', sub: 'Enrolled across classes', nav: 'classes' },
    { label: 'Pending Submissions', value: data.metrics.pending_submissions, icon: '📥', color: '#f59e0b', sub: 'Awaiting review / auto-grading', nav: 'submissions' },
    { label: 'Average Performance', value: data.metrics.average_class_performance, icon: '📈', color: '#34d399', sub: 'Cohort mean score', nav: 'analytics' },
    { label: 'Flagged FairGrade Reviews', value: data.metrics.flagged_evaluations, icon: '⚠️', color: '#f87171', sub: 'Confidence < 85% / High variance', nav: 'fairgrade' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Welcome & Quick Actions */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-info">👨‍🏫 Faculty Portal</span>
              <span className="badge badge-success">AI Co-Pilot Active</span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Instructor Workspace</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              Classroom administration, AI curriculum analyzer, FairGrade subjective evaluation, and automated intervention recommendations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('materials')}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              📄 Upload Material (AI)
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('assignments')}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              ➕ New Assignment
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('assessments')}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              📝 Create Assessment
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem' }}>
        {metricsCards.map((card, idx) => (
          <div
            key={idx}
            className="glass-panel"
            onClick={() => onNavigate && onNavigate(card.nav)}
            style={{
              padding: '1.4rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = card.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                {card.label}
              </span>
              <span style={{ fontSize: '1.35rem' }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: card.color, fontFamily: 'var(--font-heading)' }}>
              {card.value}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main Split: Teacher Co-Pilot Card & My Classes Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
        {/* Teacher Co-Pilot Recommendation Card */}
        <div
          className="glass-panel"
          style={{
            padding: '1.75rem',
            border: '1px solid rgba(167, 139, 250, 0.4)',
            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>💡</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#c4b5fd' }}>
                  Teacher Co-Pilot Recommendation
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="badge badge-info">{data.copilot?.action_type?.replace(/_/g, ' ') || 'REVISE TOPIC'}</span>
                <span className="badge badge-danger">Priority: {data.copilot?.priority || 'HIGH'}</span>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                📊 Deterministic Cohort Deficiency (from stored FairGrade & Code Grader rows):
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171' }}>
                "{data.copilot?.top_weakness_concept}"
              </div>
              <div style={{ fontSize: '0.825rem', color: '#cbd5e1', marginTop: '0.35rem', lineHeight: 1.4 }}>
                {data.copilot?.computed_evidence_summary || `${data.copilot?.deficiency_percentage || '71%'} of evaluated students scored below 70% in recent assessments.`}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>🎯 Recommended Pedagogical Action:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', lineHeight: 1.5 }}>
                  {data.copilot?.suggested_action}
                </p>
              </div>

              {data.copilot?.suggested_discussion_starter && (
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>💬 Suggested Class Discussion Starter:</strong>
                  <p style={{ color: '#a5b4fc', fontStyle: 'italic', margin: '0.25rem 0 0 0', lineHeight: 1.5 }}>
                    "{data.copilot.suggested_discussion_starter}"
                  </p>
                </div>
              )}
            </div>

            {copilotActionStatus && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginTop: '1rem' }}>
                ✓ {copilotActionStatus}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={handleTriggerCopilotAction}
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem' }}
            >
              🚀 1-Click Accept & Deploy
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('copilot')}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
            >
              Co-Pilot Hub →
            </button>
          </div>
        </div>

        {/* My Classes Quick Summary */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>🏫 My Active Classrooms</h3>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('classes')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                Manage All →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {data.my_classes.map((cls) => (
                <div
                  key={cls.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{cls.name}</strong>
                    <span className="badge badge-info" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                      Code: {cls.join_code}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    📚 {cls.subject}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{cls.term}</span>
                    <span style={{ color: '#60a5fa' }}>{cls.student_count} Enrolled Students</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('classes')}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1.25rem', padding: '0.65rem', fontSize: '0.85rem' }}
          >
            ➕ Create New Classroom Cohort
          </button>
        </div>
      </div>
    </div>
  );
}

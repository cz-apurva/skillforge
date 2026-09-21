import React, { useState, useEffect } from 'react';

export default function AdminDashboardView({ onNavigate }) {
  const [stats, setStats] = useState({
    total_students: 148,
    total_teachers: 18,
    active_classes: 12,
    total_assessments: 24,
    submissions_today: 64,
    ai_evaluations: 856,
    flagged_evaluations: 3,
    pending_appeals: 2,
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 'act-1',
      action: 'TEACHER_SCORE_OVERRIDE',
      actor: 'Prof. A. Anupam',
      role: 'TEACHER',
      details: 'Overrode automated score for Question 1 from 7.0 to 8.5 with rationale: Edge cases covered',
      timestamp: '10 mins ago',
    },
    {
      id: 'act-2',
      action: 'STUDENT_APPEAL_FILED',
      actor: 'Alice Smith',
      role: 'STUDENT',
      details: 'Submitted grade appeal for Assessment: Distributed Operating Systems',
      timestamp: '25 mins ago',
    },
    {
      id: 'act-3',
      action: 'FAIRGRADE_EVALUATION',
      actor: 'fairgrade-service',
      role: 'SYSTEM',
      details: 'Completed multi-pass evaluation for anonymous submission with 0 PII leaks',
      timestamp: '42 mins ago',
    },
    {
      id: 'act-4',
      action: 'ASSESSMENT_PUBLISHED',
      actor: 'Dr. Sarah Connor',
      role: 'TEACHER',
      details: 'Published assessment: MCA-402 Database Engineering Midterm',
      timestamp: '1 hour ago',
    },
    {
      id: 'act-5',
      action: 'BIAS_CHECK_VALIDATED',
      actor: 'AnonymizerService',
      role: 'SYSTEM',
      details: 'Zero demographic or student identity markers detected across cohort batch',
      timestamp: '2 hours ago',
    },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('skillforge_token');
    fetch('/api/admin/stats', {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.kpi) {
          setStats(data.data.kpi);
        }
        if (data?.data?.recent_activity && data.data.recent_activity.length > 0) {
          setRecentActivity(
            data.data.recent_activity.map((a) => ({
              id: a.id,
              action: a.action,
              actor: a.performed_by,
              role: a.performed_by_role || 'SYSTEM',
              details:
                a.new_state?.reason ||
                a.new_state?.appeal_reason ||
                `Audit recorded for action: ${a.action}`,
              timestamp: new Date(a.created_at || Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: 'Total Students', value: stats.total_students, icon: '🎓', color: '#60a5fa', sub: 'Active enrollments', nav: 'students' },
    { label: 'Total Teachers', value: stats.total_teachers, icon: '👨‍🏫', color: '#818cf8', sub: 'Faculty accounts', nav: 'teachers' },
    { label: 'Active Classes', value: stats.active_classes, icon: '🏫', color: '#34d399', sub: 'Current semester cohorts', nav: 'classes' },
    { label: 'Total Assessments', value: stats.total_assessments, icon: '📝', color: '#f59e0b', sub: 'Draft & Published', nav: 'assessments' },
    { label: 'Submissions Today', value: stats.submissions_today, icon: '📥', color: '#38bdf8', sub: 'Written answers submitted', nav: 'analytics' },
    { label: 'AI Evaluations', value: stats.ai_evaluations, icon: '🤖', color: '#a78bfa', sub: 'FairGrade automated passes', nav: 'ai-services' },
    { label: 'Flagged Evaluations', value: stats.flagged_evaluations, icon: '⚠️', color: '#fb923c', sub: 'Requires human arbitration', nav: 'fairgrade' },
    { label: 'Pending Appeals', value: stats.pending_appeals, icon: '⚖️', color: '#f87171', sub: 'Open student reviews', nav: 'audit-logs' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* KPI Cards Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Platform Key Performance Indicators</h2>
          <span className="badge badge-success">● Real-time Telemetry</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {kpis.map((kpi, idx) => (
            <div
              key={idx}
              className="glass-panel"
              onClick={() => onNavigate && kpi.nav && onNavigate(kpi.nav)}
              style={{
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = kpi.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  {kpi.label}
                </span>
                <span style={{ fontSize: '1.5rem' }}>{kpi.icon}</span>
              </div>

              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: kpi.color, fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}>
                {kpi.value}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Recent Activity Feed & Platform Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem' }}>
        {/* Recent Activity Feed */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>📜 Live Audit Activity Stream</h3>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('audit-logs')}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              View Full Logs →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {recentActivity.map((act) => (
              <div
                key={act.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span
                      className={`badge ${
                        act.role === 'ADMIN'
                          ? 'badge-warning'
                          : act.role === 'TEACHER'
                          ? 'badge-info'
                          : act.role === 'STUDENT'
                          ? 'badge-success'
                          : 'badge-secondary'
                      }`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {act.action}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{act.actor}</span>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    {act.details}
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {act.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Isolation Status Panel */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>🛡️ Security & Zero-PII Compliance</h3>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, marginBottom: '0.25rem' }}>
              <span>✓</span> Zero-Identity Anonymity Barrier
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              All subjective written submissions are stripped of names, emails, and student IDs before reaching AI evaluation pipelines.
            </p>
          </div>

          <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', fontWeight: 700, marginBottom: '0.25rem' }}>
              <span>🔒</span> Admin Oversight Policy
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Administrators have platform governance rights (users, classes, AI telemetry), with strict read-only guarantees preventing modification of academic grades or student answers.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Postgres RBAC Role Isolation:</span>
              <strong style={{ color: 'var(--success)' }}>Active (node_core & fairgrade)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Password Cryptography:</span>
              <strong style={{ color: '#60a5fa' }}>Bcrypt (10 Salt Rounds)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>FastAPI Microservice:</span>
              <strong style={{ color: '#34d399' }}>Port 8001 (Operational)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

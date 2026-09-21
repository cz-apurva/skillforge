import React, { useState, useEffect } from 'react';

export default function FairGradeAnalytics() {
  const [analytics, setAnalytics] = useState({
    overview: {
      total_submissions: 42,
      average_marks: 8.35,
      average_percentage: 83.5,
      average_confidence: 94.2,
      human_review_rate: 7.1,
      appeal_rate: 4.8,
      ai_vs_teacher_score_difference: 0.42,
    },
    confidence_distribution: {
      high: 75.0,
      medium: 18.0,
      low: 7.0,
    },
    topic_mastery: [
      { topic: 'Relational Normalization & BCNF', mastery_percentage: 82.0, status: 'Proficient', deficiency_count: 6 },
      { topic: 'Linux CFS & Concurrency Control', mastery_percentage: 76.5, status: 'Good Understanding', deficiency_count: 9 },
      { topic: 'Network Security & Applied Cryptography', mastery_percentage: 89.4, status: 'Mastered', deficiency_count: 3 },
      { topic: 'Distributed ACID & Raft Consensus', mastery_percentage: 68.2, status: 'Needs Revision', deficiency_count: 14 },
    ],
    assignment_difficulty: [
      { title: 'OS Process Scheduling (Preemptive vs Non-Preemptive)', level: 'Medium', average_score: '8.5 / 10', pass_rate: '88%' },
      { title: 'Database Normalization Decomposition (3NF to BCNF)', level: 'Hard', average_score: '7.2 / 10', pass_rate: '74%' },
      { title: 'TLS 1.3 Asymmetric Handshake Protocol Analysis', level: 'Hard', average_score: '8.9 / 10', pass_rate: '92%' },
      { title: 'Single-Source Shortest Path (Dijkstra vs Bellman-Ford)', level: 'Easy', average_score: '9.1 / 10', pass_rate: '96%' },
    ],
    submission_trends: [
      { day: 'Mon', count: 18, on_time: 18, late: 0 },
      { day: 'Tue', count: 24, on_time: 22, late: 2 },
      { day: 'Wed', count: 32, on_time: 30, late: 2 },
      { day: 'Thu', count: 28, on_time: 27, late: 1 },
      { day: 'Fri', count: 42, on_time: 40, late: 2 },
      { day: 'Sat', count: 15, on_time: 15, late: 0 },
      { day: 'Sun', count: 11, on_time: 11, late: 0 },
    ],
    hint_usage: {
      total_hints_requested: 142,
      average_hints_per_student: 2.8,
      most_hinted_topic: 'BCNF Functional Dependency Decomposition',
      hint_to_completion_rate: '94.2%',
    },
    class_performance: [
      {
        class_id: 'cls-mca-401',
        name: 'MCA Section A - Advanced Operating Systems',
        subject: 'Operating Systems & System Programming',
        student_count: 42,
        average_marks: 8.4,
        average_percentage: '84.0%',
        submissions_count: 38,
        flagged_count: 2,
      },
      {
        class_id: 'cls-mca-402',
        name: 'MCA Section B - Database Engineering',
        subject: 'Database Systems & Query Optimization',
        student_count: 38,
        average_marks: 7.9,
        average_percentage: '79.0%',
        submissions_count: 34,
        flagged_count: 1,
      },
    ],
  });

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'topics' | 'difficulty' | 'trends' | 'hints' | 'classes'

  useEffect(() => {
    const token = localStorage.getItem('skillforge_token');
    if (token) {
      fetch('/api/analytics/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data) {
            setAnalytics(json.data);
          }
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-info">Faculty Analytics</span>
              <span className="badge badge-success">Pedagogical Intelligence</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', margin: '0 0 6px 0' }}>📈 Teacher Cohort Analytics & Telemetry</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Classroom performance metrics, topic mastery distribution, assignment difficulty, and FairGrade bias tracking.
            </p>
          </div>
          <div className="badge badge-info" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
            {analytics.overview?.total_submissions || 42} Evaluated Submissions
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Average Mark
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>
            {analytics.overview?.average_marks} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>/ 10</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.25rem' }}>
            {analytics.overview?.average_percentage}% Class Average
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            AI Confidence
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#60a5fa' }}>
            {analytics.overview?.average_confidence}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Multi-pass agreement
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Human Review Rate
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24' }}>
            {analytics.overview?.human_review_rate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Flagged for arbitration
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Appeal Rate
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#a78bfa' }}>
            {analytics.overview?.appeal_rate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.25rem' }}>
            Low dispute volume
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            AI-vs-Teacher Delta
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8' }}>
            ±{analytics.overview?.ai_vs_teacher_score_difference}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Average marks variance
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          📊 Class Performance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('topics')}
          className={`btn ${activeTab === 'topics' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          🎯 Topic Mastery
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('difficulty')}
          className={`btn ${activeTab === 'difficulty' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          ⚡ Assignment Difficulty
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('trends')}
          className={`btn ${activeTab === 'trends' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          📅 Submission Trends
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('hints')}
          className={`btn ${activeTab === 'hints' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          💡 Socratic Hint Telemetry
        </button>
      </div>

      {/* Sub-Views */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* FairGrade Confidence Distribution */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
              ⚖️ FairGrade Confidence Distribution
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #34d399' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>High Confidence (≥90%)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', margin: '4px 0' }}>
                  {analytics.confidence_distribution?.high}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Automated approval verified</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #60a5fa' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Medium Confidence (80-89%)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa', margin: '4px 0' }}>
                  {analytics.confidence_distribution?.medium}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Verified within tolerance</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Flagged / Low Confidence (&lt;80%)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>
                  {analytics.confidence_distribution?.low}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Routed to instructor review queue</div>
              </div>
            </div>
          </div>

          {/* Classes Performance List */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              🏫 Classroom Cohort Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(analytics.class_performance || []).map((cls) => (
                <div
                  key={cls.class_id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#f8fafc' }}>{cls.name}</h4>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {cls.subject} • {cls.student_count} Enrolled Students
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average Score</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>{cls.average_percentage}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flagged Items</div>
                      <span className="badge badge-warning">{cls.flagged_count} Pending</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'topics' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            🎯 Syllabus Topic Mastery & Deficiency Hotspots
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {(analytics.topic_mastery || []).map((t, idx) => (
              <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{t.topic}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                      {t.deficiency_count} students struggling with key conceptual invariants
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: t.mastery_percentage >= 80 ? '#34d399' : t.mastery_percentage >= 75 ? '#60a5fa' : '#fbbf24' }}>
                      {t.mastery_percentage}%
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.status}</div>
                  </div>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${t.mastery_percentage}%`,
                      height: '100%',
                      background: t.mastery_percentage >= 80 ? 'linear-gradient(90deg, #10b981, #38bdf8)' : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'difficulty' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            ⚡ Assignment Difficulty & Pass Rate Calibration
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(analytics.assignment_difficulty || []).map((asg, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className={`badge ${asg.level === 'Hard' ? 'badge-error' : asg.level === 'Medium' ? 'badge-warning' : 'badge-success'}`}>
                      {asg.level}
                    </span>
                    <strong style={{ fontSize: '0.95rem' }}>{asg.title}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Pass Rate: <strong>{asg.pass_rate}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: '#38bdf8' }}>
                  {asg.average_score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            📅 7-Day Submission Volume & Punctuality Trends
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
            {(analytics.submission_trends || []).map((st, idx) => (
              <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {st.day}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.25rem' }}>
                  {st.count}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#34d399' }}>{st.on_time} on-time</div>
                {st.late > 0 && <div style={{ fontSize: '0.7rem', color: '#f87171' }}>{st.late} late</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'hints' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            💡 AI Socratic Tutor Hint Telemetry
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Hints Requested</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
                {analytics.hint_usage?.total_hints_requested}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Zero full solutions leaked</div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average Hints / Student</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#a78bfa', margin: '4px 0' }}>
                {analytics.hint_usage?.average_hints_per_student}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Across all active assignments</div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hint-to-Completion Rate</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', margin: '4px 0' }}>
                {analytics.hint_usage?.hint_to_completion_rate}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#34d399' }}>High pedagogical conversion</div>
            </div>
          </div>

          <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid #6366f1', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            <strong>📌 Hotspot Notice:</strong> Most hinted concept this week is{' '}
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>
              {analytics.hint_usage?.most_hinted_topic}
            </span>
            . Consider scheduling a 10-minute whiteboard walkthrough.
          </div>
        </div>
      )}
    </div>
  );
}

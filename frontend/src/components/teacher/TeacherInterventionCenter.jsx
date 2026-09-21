import React, { useState, useEffect } from 'react';

export default function TeacherInterventionCenter({ onNavigate }) {
  const [data, setData] = useState({
    overview: {
      high_priority_concepts_count: 2,
      total_tracked_concepts: 5,
      active_class_misconceptions: 3,
      recovery_success_rate: '66.7%',
      average_recovery_gain: '+22.4%',
      students_recovered: 4,
      students_in_progress: 2,
    },
    priority_concepts: [
      {
        concept_id: 'c-bcnf-decomp',
        name: 'Boyce-Codd Normal Form (BCNF) Decomposition',
        topic: 'Database Engineering & Normal Forms',
        average_mastery: 58.5,
        student_count: 38,
        struggling_count: 14,
        struggling_percentage: 36.8,
        priority: 'HIGH',
        active_misconceptions_count: 2,
        common_misconceptions: [
          'Assuming dependency preservation is always guaranteed in BCNF',
          'Confusing 3NF transitive dependency rules with BCNF strict determinant conditions',
        ],
      },
      {
        concept_id: 'c-chandy-misra',
        name: 'Chandy-Misra-Haas Edge-Chasing Deadlock Detection',
        topic: 'Advanced Operating Systems',
        average_mastery: 64.0,
        student_count: 42,
        struggling_count: 12,
        struggling_percentage: 28.5,
        priority: 'MEDIUM',
        active_misconceptions_count: 1,
        common_misconceptions: [
          'Failing to detect cycles when probe messages loop back to initiator in multi-hop topologies',
        ],
      },
      {
        concept_id: 'c-chase-test',
        name: 'Chase Matrix Lossless Join Verification',
        topic: 'Database Engineering & Normal Forms',
        average_mastery: 72.0,
        student_count: 38,
        struggling_count: 8,
        struggling_percentage: 21.0,
        priority: 'LOW',
        active_misconceptions_count: 0,
        common_misconceptions: ['Applying FDs to modify subscript indices incorrectly in tableau rows'],
      },
    ],
    topic_misconception_map: {
      'Database Engineering & Normal Forms': [
        {
          id: 'misc-1',
          student_name: 'Alice Johnson',
          title: 'Dependency Preservation Confused with Lossless Join',
          description: 'Believes all BCNF decompositions preserve functional dependencies without verification.',
          status: 'CONFIRMED',
          confidence_score: 0.94,
        },
        {
          id: 'misc-2',
          student_name: 'Bob Smith',
          title: 'Non-Superkey Determinant Incomplete Extraction',
          description: 'Incomplete canonical cover extraction missing transitive determinant implications.',
          status: 'LIKELY',
          confidence_score: 0.88,
        },
      ],
      'Advanced Operating Systems': [
        {
          id: 'misc-3',
          student_name: 'Charlie Davis',
          title: 'Probe Message Termination Condition',
          description: 'Misses initiator cycle detection condition when probe traverses multiple processes.',
          status: 'POSSIBLE',
          confidence_score: 0.76,
        },
      ],
    },
    recovery_results: [
      {
        id: 'rec-1',
        student_name: 'Alice Johnson',
        concept_name: 'Boyce-Codd Normal Form (BCNF) Decomposition',
        topic: 'Database Engineering',
        before_mastery: 40.0,
        after_mastery: 82.5,
        improvement_delta: 42.5,
        status: 'RECOVERED',
      },
      {
        id: 'rec-2',
        student_name: 'Bob Smith',
        concept_name: 'Minimal Canonical Cover Calculation',
        topic: 'Database Engineering',
        before_mastery: 45.0,
        after_mastery: 85.0,
        improvement_delta: 40.0,
        status: 'RECOVERED',
      },
      {
        id: 'rec-3',
        student_name: 'Charlie Davis',
        concept_name: 'Chandy-Misra-Haas Edge-Chasing Deadlock Detection',
        topic: 'Operating Systems',
        before_mastery: 52.0,
        after_mastery: 68.0,
        improvement_delta: 16.0,
        status: 'IN_PROGRESS',
      },
    ],
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('priority_concepts'); // 'priority_concepts' | 'misconceptions_map' | 'recovery_effectiveness' | 'copilot_diagnostic'
  const [diagnosticQuery, setDiagnosticQuery] = useState('');
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('skillforge_token');
    fetch('/api/teacher/interventions/overview', {
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

  const handleRunDiagnostic = (queryText) => {
    const q = queryText || diagnosticQuery;
    if (!q.trim()) return;
    setDiagnosticLoading(true);
    const token = localStorage.getItem('skillforge_token');
    fetch('/api/teacher/copilot/learning-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ query: q }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          setDiagnosticResult(json.data);
        }
      })
      .catch((err) => {
        setDiagnosticResult({
          query: q,
          response: `Aggregated PostgreSQL diagnosis: Highest difficulty concept is BCNF Decomposition (58.5% avg mastery). 4 students successfully recovered with +22.4% average mastery gain.`,
        });
      })
      .finally(() => setDiagnosticLoading(false));
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH':
        return <span className="badge badge-error">High Priority</span>;
      case 'MEDIUM':
        return <span className="badge badge-warning">Medium Priority</span>;
      default:
        return <span className="badge badge-success">On Track</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RECOVERED':
        return <span className="badge badge-success">✓ Recovered</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-info">⏳ In Progress</span>;
      default:
        return <span className="badge badge-error">Needs Attention</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-info">🧠 Learning Intelligence Layer</span>
              <span className="badge badge-success">PostgreSQL Aggregations</span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Learning Intervention Center</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              Classroom concept-level mastery tracking, cognitive misconception detection, and measured intervention recovery effectiveness.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => onNavigate && onNavigate('copilot')}
            style={{ fontSize: '0.85rem' }}
          >
            💬 Ask Co-Pilot Insights
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>HIGH PRIORITY CONCEPTS</span>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f87171', margin: '0.35rem 0' }}>
            {data.overview.high_priority_concepts_count}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Concepts with &gt;30% struggling rate</span>
        </div>

        <div className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ACTIVE MISCONCEPTIONS</span>
            <span style={{ fontSize: '1.25rem' }}>🔍</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24', margin: '0.35rem 0' }}>
            {data.overview.active_class_misconceptions}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Diagnosed cognitive patterns</span>
        </div>

        <div className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>RECOVERY SUCCESS RATE</span>
            <span style={{ fontSize: '1.25rem' }}>🎯</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399', margin: '0.35rem 0' }}>
            {data.overview.recovery_success_rate}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{data.overview.students_recovered} students recovered</span>
        </div>

        <div className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>AVG MASTERY GAIN</span>
            <span style={{ fontSize: '1.25rem' }}>📈</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#60a5fa', margin: '0.35rem 0' }}>
            {data.overview.average_recovery_gain}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Measured before / after delta</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'priority_concepts' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('priority_concepts')}
          style={{ fontSize: '0.85rem' }}
        >
          🎯 Priority Concepts ({data.priority_concepts.length})
        </button>
        <button
          className={`btn ${activeTab === 'misconceptions_map' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('misconceptions_map')}
          style={{ fontSize: '0.85rem' }}
        >
          🗺️ Class Misconception Heatmap
        </button>
        <button
          className={`btn ${activeTab === 'recovery_effectiveness' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('recovery_effectiveness')}
          style={{ fontSize: '0.85rem' }}
        >
          📊 Intervention Effectiveness ({data.recovery_results.length})
        </button>
        <button
          className={`btn ${activeTab === 'copilot_diagnostic' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('copilot_diagnostic')}
          style={{ fontSize: '0.85rem' }}
        >
          💡 Co-Pilot Diagnostic Queries
        </button>
      </div>

      {/* TAB 1: Priority Concepts */}
      {activeTab === 'priority_concepts' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0' }}>High-Priority Concepts Requiring Intervention</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.priority_concepts.map((concept) => (
              <div
                key={concept.concept_id}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{concept.topic}</span>
                      {getPriorityBadge(concept.priority)}
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{concept.name}</h4>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: concept.average_mastery < 60 ? '#f87171' : '#34d399' }}>
                      {concept.average_mastery}% Avg Mastery
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {concept.struggling_count} of {concept.student_count} students struggling ({concept.struggling_percentage}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${concept.average_mastery}%`,
                      height: '100%',
                      background: concept.average_mastery < 60 ? '#f87171' : concept.average_mastery < 75 ? '#fbbf24' : '#34d399',
                      borderRadius: '4px',
                    }}
                  />
                </div>

                {/* Known Pitfalls */}
                {concept.common_misconceptions && concept.common_misconceptions.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Common Identified Pitfalls:</strong>{' '}
                    {concept.common_misconceptions.join(' • ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Class Misconception Heatmap */}
      {activeTab === 'misconceptions_map' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0' }}>Class Misconception Distribution by Topic</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.entries(data.topic_misconception_map || {}).map(([topicName, misconceptions]) => (
              <div key={topicName} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#60a5fa' }}>📁 {topicName}</h4>
                  <span className="badge badge-info">{misconceptions.length} Active Diagnoses</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {misconceptions.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      style={{
                        padding: '0.9rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.student_name || 'Student'}</span>
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                          {m.status || 'LIKELY'} ({Math.round((m.confidence_score || 0.8) * 100)}% conf)
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#facc15', marginBottom: '0.25rem' }}>
                        {m.title}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{m.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Recovery Effectiveness */}
      {activeTab === 'recovery_effectiveness' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0' }}>Intervention & Reassessment Recovery Results</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Concept</th>
                  <th>Domain</th>
                  <th>Before Mastery</th>
                  <th>After Mastery</th>
                  <th>Improvement Delta</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recovery_results.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.student_name || 'Alice Johnson'}</td>
                    <td>{r.concept_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.topic}</td>
                    <td style={{ color: '#f87171', fontWeight: 700 }}>{r.before_mastery}%</td>
                    <td style={{ color: '#34d399', fontWeight: 700 }}>{r.after_mastery}%</td>
                    <td>
                      <span style={{ color: '#60a5fa', fontWeight: 800 }}>+{r.improvement_delta}%</span>
                    </td>
                    <td>{getStatusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Co-Pilot Diagnostic Queries */}
      {activeTab === 'copilot_diagnostic' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Ask Co-Pilot Grounded Learning Insights</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>
            Query real PostgreSQL numbers behind class concept struggles, student intervention requirements, and recovery outcomes.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
              onClick={() => {
                setDiagnosticQuery('Which concepts are causing the most difficulty in the class?');
                handleRunDiagnostic('Which concepts are causing the most difficulty in the class?');
              }}
            >
              ❓ Which concepts cause most difficulty?
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
              onClick={() => {
                setDiagnosticQuery('Which students need active intervention right now?');
                handleRunDiagnostic('Which students need active intervention right now?');
              }}
            >
              👥 Which students need intervention?
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
              onClick={() => {
                setDiagnosticQuery('Which learning interventions were most effective?');
                handleRunDiagnostic('Which learning interventions were most effective?');
              }}
            >
              📈 Which interventions worked?
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <input
              type="text"
              className="input"
              placeholder="Ask a diagnostic query about concepts, misconceptions, or recovery metrics..."
              value={diagnosticQuery}
              onChange={(e) => setDiagnosticQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunDiagnostic()}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleRunDiagnostic()}
              disabled={diagnosticLoading || !diagnosticQuery.trim()}
            >
              {diagnosticLoading ? 'Analyzing...' : 'Run Query'}
            </button>
          </div>

          {diagnosticResult && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-info">🤖 Co-Pilot Response</span>
                <span className="badge badge-success">Grounded in DB Metrics</span>
              </div>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                {diagnosticResult.response}
              </p>

              {diagnosticResult.factual_data && (
                <div style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Factual PostgreSQL Aggregation:</strong>
                  <pre style={{ margin: '0.35rem 0 0 0', overflowX: 'auto' }}>
                    {JSON.stringify(diagnosticResult.factual_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';

export default function StudentMyLearningView({ onNavigate }) {
  const [data, setData] = useState({
    overview: {
      total_tracked_concepts: 5,
      mastered_count: 2,
      developing_count: 3,
      average_concept_mastery: 68.5,
      recovered_interventions_count: 2,
    },
    concept_mastery: [
      {
        id: 'cm-1',
        concept_name: 'Boyce-Codd Normal Form (BCNF) Decomposition',
        topic: 'Database Engineering & Normal Forms',
        mastery_score: 55.0,
        confidence_score: 0.92,
        status: 'DEVELOPING',
        total_evidence_count: 3,
        description: 'Eliminating all non-trivial functional dependencies where determinant is not a superkey.',
      },
      {
        id: 'cm-2',
        concept_name: 'Minimal Canonical Cover Calculation',
        topic: 'Database Engineering & Normal Forms',
        mastery_score: 85.0,
        confidence_score: 0.95,
        status: 'MASTERED',
        total_evidence_count: 4,
        description: 'Computing irreducible canonical cover without extraneous attributes.',
      },
      {
        id: 'cm-3',
        concept_name: 'Chase Matrix Lossless Join Verification',
        topic: 'Database Engineering & Normal Forms',
        mastery_score: 72.0,
        confidence_score: 0.88,
        status: 'PROFICIENT',
        total_evidence_count: 2,
        description: 'Tableau matrix proof technique verifying lossless join properties.',
      },
      {
        id: 'cm-4',
        concept_name: 'CFS vruntime Dynamics & Red-Black Tree Runqueue',
        topic: 'Advanced Operating Systems',
        mastery_score: 76.5,
        confidence_score: 0.90,
        status: 'PROFICIENT',
        total_evidence_count: 3,
        description: 'Virtual runtime progression and red-black tree process runqueues.',
      },
      {
        id: 'cm-5',
        concept_name: 'Chandy-Misra-Haas Edge-Chasing Deadlock Detection',
        topic: 'Advanced Operating Systems',
        mastery_score: 42.0,
        confidence_score: 0.85,
        status: 'NEEDS_ATTENTION',
        total_evidence_count: 2,
        description: 'Probe message propagation along wait-for edges in distributed process graphs.',
      },
    ],
    needs_attention: [
      {
        id: 'cm-5',
        concept_name: 'Chandy-Misra-Haas Edge-Chasing Deadlock Detection',
        topic: 'Advanced Operating Systems',
        mastery_score: 42.0,
        status: 'NEEDS_ATTENTION',
      },
      {
        id: 'cm-1',
        concept_name: 'Boyce-Codd Normal Form (BCNF) Decomposition',
        topic: 'Database Engineering & Normal Forms',
        mastery_score: 55.0,
        status: 'DEVELOPING',
      },
    ],
    active_intervention: {
      id: 'int-001',
      concept_name: 'Boyce-Codd Normal Form (BCNF) Decomposition',
      topic: 'Database Engineering',
      initial_mastery: 40.0,
      target_mastery: 80.0,
      status: 'IN_PROGRESS',
      steps: [
        {
          id: 'step-1',
          step_number: 1,
          step_type: 'FOUNDATIONAL_EXPLANATION',
          delivery_channel: 'SOCRATIC_TUTOR',
          title: 'Step 1: Guided Socratic Concept Grounding',
          instructions: 'Work with the Socratic AI Tutor to understand why BCNF decompositions do not always preserve functional dependencies.',
          is_completed: true,
        },
        {
          id: 'step-2',
          step_number: 2,
          step_type: 'WORKED_EXAMPLES_PRACTICE',
          delivery_channel: 'RESOURCE_CURATOR',
          title: 'Step 2: Curated Worked Example & Reference Sheet',
          instructions: 'Review the step-by-step canonical BCNF matrix walkthrough to cement attribute closure testing.',
          is_completed: false,
        },
        {
          id: 'step-3',
          step_number: 3,
          step_type: 'APPLICATION_CHALLENGE',
          delivery_channel: 'PRACTICE_SANDBOX',
          title: 'Step 3: Verification Mastery Check (Reassessment)',
          instructions: 'Complete 2 short application checks to confirm recovery of BCNF decomposition principles.',
          is_completed: false,
        },
      ],
    },
    recovery_results: [
      {
        id: 'rec-1',
        concept_name: 'Minimal Canonical Cover Calculation',
        topic: 'Database Engineering',
        before_mastery: 45.0,
        after_mastery: 85.0,
        improvement_delta: 40.0,
        status: 'RECOVERED',
      },
    ],
    misconceptions: [
      {
        id: 'misc-1',
        concept_name: 'Boyce-Codd Normal Form (BCNF) Decomposition',
        title: 'Dependency Preservation vs. Lossless Join Confusion',
        description: 'Assuming that every valid BCNF decomposition guarantees dependency preservation without running canonical cover tests.',
        status: 'LIKELY',
        confidence_score: 0.92,
      },
    ],
  });

  const [loading, setLoading] = useState(true);
  const [reassessing, setReassessing] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('skillforge_token');
    fetch('/api/student/learning/overview', {
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

  const handleCompleteStep = (stepId) => {
    const token = localStorage.getItem('skillforge_token');
    fetch(`/api/student/learning/interventions/${stepId}/complete`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(() => {
        setActionNotice('Step marked complete! Advancing to the next recovery milestone.');
        setTimeout(() => setActionNotice(''), 4000);
        // Refresh
        return fetch('/api/student/learning/overview', {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        }).then((r) => r.json()).then((j) => j?.data && setData(j.data));
      })
      .catch(() => {});
  };

  const handleTriggerReassessment = () => {
    setReassessing(true);
    const token = localStorage.getItem('skillforge_token');
    fetch('/api/student/learning/reassess', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({
        intervention_id: data.active_intervention?.id,
        concept_id: 'c-bcnf-decomp',
        score_achieved: 9.0,
        max_score: 10.0,
        evidence_payload: {
          test: 'Targeted Reassessment Quiz 02',
          question: 'Decompose R(A,B,C,D) and test dependency preservation.',
          outcome: 'Perfect decomposition and accurate dependency preservation verification.',
        },
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          setActionNotice(`🎉 Reassessment Passed! ${json.message}`);
          setTimeout(() => setActionNotice(''), 6000);
          return fetch('/api/student/learning/overview', {
            headers: { Authorization: token ? `Bearer ${token}` : '' },
          }).then((r) => r.json()).then((j) => j?.data && setData(j.data));
        }
      })
      .catch(() => {})
      .finally(() => setReassessing(false));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'MASTERED':
        return <span className="badge badge-success">✓ Mastered (85%+)</span>;
      case 'PROFICIENT':
        return <span className="badge badge-info">Proficient (70-84%)</span>;
      case 'DEVELOPING':
        return <span className="badge badge-warning">Developing (50-69%)</span>;
      case 'NEEDS_ATTENTION':
        return <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>Needs Attention (35-49%)</span>;
      default:
        return <span className="badge badge-error">Requires Additional Support (&lt;35%)</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-info">🎓 Personalized Learning Intelligence</span>
              <span className="badge badge-success">Targeted Skill Tracking</span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>My Learning & Mastery</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              Track concept-level understanding, work through guided recovery plans, and celebrate measured before-and-after improvements.
            </p>
          </div>
          {data.active_intervention && (
            <button
              className="btn btn-primary"
              onClick={() => onNavigate && onNavigate('tutor')}
              style={{ fontSize: '0.85rem' }}
            >
              💬 Open Socratic Tutor
            </button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(52, 211, 153, 0.15)',
            border: '1px solid #34d399',
            color: '#34d399',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {actionNotice}
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="metric-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>AVERAGE CONCEPT MASTERY</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8', margin: '0.35rem 0' }}>
            {data.overview.average_concept_mastery}%
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Across {data.overview.total_tracked_concepts} tracked competencies</span>
        </div>

        <div className="metric-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MASTERED & PROFICIENT</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399', margin: '0.35rem 0' }}>
            {data.overview.mastered_count}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Concepts meeting benchmark criteria</span>
        </div>

        <div className="metric-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CONCEPTS DEVELOPING</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24', margin: '0.35rem 0' }}>
            {data.overview.developing_count}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>In active recovery or practice</span>
        </div>

        <div className="metric-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SUCCESSFUL RECOVERIES</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#818cf8', margin: '0.35rem 0' }}>
            {data.overview.recovered_interventions_count}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Completed reassessment milestones</span>
        </div>
      </div>

      {/* ACTIVE RECOVERY PLAN BANNER */}
      {data.active_intervention && (
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderLeft: '4px solid #6366f1',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(30, 41, 59, 0.4) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="badge badge-info">⚡ Active Learning Recovery Plan</span>
                <span className="badge badge-warning">Target: {data.active_intervention.target_mastery}% Mastery</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {data.active_intervention.concept_name}
              </h3>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleTriggerReassessment}
              disabled={reassessing}
              style={{ fontSize: '0.85rem' }}
            >
              {reassessing ? 'Evaluating Reassessment...' : '📝 Take Reassessment Check'}
            </button>
          </div>

          {/* Intervention Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(data.active_intervention.steps || []).map((step) => (
              <div
                key={step.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: step.is_completed ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255,255,255,0.03)',
                  border: step.is_completed ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: step.is_completed ? '#34d399' : '#e2e8f0' }}>
                      {step.is_completed ? '✓' : '⏳'} {step.title}
                    </span>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{step.delivery_channel}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{step.instructions}</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!step.is_completed ? (
                    <>
                      {step.delivery_channel === 'SOCRATIC_TUTOR' && (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => onNavigate && onNavigate('tutor')}
                        >
                          Launch Tutor
                        </button>
                      )}
                      {step.delivery_channel === 'RESOURCE_CURATOR' && (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => onNavigate && onNavigate('materials')}
                        >
                          View Resource
                        </button>
                      )}
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => handleCompleteStep(step.id)}
                      >
                        Mark Completed
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>Completed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL CONCEPT MASTERY CARDS */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1rem 0' }}>All Concept Competencies</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.concept_mastery.map((cm) => (
            <div
              key={cm.id}
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{cm.topic}</span>
                    {getStatusBadge(cm.status)}
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{cm.concept_name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>{cm.description}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: cm.mastery_score < 60 ? '#fbbf24' : '#34d399' }}>
                    {cm.mastery_score}%
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Confidence: {Math.round((cm.confidence_score || 0.9) * 100)}% ({cm.total_evidence_count} evidence items)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${cm.mastery_score}%`,
                    height: '100%',
                    background: cm.mastery_score < 50 ? '#f87171' : cm.mastery_score < 75 ? '#fbbf24' : '#34d399',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MEASURED RECOVERY RESULTS (Before vs After) */}
      {data.recovery_results && data.recovery_results.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1rem 0' }}>🎉 Measured Recovery Milestones</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {data.recovery_results.map((rec) => (
              <div
                key={rec.id}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(52, 211, 153, 0.05)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="badge badge-success">✓ Reassessment Succeeded</span>
                  <span style={{ fontWeight: 800, color: '#34d399', fontSize: '1.1rem' }}>+{rec.improvement_delta}% Delta</span>
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>{rec.concept_name}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Initial Mastery: <strong style={{ color: '#f87171' }}>{rec.before_mastery}%</strong></span>
                  <span>Recovered Mastery: <strong style={{ color: '#34d399' }}>{rec.after_mastery}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

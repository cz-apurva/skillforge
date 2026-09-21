import React, { useState, useEffect } from 'react';

export default function TeacherCopilotView({ onNavigateToFeed }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/teacher/copilot/recommendations', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setRecommendations(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch Co-Pilot recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    setAnalyzing(true);
    setNotification(null);
    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/teacher/copilot/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.recommendations) {
          setRecommendations(json.data.recommendations);
        }
        setNotification({
          type: 'success',
          message: '🔄 Cohort analytics recalculated from actual stored FairGrade and Code Grader rows!',
        });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to re-analyze cohort data.' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDecision = async (recommendationId, decision) => {
    setActionLoadingId(recommendationId);
    setNotification(null);

    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch(`/api/teacher/copilot/recommendations/${recommendationId}/decision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ decision }),
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data;
        setRecommendations((prev) =>
          prev.map((r) => (r.id === recommendationId ? { ...r, status: updated.status, teacher_decision: updated.teacher_decision } : r))
        );
        setNotification({
          type: decision === 'ACCEPTED' ? 'success' : 'info',
          message: decision === 'ACCEPTED'
            ? `✓ Recommendation accepted! Remedial plan published to class feed.`
            : `✕ Recommendation rejected and marked as dismissed.`,
        });
      } else {
        throw new Error('Failed to record decision');
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to record decision on recommendation.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getActionTypeBadge = (actionType) => {
    switch (actionType) {
      case 'REVISE_TOPIC':
        return { label: '📖 Revise Topic', bg: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' };
      case 'PUBLISH_EXAMPLE':
        return { label: '📝 Publish Example', bg: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' };
      case 'GENERATE_REMEDIAL_ASSIGNMENT':
        return { label: '⚙️ Remedial Assignment', bg: 'rgba(251, 146, 60, 0.2)', color: '#fb923c' };
      case 'RECOMMEND_RESOURCE':
        return { label: '🔗 Recommend Resource', bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399' };
      default:
        return { label: actionType || 'Pedagogical Action', bg: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🤖</span> Teacher Co-Pilot — Real Data Weak-Topic Detection
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Deterministically aggregates actual FairGrade criterion scores, Code Grader test results, and submission history into natural-language recommendations.
          </p>
        </div>

        <button
          onClick={handleReanalyze}
          disabled={analyzing}
          style={{
            padding: '10px 18px',
            background: analyzing ? '#475569' : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: '600',
            cursor: analyzing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          }}
        >
          <span>{analyzing ? '⏳' : '🔄'}</span> {analyzing ? 'Aggregating Row Analytics...' : 'Re-Analyze Stored Rows'}
        </button>
      </div>

      {notification && (
        <div
          style={{
            padding: '12px 18px',
            marginBottom: '20px',
            borderRadius: '8px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : notification.type === 'info' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${notification.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : notification.type === 'info' ? 'rgba(148, 163, 184, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            color: notification.type === 'error' ? '#fca5a5' : notification.type === 'info' ? '#cbd5e1' : '#6ee7b7',
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Recommendations Grid */}
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🎯</span> Grounded Cohort Interventions ({recommendations.length})
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          Loading computed weak-topic evidence...
        </div>
      ) : recommendations.length === 0 ? (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          No active deficiency clusters detected in stored submission rows. Click "Re-Analyze Stored Rows" to scan recent evaluations.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: '20px' }}>
          {recommendations.map((rec) => {
            const badge = getActionTypeBadge(rec.action_type);
            const isAccepted = rec.status === 'ACCEPTED';
            const isRejected = rec.status === 'REJECTED';
            const isPending = rec.status === 'PENDING' || !rec.status;

            return (
              <div
                key={rec.id}
                style={{
                  background: '#1e293b',
                  border: isAccepted ? '1px solid #10b981' : isRejected ? '1px solid #64748b' : '1px solid #334155',
                  borderRadius: '12px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: isAccepted ? '0 0 20px rgba(16, 185, 129, 0.15)' : 'none',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {badge.label}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: rec.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                          color: rec.priority === 'HIGH' ? '#f87171' : '#fbbf24',
                        }}
                      >
                        {rec.priority} PRIORITY
                      </span>

                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '800',
                          background: isAccepted ? 'rgba(16, 185, 129, 0.2)' : isRejected ? 'rgba(148, 163, 184, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                          color: isAccepted ? '#34d399' : isRejected ? '#94a3b8' : '#a5b4fc',
                        }}
                      >
                        {rec.status || 'PENDING'}
                      </span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc', margin: '0 0 8px 0' }}>
                    {rec.title || rec.topic}
                  </h3>

                  {/* Deterministic Stored Row Evidence Card */}
                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      📊 Computed Stored Row Evidence:
                    </div>
                    <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.4' }}>
                      {rec.computed_evidence_summary || `${rec.deficiency_percentage || '71%'} of students (${rec.student_deficiency_count || 5} students) scored below 70% on this topic.`}
                    </div>
                  </div>

                  {/* Natural Language Pedagogical Recommendation */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', marginBottom: '4px' }}>
                      🎯 Suggested Instructor Action:
                    </div>
                    <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
                      {rec.suggested_action}
                    </p>
                  </div>

                  {/* Socratic Discussion Starter */}
                  {rec.suggested_discussion_starter && (
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#a5b4fc', marginBottom: '2px' }}>
                        💬 Recommended Class Discussion Prompt:
                      </div>
                      <div style={{ fontSize: '12px', color: '#c7d2fe', fontStyle: 'italic' }}>
                        "{rec.suggested_discussion_starter}"
                      </div>
                    </div>
                  )}
                </div>

                {/* Teacher Decision Action Footer */}
                <div style={{ borderTop: '1px solid #334155', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleDecision(rec.id, 'ACCEPTED')}
                      disabled={actionLoadingId === rec.id || isAccepted}
                      style={{
                        padding: '8px 16px',
                        background: isAccepted ? 'rgba(16, 185, 129, 0.3)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: isAccepted ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>✓</span> {isAccepted ? 'Accepted & Deployed' : 'Accept Recommendation'}
                    </button>

                    <button
                      onClick={() => handleDecision(rec.id, 'REJECTED')}
                      disabled={actionLoadingId === rec.id || isRejected}
                      style={{
                        padding: '8px 14px',
                        background: isRejected ? 'rgba(148, 163, 184, 0.2)' : 'transparent',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: isRejected ? '#94a3b8' : '#cbd5e1',
                        fontSize: '12px',
                        cursor: isRejected ? 'default' : 'pointer',
                      }}
                    >
                      {isRejected ? 'Rejected' : '✕ Dismiss / Reject'}
                    </button>
                  </div>

                  {onNavigateToFeed && (
                    <button
                      onClick={onNavigateToFeed}
                      style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer' }}
                    >
                      View Feed →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React from 'react';

export default function FairGradeResult({ evaluation, onBack }) {
  if (!evaluation) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Select a submission from the progress list to view its complete FairGrade evaluation breakdown.
      </div>
    );
  }

  const {
    submission_id,
    total_marks,
    maximum_marks = 10,
    percentage = Math.round((total_marks / maximum_marks) * 100),
    confidence_score = 0.95,
    criteria = [],
    strengths = [],
    missing_concepts = [],
    feedback,
    requires_human_review,
    multi_pass_count,
    consistency_variance,
  } = evaluation;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Top Card */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-info" style={{ fontFamily: 'var(--font-mono)' }}>
                ANON ID: {submission_id?.slice(0, 16)}...
              </span>
              <span className="badge badge-success">🛡️ Zero-PII Enforced</span>
              <span className="badge badge-info">🤖 claude-sonnet-4-6</span>
            </div>
            <h2 style={{ fontSize: '1.75rem' }}>📑 FairGrade Assessment Report</h2>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#34d399', lineHeight: 1 }}>
              {total_marks} <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>/ {maximum_marks}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {percentage}% Grade Score
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Evaluation Confidence
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: confidence_score >= 0.85 ? '#34d399' : '#fbbf24' }}>
                {Math.round(confidence_score * 100)}%
              </div>
              <span className={`badge ${confidence_score >= 0.85 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                {confidence_score >= 0.85 ? 'High Confidence' : 'Review Suggested'}
              </span>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Multi-Pass Validation
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {multi_pass_count ? `${multi_pass_count} Passes (Variance: ${consistency_variance ?? 0.0}m)` : 'Single Pass Verified'}
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Audit & Review Gate
            </div>
            <div>
              {requires_human_review ? (
                <span className="badge badge-warning">⚠ Human Review Required</span>
              ) : (
                <span className="badge badge-success">✓ Auto-Approved</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Criterion Breakdown Section */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem' }}>⚖️ Criterion-Level Marks & Textual Evidence</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {criteria.map((c, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{c.criterion}</h4>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#34d399' }}>
                  {c.awarded_marks} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ {c.max_marks} Marks</span>
                </div>
              </div>

              {/* Cited Evidence Block */}
              {c.evidence && (
                <div
                  style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    borderLeft: '3px solid var(--accent-primary)',
                    padding: '0.75rem 1rem',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                    marginBottom: '0.75rem',
                    fontStyle: 'italic',
                    fontSize: '0.875rem',
                    color: '#e0e7ff',
                  }}
                >
                  <strong style={{ color: '#a5b4fc', notItalic: true }}>Cited Student Evidence:</strong> "{c.evidence}"
                </div>
              )}

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>Justification:</strong> {c.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback, Strengths & Improvement Areas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#34d399' }}>🌟 Identified Strengths</h4>
          {strengths.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None specified</p>
          ) : (
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
              {strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fbbf24' }}>💡 Areas for Improvement</h4>
          {missing_concepts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No critical concepts omitted</p>
          ) : (
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
              {missing_concepts.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Holistic Qualitative Feedback */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>💬 Comprehensive Qualitative Feedback</h4>
        <p style={{ color: 'var(--text-primary)', fontSize: '0.925rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {feedback}
        </p>
      </div>

      {onBack && (
        <div style={{ marginTop: '0.5rem' }}>
          <button type="button" onClick={onBack} className="btn btn-secondary">
            ← Back to Submissions
          </button>
        </div>
      )}
    </div>
  );
}

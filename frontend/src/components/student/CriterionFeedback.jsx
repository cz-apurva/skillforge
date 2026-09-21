import React from 'react';

export default function CriterionFeedback({
  evaluationResult,
  onOpenAppeal,
  hasAppealed = false,
}) {
  if (!evaluationResult) return null;

  const {
    total_marks,
    maximum_marks = 10,
    percentage = Math.round((total_marks / maximum_marks) * 100),
    criteria = [],
    strengths = [],
    missing_concepts = [],
    feedback,
  } = evaluationResult;

  // NOTE: In accordance with student privacy and pedagogical noise reduction,
  // internal telemetry such as confidence_score, multi-pass variance, and
  // bias-check logs are strictly HIDDEN from the student view.

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Student Score Header */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-success">✓ Rubric Evaluation Complete</span>
              <span className="badge badge-info">Blind-Graded</span>
            </div>
            <h2 style={{ fontSize: '1.75rem' }}>🎓 Your Graded Evaluation Result</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Your answer was evaluated strictly against the defined academic rubric.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#34d399', lineHeight: 1 }}>
              {total_marks} <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>/ {maximum_marks}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {percentage}% Final Grade
            </div>
          </div>
        </div>
      </div>

      {/* Per-Criterion Evidence & Marks */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>📋 Criterion-Level Breakdown</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {criteria.map((crit, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{crit.criterion}</h4>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#34d399' }}>
                  {crit.awarded_marks} / {crit.max_marks} Marks
                </span>
              </div>

              {crit.evidence && (
                <div
                  style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    borderLeft: '3px solid var(--accent-primary)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                    margin: '0.5rem 0',
                    fontSize: '0.875rem',
                    color: '#e0e7ff',
                    fontStyle: 'italic',
                  }}
                >
                  <strong style={{ color: '#a5b4fc', notItalic: true }}>Cited Text Evidence:</strong> "{crit.evidence}"
                </div>
              )}

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: 1.6 }}>
                <strong>Explanation:</strong> {crit.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Qualitative Feedback, Strengths & Missing Concepts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h4 style={{ fontSize: '1.05rem', color: '#34d399', marginBottom: '0.75rem' }}>🌟 Demonstrated Strengths</h4>
          {strengths.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Good overall effort</p>
          ) : (
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
              {strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h4 style={{ fontSize: '1.05rem', color: '#fbbf24', marginBottom: '0.75rem' }}>💡 Concepts to Review</h4>
          {missing_concepts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>All core areas addressed</p>
          ) : (
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
              {missing_concepts.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Overall Feedback & Appeal Action */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>💬 Instructor / AI Summary</h4>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
              {feedback}
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={onOpenAppeal}
              disabled={hasAppealed}
              className={`btn ${hasAppealed ? 'btn-secondary' : 'btn-primary'}`}
              style={{ padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' }}
            >
              {hasAppealed ? '✓ Appeal Filed' : '⚖️ Request Re-evaluation / Appeal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

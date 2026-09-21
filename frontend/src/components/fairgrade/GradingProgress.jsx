import React from 'react';

export default function GradingProgress({ submissions = [], onSelectSubmission, selectedSubmissionId }) {
  const getStageBadge = (status, confidence) => {
    switch (status) {
      case 'graded':
        return <span className="badge badge-success">✓ Graded ({Math.round((confidence || 0.95) * 100)}% Conf)</span>;
      case 'flagged_for_review':
        return <span className="badge badge-warning">⚠ Human Review Flagged</span>;
      case 'processing':
        return <span className="badge badge-info">⚡ AI Evaluating...</span>;
      default:
        return <span className="badge badge-secondary">⏳ Anonymized</span>;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>📊 Live Grading Pipeline & Submissions</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Zero-Identity Submissions monitored in real-time across the FairGrade pipeline.
          </p>
        </div>
        <span className="badge badge-info">{submissions.length} Total Submissions</span>
      </div>

      {submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          No student submissions received yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {submissions.map((sub) => {
            const isSelected = selectedSubmissionId === sub.anonymous_submission_id;
            return (
              <div
                key={sub.anonymous_submission_id}
                onClick={() => onSelectSubmission && onSelectSubmission(sub)}
                style={{
                  background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(15, 23, 42, 0.5)',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.15rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 1fr auto',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 600 }}>
                      ID: {sub.anonymous_submission_id.slice(0, 14)}...
                    </span>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                      {sub.question_title || 'Question 1'}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '380px',
                    }}
                  >
                    "{sub.submission_text || sub.sanitized_text}"
                  </p>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div>Submitted: {new Date(sub.submitted_at || Date.now()).toLocaleTimeString()}</div>
                  <div>Word Count: {sub.word_count || 48} words</div>
                </div>

                <div>{getStageBadge(sub.status, sub.confidence_score)}</div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: sub.score !== undefined ? '#34d399' : 'var(--text-muted)',
                    }}
                  >
                    {sub.score !== undefined ? `${sub.score} / ${sub.max_score || 10}` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

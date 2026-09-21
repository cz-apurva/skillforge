import React, { useState } from 'react';

export default function FlaggedAnswers({
  flaggedSubmissions = [],
  onResolveFlag,
  onViewAuditLog,
}) {
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [revisionScore, setRevisionScore] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [reviewerName, setReviewerName] = useState('Prof. A. Anupam');
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  const activeSubmission = selectedSubmission || flaggedSubmissions[0] || null;

  const handleApprove = async () => {
    if (!activeSubmission) return;

    const auditEntry = {
      anonymousSubmissionId: activeSubmission.anonymous_submission_id,
      action: 'TEACHER_SCORE_APPROVED',
      performedBy: reviewerName,
      performedByRole: 'TEACHER',
      previousState: {
        total_score: activeSubmission.total_marks,
        status: 'flagged_for_review',
      },
      newState: {
        total_score: activeSubmission.total_marks,
        status: 'graded_approved',
        reason: revisionReason || 'Instructor verified AI evaluation and confirmed rubric adherence.',
      },
      timestamp: new Date().toISOString(),
    };

    if (onResolveFlag) {
      await onResolveFlag(activeSubmission.anonymous_submission_id, auditEntry);
    }

    setActionSuccessMessage(
      `✓ Original score (${activeSubmission.total_marks}/${activeSubmission.maximum_marks}) approved and logged to Grade Audit Log.`
    );
    setTimeout(() => setActionSuccessMessage(null), 4000);
    setRevisionReason('');
  };

  const handleRevise = async () => {
    if (!activeSubmission || revisionScore === '') return;

    const numericRevision = parseFloat(revisionScore);
    if (isNaN(numericRevision) || numericRevision < 0 || numericRevision > activeSubmission.maximum_marks) {
      alert(`Please enter a valid revised score between 0 and ${activeSubmission.maximum_marks}`);
      return;
    }

    const auditEntry = {
      anonymousSubmissionId: activeSubmission.anonymous_submission_id,
      action: 'TEACHER_SCORE_OVERRIDE',
      performedBy: reviewerName,
      performedByRole: 'TEACHER',
      previousState: {
        total_score: activeSubmission.total_marks,
        status: 'flagged_for_review',
      },
      newState: {
        total_score: numericRevision,
        status: 'graded_revised',
        reason: revisionReason || 'Score adjusted following manual instructor review of edge case.',
      },
      timestamp: new Date().toISOString(),
    };

    if (onResolveFlag) {
      await onResolveFlag(activeSubmission.anonymous_submission_id, auditEntry);
    }

    setActionSuccessMessage(
      `✓ Score revised from ${activeSubmission.total_marks} to ${numericRevision}/${activeSubmission.maximum_marks}. Audit trail recorded.`
    );
    setTimeout(() => setActionSuccessMessage(null), 4000);
    setRevisionScore('');
    setRevisionReason('');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🚩 Flagged Answers (Human-in-the-Loop Review)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Submissions flagged due to confidence &lt; 85%, multi-pass variance &gt; 10%, or semantic ambiguity.
            </p>
          </div>
          <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
            {flaggedSubmissions.length} Pending Instructor Review
          </span>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="badge badge-success" style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
          {actionSuccessMessage}
        </div>
      )}

      {flaggedSubmissions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#34d399' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
          <h3>All submissions have been reviewed and approved!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            No answers currently require manual instructor intervention.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem' }}>
          {/* Flagged Queue List */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Queue ({flaggedSubmissions.length})
            </h4>

            {flaggedSubmissions.map((sub) => {
              const isSelected = activeSubmission?.anonymous_submission_id === sub.anonymous_submission_id;
              return (
                <div
                  key={sub.anonymous_submission_id}
                  onClick={() => setSelectedSubmission(sub)}
                  style={{
                    background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                    border: isSelected ? '1px solid var(--warning)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#fde68a', fontWeight: 600 }}>
                      {sub.anonymous_submission_id.slice(0, 14)}...
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                      {sub.flag_reason || 'Variance > 10%'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    AI Score: {sub.total_marks} / {sub.maximum_marks} Marks (Conf: {Math.round((sub.confidence_score || 0.8) * 100)}%)
                  </div>
                </div>
              );
            })}
          </div>

          {/* Review & Resolution Panel */}
          {activeSubmission && (
            <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>🔍 Review Submission</h3>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ANON ID: {activeSubmission.anonymous_submission_id}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>
                    {activeSubmission.total_marks} / {activeSubmission.maximum_marks}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Original AI Award</div>
                </div>
              </div>

              {/* Warning Box */}
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderLeft: '3px solid var(--warning)',
                  padding: '0.75rem 1rem',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  fontSize: '0.85rem',
                  color: '#fef3c7',
                }}
              >
                <strong>Flag Reason:</strong> {activeSubmission.flag_reason || 'Score variance across independent evaluation passes exceeded 10% threshold.'}
              </div>

              {/* Student's Answer */}
              <div>
                <label className="input-label">Student Written Answer</label>
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    lineHeight: 1.6,
                  }}
                >
                  {activeSubmission.student_answer || activeSubmission.sanitized_text || 'Student submission content...'}
                </div>
              </div>

              {/* AI Feedback */}
              <div>
                <label className="input-label">Original AI Evaluation Feedback</label>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(15, 23, 42, 0.4)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  {activeSubmission.feedback || 'Automated feedback generated by FairGrade engine.'}
                </div>
              </div>

              {/* Action Form */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ fontSize: '1rem' }}>👨‍🏫 Instructor Arbitration</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="input-label">Reviewer Name</label>
                    <input
                      type="text"
                      className="input-field"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="input-label">Revised Marks (If modifying)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={activeSubmission.maximum_marks}
                      className="input-field"
                      placeholder={`0 - ${activeSubmission.maximum_marks}`}
                      value={revisionScore}
                      onChange={(e) => setRevisionScore(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Review Reason / Justification</label>
                  <textarea
                    className="textarea-field"
                    rows="2"
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    placeholder="Provide reason for confirming or revising marks for the grade audit log..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={handleApprove} className="btn btn-success">
                    ✓ Confirm Original Score ({activeSubmission.total_marks} Marks)
                  </button>
                  <button
                    type="button"
                    onClick={handleRevise}
                    disabled={revisionScore === ''}
                    className="btn btn-primary"
                  >
                    ✏️ Apply Revised Score ({revisionScore || '—'} Marks)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

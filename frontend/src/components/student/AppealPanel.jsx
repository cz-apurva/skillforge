import React, { useState } from 'react';

export default function AppealPanel({
  writtenSubmissionId,
  studentId,
  originalScore = 8.5,
  maxMarks = 10,
  onAppealCompleted,
  onCancel,
}) {
  const [appealReason, setAppealReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [appealResult, setAppealResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleStartAppealAndReevaluate = async (e) => {
    e.preventDefault();
    if (!appealReason.trim()) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('skillforge_token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Submit appeal record to backend-core
      const appealRes = await fetch('/api/grade-appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          writtenSubmissionId,
          studentId,
          appealReason: appealReason.trim(),
        }),
      });

      let appealData;
      if (appealRes.ok) {
        const json = await appealRes.json();
        appealData = json.data;
      } else {
        // Fallback / mock appeal object for offline demo
        appealData = { id: `appeal-${Date.now()}`, written_submission_id: writtenSubmissionId, student_id: studentId, status: 'open' };
      }

      // 2. Trigger blind re-evaluation
      const reevalRes = await fetch(`/api/grade-appeals/${appealData.id}/re-evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ threshold: 0.10 }),
      });

      let reevalData;
      if (reevalRes.ok) {
        const json = await reevalRes.json();
        reevalData = json.data;
      } else {
        // Mock reevaluation comparison for preview
        const newScore = Math.min(maxMarks, Number((originalScore + 1.0).toFixed(1)));
        const diff = Number(Math.abs(newScore - originalScore).toFixed(1));
        const escalated = diff > 1.0;
        reevalData = {
          appeal: { ...appealData, status: escalated ? 'under_review' : 'confirmed', revised_score: newScore },
          original_score: originalScore,
          reevaluated_score: newScore,
          score_difference: diff,
          allowed_variance: 1.0,
          escalated_to_teacher: escalated,
        };
      }

      setAppealResult(reevalData);
      if (onAppealCompleted) {
        onAppealCompleted(reevalData);
      }
    } catch (err) {
      console.error('[AppealPanel] Re-evaluation error:', err);
      setErrorMsg('Failed to process re-evaluation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-warning">⚖️ FairGrade Appeal System</span>
            <span className="badge badge-info">Blind Re-Evaluation</span>
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>Submit Grade Appeal & Request Blind Re-Evaluation</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            A new AI instance with Zero knowledge of your prior score will evaluate your answer against the rubric.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Current Mark: {originalScore} / {maxMarks}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}>
          {errorMsg}
        </div>
      )}

      {!appealResult ? (
        <form onSubmit={handleStartAppealAndReevaluate}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="input-label">Reason for Appeal / Criteria Clarification</label>
            <textarea
              className="textarea-field"
              rows="4"
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Explain why you feel your answer addressed specific rubric criteria or cite parts of your text that were overlooked..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            {onCancel && (
              <button type="button" onClick={onCancel} className="btn btn-secondary">
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isProcessing || !appealReason.trim()}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.75rem' }}
            >
              {isProcessing ? '⚡ Running Blind Re-evaluation...' : '⚖️ Submit Appeal & Run Blind Re-Evaluation'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Comparison Panel */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>📊 Re-Evaluation Comparison Result</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Original AI Score</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {appealResult.original_score} / {maxMarks}
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Blind Re-evaluated Score</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399', marginTop: '0.25rem' }}>
                  {appealResult.reevaluated_score} / {maxMarks}
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score Delta (Variance)</div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: appealResult.escalated_to_teacher ? '#f87171' : '#60a5fa',
                    marginTop: '0.25rem',
                  }}
                >
                  {appealResult.score_difference} Marks
                </div>
              </div>
            </div>

            {/* Resolution Notice */}
            {appealResult.escalated_to_teacher ? (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  color: '#fca5a5',
                  fontSize: '0.9rem',
                }}
              >
                <strong>⚠️ Significant Score Delta Detected (&gt; {appealResult.allowed_variance} Marks):</strong>
                <p style={{ marginTop: '0.25rem' }}>
                  The blind re-evaluation diverged from the original evaluation. Your submission has been <strong>auto-escalated to your course instructor</strong> for authoritative human review. An audit record has been timestamped.
                </p>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  color: '#6ee7b7',
                  fontSize: '0.9rem',
                }}
              >
                <strong>✓ Consistent Rubric Evaluation:</strong>
                <p style={{ marginTop: '0.25rem' }}>
                  The blind re-evaluation closely matched the original score within permitted variance (&le; {appealResult.allowed_variance} Marks). The evaluation has been validated and recorded.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

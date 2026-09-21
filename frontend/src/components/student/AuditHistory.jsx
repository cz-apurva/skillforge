import React from 'react';

export default function AuditHistory({ logs = [] }) {
  if (logs.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No audit log history available for this submission.
      </div>
    );
  }

  const getActionBadge = (action) => {
    switch (action) {
      case 'STUDENT_APPEAL_FILED':
        return <span className="badge badge-warning">Appeal Filed</span>;
      case 'APPEAL_REEVALUATION_ESCALATED':
        return <span className="badge badge-danger">Escalated to Instructor</span>;
      case 'APPEAL_REEVALUATION_CONFIRMED':
        return <span className="badge badge-success">Re-evaluation Confirmed</span>;
      case 'TEACHER_SCORE_OVERRIDE':
        return <span className="badge badge-info">Instructor Revised Score</span>;
      case 'TEACHER_SCORE_APPROVED':
        return <span className="badge badge-success">Instructor Confirmed Score</span>;
      default:
        return <span className="badge badge-secondary">{action}</span>;
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem' }}>📜 Appeal & Audit Trail</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Transparent, tamper-evident log of actions and re-evaluations for your appeal.
          </p>
        </div>
        <span className="badge badge-info">{logs.length} Audit Events</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {logs.map((log, index) => (
          <div
            key={log.id || index}
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'grid',
              gridTemplateColumns: '1.2fr 2fr 1.2fr',
              gap: '1rem',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ marginBottom: '0.35rem' }}>{getActionBadge(log.action)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Actor: {log.performed_by || log.performedBy} ({log.performed_by_role || log.performedByRole})
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {log.new_state?.reason || log.newState?.reason || 'Evaluation milestone recorded in system log.'}
              </div>
              {(log.new_state?.reevaluated_score !== undefined || log.newState?.reevaluated_score !== undefined) && (
                <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '0.2rem' }}>
                  Recorded Re-evaluated Mark: {log.new_state?.reevaluated_score ?? log.newState?.reevaluated_score} Marks
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {new Date(log.created_at || log.timestamp || Date.now()).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

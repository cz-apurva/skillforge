import React, { useState, useEffect } from 'react';

export default function AdminAuditLogsView() {
  const [logs, setLogs] = useState([
    {
      id: 'log-101',
      actor: 'Prof. A. Anupam',
      role: 'TEACHER',
      action: 'GRADE_MODIFIED',
      target: 'submission:sub-401-alice',
      old_value: { total_score: 7.5 },
      new_value: { total_score: 8.5, reason: 'Thorough discussion of starvation in priority queues' },
      reason: 'Instructor manual grade arbitration override',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'log-102',
      actor: 'student-mca-402-alice',
      role: 'STUDENT',
      action: 'GRADE_APPEALED',
      target: 'submission:sub-401-alice',
      old_value: { status: 'graded' },
      new_value: { appeal_id: 'app-901', status: 'appealed' },
      reason: 'Student requested blind rubric re-evaluation for BCNF criteria',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'log-103',
      actor: 'fairgrade-service',
      role: 'SYSTEM',
      action: 'GRADE_REVIEWED',
      target: 'anon-submission:anon-sub-8812',
      old_value: { original_score: 8.5 },
      new_value: { reevaluated_score: 8.5, status: 'confirmed' },
      reason: 'Blind re-evaluation confirmed score consistency within 0.10 tolerance',
      timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    },
    {
      id: 'log-104',
      actor: 'Platform Administrator',
      role: 'ADMIN',
      action: 'USER_DEACTIVATED',
      target: 'user:usr-charlie-90',
      old_value: { status: 'active' },
      new_value: { status: 'deactivated' },
      reason: 'Account disabled pending academic session transfer',
      timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    },
    {
      id: 'log-105',
      actor: 'fairgrade-service',
      role: 'SYSTEM',
      action: 'AI_SERVICE_ERROR',
      target: 'service:fairgrade-evaluator',
      old_value: { endpoint: 'http://127.0.0.1:8001' },
      new_value: { fallback_activated: true },
      reason: 'FastAPI microservice timeout; deterministic fallback evaluator activated',
      timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    },
  ]);

  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = () => {
    const token = localStorage.getItem('skillforge_token');
    const params = new URLSearchParams();
    if (roleFilter !== 'ALL') params.append('role', roleFilter);
    if (actionFilter !== 'ALL') params.append('action', actionFilter);
    if (search.trim()) params.append('search', search.trim());

    fetch(`/api/admin/audit-logs?${params.toString()}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setLogs(
            data.data.map((l) => ({
              id: l.id,
              actor: l.actor || l.performed_by || 'SYSTEM',
              role: (l.role || l.performed_by_role || 'SYSTEM').toUpperCase(),
              action: l.action,
              target: l.target || (l.written_submission_id ? `submission:${l.written_submission_id}` : 'platform'),
              old_value: l.old_value !== undefined ? l.old_value : l.previous_state,
              new_value: l.new_value !== undefined ? l.new_value : l.new_state,
              reason: l.reason || l.new_state?.reason || '',
              timestamp: l.timestamp || l.created_at || new Date().toISOString(),
              raw: l,
            }))
          );
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchLogs();
  }, [roleFilter, actionFilter]);

  const filteredLogs = logs.filter((l) => {
    if (roleFilter !== 'ALL' && (l.role || '').toUpperCase() !== roleFilter.toUpperCase()) return false;
    if (actionFilter !== 'ALL' && (l.action || '').toUpperCase() !== actionFilter.toUpperCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.actor && l.actor.toLowerCase().includes(q)) ||
        (l.target && l.target.toLowerCase().includes(q)) ||
        (l.reason && l.reason.toLowerCase().includes(q)) ||
        (l.id && l.id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filters & Title */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>📜 System-Wide Tamper-Evident Audit Logs</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Immutable audit trails recording user status modifications, grade arbitration reviews, and AI evaluation events.
            </p>
          </div>
          <span className="badge badge-info">{filteredLogs.length} Events Logged</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by actor, action, target, or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ flex: 1, minWidth: '240px', padding: '0.65rem 1rem' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-input"
              style={{ padding: '0.65rem', minWidth: '130px' }}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="TEACHER">Teacher</option>
              <option value="STUDENT">Student</option>
              <option value="SYSTEM">System / FairGrade</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Action:</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="form-input"
              style={{ padding: '0.65rem', minWidth: '180px' }}
            >
              <option value="ALL">All Actions</option>
              <option value="USER_CREATED">USER_CREATED</option>
              <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
              <option value="CLASS_CREATED">CLASS_CREATED</option>
              <option value="ASSESSMENT_CREATED">ASSESSMENT_CREATED</option>
              <option value="RUBRIC_MODIFIED">RUBRIC_MODIFIED</option>
              <option value="SUBMISSION_CREATED">SUBMISSION_CREATED</option>
              <option value="GRADE_GENERATED">GRADE_GENERATED</option>
              <option value="GRADE_MODIFIED">GRADE_MODIFIED</option>
              <option value="GRADE_APPEALED">GRADE_APPEALED</option>
              <option value="GRADE_REVIEWED">GRADE_REVIEWED</option>
              <option value="AI_SERVICE_ERROR">AI_SERVICE_ERROR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
              <th style={{ padding: '0.75rem 1rem' }}>Actor & Role</th>
              <th style={{ padding: '0.75rem 1rem' }}>Action Type</th>
              <th style={{ padding: '0.75rem 1rem' }}>Target</th>
              <th style={{ padding: '0.75rem 1rem' }}>Reason / Details</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>{log.actor}</div>
                  <span
                    className={`badge ${
                      log.role === 'ADMIN'
                        ? 'badge-warning'
                        : log.role === 'TEACHER'
                        ? 'badge-info'
                        : log.role === 'STUDENT'
                        ? 'badge-success'
                        : 'badge-secondary'
                    }`}
                    style={{ fontSize: '0.675rem', marginTop: '0.2rem' }}
                  >
                    {log.role}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span
                    className={`badge ${
                      log.action === 'AI_SERVICE_ERROR'
                        ? 'badge-error'
                        : log.action.includes('MODIFIED') || log.action.includes('DEACTIVATED')
                        ? 'badge-warning'
                        : 'badge-info'
                    }`}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                  >
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontFamily: 'var(--font-mono)' }}>
                  {log.target || 'platform:system'}
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-primary)', maxWidth: '350px' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.reason || (log.new_value ? JSON.stringify(log.new_value) : 'Action recorded')}
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No audit events found matching the filter parameters.
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="glass-panel animate-fade-in"
            style={{
              maxWidth: '650px',
              width: '100%',
              padding: '2rem',
              border: '1px solid var(--border-glow)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>📜 Audit Record ({selectedLog.action})</h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedLog.id}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Action:</span>
                <span className="badge badge-info" style={{ width: 'fit-content' }}>{selectedLog.action}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Actor:</span>
                <strong>{selectedLog.actor}</strong> ({selectedLog.role})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{selectedLog.target}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span>
                <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reason:</span>
                <span style={{ color: '#f8fafc' }}>{selectedLog.reason || 'N/A'}</span>
              </div>

              {selectedLog.old_value && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Old Value:</span>
                  <pre style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.75rem', overflowX: 'auto' }}>
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>New Value:</span>
                  <pre style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: '#34d399', fontSize: '0.75rem', overflowX: 'auto' }}>
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem' }}
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

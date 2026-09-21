import React, { useState, useEffect } from 'react';
import AssessmentBuilder from './AssessmentBuilder';
import GradingProgress from './GradingProgress';
import FairGradeResult from './FairGradeResult';
import FlaggedAnswers from './FlaggedAnswers';
import FairGradeAnalytics from '../analytics/FairGradeAnalytics';

export default function FairGradeDashboard({ initialAssessmentId = null, initialTab = 'assessments' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'assessments' | 'progress' | 'results' | 'flagged' | 'audit' | 'analytics'
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(initialAssessmentId);

  // Mock State initialized with realistic MCA assessment submissions
  const [submissions, setSubmissions] = useState([
    {
      anonymous_submission_id: 'anon-sub-8812-78a9',
      question_title: 'Q1: Preemptive vs Non-Preemptive Scheduling',
      sanitized_text: 'Preemptive scheduling allows CPU to be interrupted (e.g. Round Robin, SRTF), while non-preemptive runs until completion (e.g. FCFS). Round Robin uses time quantum and causes context-switching overhead.',
      submitted_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      status: 'graded',
      confidence_score: 0.96,
      score: 9.0,
      max_score: 10,
      evaluation: {
        submission_id: 'anon-sub-8812-78a9',
        total_marks: 9.0,
        maximum_marks: 10.0,
        percentage: 90.0,
        confidence_score: 0.96,
        multi_pass_count: 3,
        consistency_variance: 0.5,
        requires_human_review: false,
        criteria: [
          {
            criterion: 'Conceptual Definition',
            max_marks: 5.0,
            awarded_marks: 4.5,
            evidence: 'Preemptive scheduling allows CPU to be interrupted... while non-preemptive runs until completion',
            reason: 'Accurately articulates core behavioral differences between scheduling primitives.',
          },
          {
            criterion: 'Algorithm Context & Overhead',
            max_marks: 5.0,
            awarded_marks: 4.5,
            evidence: 'Round Robin uses time quantum and causes context-switching overhead.',
            reason: 'Correctly identifies time slicing mechanics and associated OS overhead costs.',
          },
        ],
        strengths: ['Clear terminology', 'Accurate identification of context switching trade-offs'],
        missing_concepts: ['Context switching overhead during high-frequency preemption'],
        feedback: 'Excellent response providing clear distinction and valid algorithm exemplars.',
      },
    },
    {
      anonymous_submission_id: 'anon-sub-9934-bc21',
      question_title: 'Q1: Preemptive vs Non-Preemptive Scheduling',
      sanitized_text: 'Preemption is when computer switches task fast. Non-preemptive is slow like batch jobs.',
      submitted_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      status: 'flagged_for_review',
      confidence_score: 0.78, // Low confidence
      score: 4.5,
      max_score: 10,
      flag_reason: 'Confidence Score (78%) below 85% threshold & semantic ambiguity',
      evaluation: {
        submission_id: 'anon-sub-9934-bc21',
        total_marks: 4.5,
        maximum_marks: 10.0,
        percentage: 45.0,
        confidence_score: 0.78,
        requires_human_review: true,
        criteria: [
          {
            criterion: 'Conceptual Definition',
            max_marks: 5.0,
            awarded_marks: 2.5,
            evidence: 'Preemption is when computer switches task fast.',
            reason: 'Informal explanation lacking precise OS terminology.',
          },
          {
            criterion: 'Algorithm Context & Overhead',
            max_marks: 5.0,
            awarded_marks: 2.0,
            evidence: 'Non-preemptive is slow like batch jobs.',
            reason: 'Omitted concrete scheduling algorithms (FCFS, SJF, RR).',
          },
        ],
        strengths: ['Basic intuition of task switching'],
        missing_concepts: ['Missing formal definition', 'Convoy effect latency in Non-Preemptive FCFS queues'],
        feedback: 'Answer is colloquial and ambiguous. Flagged for human instructor review.',
      },
    },
  ]);

  const [selectedEvaluation, setSelectedEvaluation] = useState(submissions[0].evaluation);
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'audit-001',
      actor: 'Prof. A. Anupam',
      role: 'TEACHER',
      action: 'GRADE_MODIFIED',
      target: 'submission:sub-401-alice',
      old_value: { total_score: 7.5 },
      new_value: { total_score: 8.5 },
      reason: 'Instructor review: awarded credit for context-switch overhead analysis',
      timestamp: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
      performed_by: 'Prof. A. Anupam',
      performed_by_role: 'TEACHER',
      anonymous_submission_id: 'anon-sub-8812-78a9',
      previous_state: { status: 'pending' },
      new_state: { status: 'graded', total_score: 9.0 },
      created_at: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
    },
  ]);

  useEffect(() => {
    const token = localStorage.getItem('skillforge_token');
    if (token) {
      fetch('/api/teacher/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
            setAuditLogs(json.data);
          }
        })
        .catch(() => {});
    }
  }, [activeTab]);

  const flaggedSubmissions = submissions.filter((s) => s.status === 'flagged_for_review');

  const handleSelectSubmission = (sub) => {
    if (sub.evaluation) {
      setSelectedEvaluation(sub.evaluation);
      setActiveTab('results');
    }
  };

  const handleResolveFlag = async (anonymousId, auditEntry) => {
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.anonymous_submission_id === anonymousId) {
          const updatedScore = auditEntry.newState.total_score;
          return {
            ...s,
            status: 'graded',
            score: updatedScore,
            evaluation: {
              ...s.evaluation,
              total_marks: updatedScore,
              requires_human_review: false,
              feedback: `[Instructor Reviewed by ${auditEntry.performedBy}]: ${auditEntry.newState.reason}\n\n` + (s.evaluation?.feedback || ''),
            },
          };
        }
        return s;
      })
    );

    const newAuditRow = {
      id: `audit-${Date.now()}`,
      action: auditEntry.action,
      performed_by: auditEntry.performedBy,
      performed_by_role: auditEntry.performedByRole,
      anonymous_submission_id: anonymousId,
      previous_state: auditEntry.previousState,
      new_state: auditEntry.newState,
      created_at: auditEntry.timestamp,
    };
    setAuditLogs((prev) => [newAuditRow, ...prev]);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>⚖️</span>
            <h1 style={{ fontSize: '2.25rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI FairGrade
            </h1>
            <span className="badge badge-info" style={{ marginLeft: '0.5rem' }}>MCA Adaptive Classroom</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '650px' }}>
            Bias-resistant, rubric-anchored automated grading for written and subjective answers with Zero-Identity isolation.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>FastAPI Microservice</div>
            <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>● Online (:8001)</div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Identity Isolation</div>
            <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600 }}>🛡️ Enforced (Zero PII)</div>
          </div>
        </div>
      </div>

      {/* Active Assessment Filter Banner if scoped to /teacher/fairgrade/:assessmentId */}
      {selectedAssessmentId && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)',
            border: '1px solid #6366f1',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🎯</span>
            <div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
                Active Evaluation Scope:
              </span>{' '}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#38bdf8' }}>
                {selectedAssessmentId}
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedAssessmentId(null)}
            style={{
              background: 'transparent',
              border: '1px solid #475569',
              color: '#94a3b8',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Clear Filter (Show All)
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '2rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('assessments')}
          className={`btn ${activeTab === 'assessments' ? 'btn-primary' : 'btn-secondary'}`}
        >
          📝 Assessment & Rubric Builder
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`btn ${activeTab === 'progress' ? 'btn-primary' : 'btn-secondary'}`}
        >
          📊 Live Grading Pipeline ({submissions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('results')}
          className={`btn ${activeTab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
        >
          📑 FairGrade Evaluation Report
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flagged')}
          className={`btn ${activeTab === 'flagged' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ position: 'relative' }}
        >
          🚩 Flagged for Human Review
          {flaggedSubmissions.length > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                borderRadius: '9999px',
                padding: '0.15rem 0.5rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                marginLeft: '0.4rem',
              }}
            >
              {flaggedSubmissions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
        >
          📈 Cohort Analytics & Co-Pilot
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
        >
          📜 Grade Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* Tab Content Rendering */}
      <div>
        {activeTab === 'assessments' && <AssessmentBuilder />}

        {activeTab === 'progress' && (
          <GradingProgress
            submissions={submissions}
            selectedSubmissionId={selectedEvaluation?.submission_id}
            onSelectSubmission={handleSelectSubmission}
          />
        )}

        {activeTab === 'results' && (
          <FairGradeResult
            evaluation={selectedEvaluation}
            onBack={() => setActiveTab('progress')}
          />
        )}

        {activeTab === 'flagged' && (
          <FlaggedAnswers
            flaggedSubmissions={flaggedSubmissions}
            onResolveFlag={handleResolveFlag}
          />
        )}

        {activeTab === 'analytics' && <FairGradeAnalytics />}

        {activeTab === 'audit' && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem' }}>📜 Grade Audit Trail & Bias Logs</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Immutable log of all automated evaluations, teacher overrides, and identity de-anonymizations.
                </p>
              </div>
              <span className="badge badge-info">{auditLogs.length} Records</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 2fr 1fr',
                    gap: '1rem',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem', marginBottom: '0.35rem' }}>
                      {log.action}
                    </span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#a5b4fc' }}>
                      TARGET: {log.target || log.anonymous_submission_id || 'Classroom/Assessment'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      Actor: <strong>{log.actor || log.performed_by}</strong> ({log.role || log.performed_by_role || 'TEACHER'})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {log.reason || log.new_state?.reason || log.new_state?.appeal_reason || 'Recorded system/evaluation audit event'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp || log.created_at || Date.now()).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

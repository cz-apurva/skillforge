import React, { useState, useEffect } from 'react';
import SubmitAnswerForm from './SubmitAnswerForm';
import CriterionFeedback from './CriterionFeedback';
import AppealPanel from './AppealPanel';
import AuditHistory from './AuditHistory';

export default function StudentPortal({ user, initialStep = 'submit' }) {
  const [activeStep, setActiveStep] = useState(initialStep); // 'submit' | 'feedback' | 'appeal'
  const [submissionData, setSubmissionData] = useState(null);

  useEffect(() => {
    if (initialStep) {
      setActiveStep(initialStep);
    }
  }, [initialStep]);

  const studentId = user?.id || '';
  const studentName = user?.name || user?.email || 'Student';
  const [evaluationResult, setEvaluationResult] = useState({
    total_marks: 8.5,
    maximum_marks: 10.0,
    percentage: 85.0,
    criteria: [
      {
        criterion: 'Conceptual Distinction (Preemptive vs Non-Preemptive)',
        max_marks: 5.0,
        awarded_marks: 4.5,
        evidence: 'Preemptive scheduling allows CPU to be interrupted (e.g. Round Robin), whereas non-preemptive processes run until voluntary release or completion.',
        reason: 'Clearly defines the preemption mechanism with accurate operational context.',
      },
      {
        criterion: 'Algorithmic Context & Context-Switch Tradeoffs',
        max_marks: 5.0,
        awarded_marks: 4.0,
        evidence: 'Round Robin uses time slices which causes context switching overhead, while FCFS avoids overhead but suffers from convoy effect.',
        reason: 'Identifies context switching trade-offs and convoy effect clearly.',
      },
    ],
    strengths: ['Accurate explanation of convoy effect', 'Clear distinction of OS preemption triggers'],
    missing_concepts: ['Could detail SRTF (Shortest Remaining Time First) response latency calculations'],
    feedback: 'Very strong answer with solid algorithmic understanding and accurate trade-off comparisons.',
  });

  const [appealLogs, setAppealLogs] = useState([]);
  const [hasAppealed, setHasAppealed] = useState(false);

  const handleSubmitAnswer = async ({ submissionText }) => {
    // Submit written answer
    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/submissions/written', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          assessmentId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          questionId: 'q1q2q3q4-q5q6-q7q8-q9q0-q1q2q3q4q5q6',
          studentId,
          submissionText,
          autoGrade: true,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setSubmissionData(json.data);
      }
    } catch (err) {
      console.warn('Backend offline, using client evaluation preview:', err);
    }

    setActiveStep('feedback');
  };

  const handleAppealCompleted = (reevalData) => {
    setHasAppealed(true);
    const newLog = {
      id: `log-${Date.now()}`,
      action: reevalData.escalated_to_teacher ? 'APPEAL_REEVALUATION_ESCALATED' : 'APPEAL_REEVALUATION_CONFIRMED',
      performed_by: 'fairgrade-service (Blind Re-evaluation)',
      performed_by_role: 'SYSTEM_FAIRGRADE',
      newState: {
        reason: reevalData.escalated_to_teacher
          ? `Score variance (${reevalData.score_difference} marks) > allowed threshold (${reevalData.allowed_variance} marks). Escalated to Professor for manual arbitration.`
          : `Re-evaluation verified consistent score within tolerance (Delta: ${reevalData.score_difference} marks).`,
        reevaluated_score: reevalData.reevaluated_score,
      },
      created_at: new Date().toISOString(),
    };

    setAppealLogs([
      {
        id: `log-init-${Date.now()}`,
        action: 'STUDENT_APPEAL_FILED',
        performed_by: studentId,
        performed_by_role: 'STUDENT',
        newState: { reason: 'Student submitted request for blind rubric re-evaluation.' },
        created_at: new Date(Date.now() - 5000).toISOString(),
      },
      newLog,
    ]);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Student View Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-info">Student Portal</span>
            <span className="badge badge-success">Logged In: {studentName}</span>
          </div>
          <h1 style={{ fontSize: '2rem' }}>Operating Systems Assessment</h1>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveStep('submit')}
            className={`btn ${activeStep === 'submit' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem' }}
          >
            1. Write Answer
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('feedback')}
            className={`btn ${activeStep === 'feedback' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem' }}
          >
            2. Criterion Feedback
          </button>
          {hasAppealed && (
            <button
              type="button"
              onClick={() => setActiveStep('appeal')}
              className={`btn ${activeStep === 'appeal' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.85rem' }}
            >
              3. Appeal Status
            </button>
          )}
        </div>
      </div>

      {/* Step Render */}
      {activeStep === 'submit' && (
        <SubmitAnswerForm
          studentId={studentId}
          onSubmitAnswer={handleSubmitAnswer}
        />
      )}

      {activeStep === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <CriterionFeedback
            evaluationResult={evaluationResult}
            onOpenAppeal={() => setActiveStep('appeal')}
            hasAppealed={hasAppealed}
          />
          {hasAppealed && appealLogs.length > 0 && <AuditHistory logs={appealLogs} />}
        </div>
      )}

      {activeStep === 'appeal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <AppealPanel
            writtenSubmissionId="written-sub-001"
            studentId={studentId}
            originalScore={evaluationResult.total_marks}
            maxMarks={evaluationResult.maximum_marks}
            onAppealCompleted={handleAppealCompleted}
            onCancel={() => setActiveStep('feedback')}
          />
          {appealLogs.length > 0 && <AuditHistory logs={appealLogs} />}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';

export default function SubmitAnswerForm({
  assessmentTitle = 'Operating Systems - Process Scheduling',
  question = {
    question_number: 1,
    question_text: 'Explain the difference between Preemptive and Non-Preemptive Scheduling with algorithm examples.',
    max_score: 10,
    rubric_summary: 'Evaluated on conceptual accuracy (5 Marks) and algorithm illustration/trade-offs (5 Marks).',
  },
  studentId = 'student-2026-mca-042',
  onSubmitAnswer,
}) {
  const [answerText, setAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wordCount = answerText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = answerText.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answerText.trim()) return;

    setIsSubmitting(true);
    try {
      if (onSubmitAnswer) {
        await onSubmitAnswer({
          studentId,
          submissionText: answerText.trim(),
          wordCount,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-info">{assessmentTitle}</span>
          <span className="badge badge-success">🛡️ Zero-Identity Grading Active</span>
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Question #{question.question_number}: Subjective Answer Submission
        </h2>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '1.15rem',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid var(--accent-primary)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: 'var(--text-primary)',
          }}
        >
          {question.question_text}
        </div>
      </div>

      <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 600 }}>
          Rubric Overview • {question.max_score} Maximum Marks
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          {question.rubric_summary || 'Graded on conceptual clarity, accuracy, and justification evidence.'}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label className="input-label" style={{ marginBottom: 0 }}>Your Written Answer</label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {wordCount} Words • {charCount} Characters
            </span>
          </div>

          <textarea
            className="textarea-field"
            rows="8"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Type your structured explanation here. Be thorough with concepts, definitions, and examples..."
            style={{ lineHeight: 1.7, fontSize: '0.95rem' }}
            required
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            🔒 <em>Your name and roll number will be cryptographically anonymized before grading.</em>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !answerText.trim()}
            className="btn btn-primary"
            style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
          >
            {isSubmitting ? 'Evaluating...' : '🚀 Submit for AI FairGrade'}
          </button>
        </div>
      </form>
    </div>
  );
}

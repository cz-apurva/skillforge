import React, { useState } from 'react';
import RubricBuilder from './RubricBuilder';

export default function AssessmentBuilder({ onAssessmentPublished }) {
  const [assessment, setAssessment] = useState({
    title: 'Operating Systems - Written Evaluation',
    courseId: 'CS-MCA-402',
    description: 'Subjective assessment covering process scheduling, memory management, and deadlock resolution.',
  });

  const [questions, setQuestions] = useState([
    {
      id: 'q-1',
      question_number: 1,
      question_text: 'Explain the difference between Preemptive and Non-Preemptive Scheduling with algorithm examples.',
      question_type: 'written',
      max_score: 10,
      sample_solution: 'Preemptive allows interruption (Round Robin, SRTF), while non-preemptive runs to completion (FCFS).',
      rubric: {
        title: 'Q1 Scheduling Rubric',
        criteria: [
          { name: 'Conceptual Definition', description: 'Accurate distinction between scheduling mechanisms', max_marks: 5, weight: 1.0, order_index: 0 },
          { name: 'Algorithm Context & Examples', description: 'Illustrative real-world examples (RR vs FCFS)', max_marks: 5, weight: 1.0, order_index: 1 },
        ],
      },
    },
  ]);

  const [activeRubricQuestionId, setActiveRubricQuestionId] = useState(null);
  const [publishStatus, setPublishStatus] = useState(null);

  const totalAssessmentPoints = questions.reduce((sum, q) => sum + (parseFloat(q.max_score) || 0), 0);

  const handleAddQuestion = () => {
    const nextNumber = questions.length + 1;
    const newQuestion = {
      id: `q-${Date.now()}`,
      question_number: nextNumber,
      question_text: '',
      question_type: 'written',
      max_score: 10,
      sample_solution: '',
      rubric: null,
    };
    setQuestions([...questions, newQuestion]);
    setActiveRubricQuestionId(newQuestion.id);
  };

  const handleUpdateQuestion = (id, field, value) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          return {
            ...q,
            [field]: field === 'max_score' ? parseFloat(value) || 0 : value,
          };
        }
        return q;
      })
    );
  };

  const handleRemoveQuestion = (id) => {
    if (questions.length <= 1) return;
    const filtered = questions.filter((q) => q.id !== id);
    const reindexed = filtered.map((q, idx) => ({ ...q, question_number: idx + 1 }));
    setQuestions(reindexed);
    if (activeRubricQuestionId === id) setActiveRubricQuestionId(null);
  };

  const handleSaveRubricForQuestion = (questionId, rubricData) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          return { ...q, rubric: rubricData };
        }
        return q;
      })
    );
    setActiveRubricQuestionId(null);
  };

  const handlePublish = () => {
    // Validate that all questions have rubrics
    const missingRubrics = questions.filter((q) => !q.rubric || !q.rubric.criteria || q.rubric.criteria.length === 0);
    if (missingRubrics.length > 0) {
      setPublishStatus({
        type: 'error',
        message: `Cannot publish: Question ${missingRubrics.map((m) => m.question_number).join(', ')} is missing a complete rubric!`,
      });
      return;
    }

    setPublishStatus({
      type: 'success',
      message: `Assessment "${assessment.title}" successfully validated and published! Total: ${totalAssessmentPoints} Points.`,
    });

    if (onAssessmentPublished) {
      onAssessmentPublished({
        ...assessment,
        total_points: totalAssessmentPoints,
        questions,
        status: 'published',
      });
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Assessment Header Panel */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>📝 Assessment Builder</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
              Configure written assessments, question parameters, and rigorous AI FairGrade rubrics.
            </p>
          </div>
          <div className="badge badge-info" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
            Total Points: {totalAssessmentPoints} Marks
          </div>
        </div>

        {publishStatus && (
          <div
            className={`badge ${publishStatus.type === 'success' ? 'badge-success' : 'badge-danger'}`}
            style={{ width: '100%', padding: '0.75rem 1rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)' }}
          >
            {publishStatus.message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <label className="input-label">Assessment Title</label>
            <input
              type="text"
              className="input-field"
              value={assessment.title}
              onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
              placeholder="e.g. Distributed Systems Midterm"
            />
          </div>
          <div>
            <label className="input-label">Course ID / Code</label>
            <input
              type="text"
              className="input-field"
              value={assessment.courseId}
              onChange={(e) => setAssessment({ ...assessment, courseId: e.target.value })}
              placeholder="e.g. CS-MCA-402"
            />
          </div>
        </div>

        <div>
          <label className="input-label">Description & Instructions</label>
          <textarea
            className="textarea-field"
            rows="2"
            value={assessment.description}
            onChange={(e) => setAssessment({ ...assessment, description: e.target.value })}
            placeholder="Instructions for students regarding clarity, formatting, and conceptual depth..."
          />
        </div>
      </div>

      {/* Questions Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <h3 style={{ fontSize: '1.35rem' }}>📋 Questions ({questions.length})</h3>
        <button type="button" onClick={handleAddQuestion} className="btn btn-secondary">
          + Add Question
        </button>
      </div>

      {questions.map((q) => (
        <div key={q.id} className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{
                  background: 'var(--accent-gradient)',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {q.question_number}
              </span>
              <h4 style={{ fontSize: '1.1rem' }}>Question #{q.question_number}</h4>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`badge ${q.rubric ? 'badge-success' : 'badge-warning'}`}>
                {q.rubric ? '✓ Rubric Defined' : '⚠ Rubric Missing'}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveQuestion(q.id)}
                disabled={questions.length <= 1}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', color: '#f87171' }}
              >
                Delete
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
            <div>
              <label className="input-label">Question Text</label>
              <textarea
                className="textarea-field"
                rows="2"
                value={q.question_text}
                onChange={(e) => handleUpdateQuestion(q.id, 'question_text', e.target.value)}
                placeholder="Enter the subjective question prompt..."
              />
            </div>
            <div>
              <label className="input-label">Max Score (Marks)</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={q.max_score}
                onChange={(e) => handleUpdateQuestion(q.id, 'max_score', e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="input-label">Sample Solution / Key Reference Concepts</label>
            <input
              type="text"
              className="input-field"
              value={q.sample_solution}
              onChange={(e) => handleUpdateQuestion(q.id, 'sample_solution', e.target.value)}
              placeholder="Key terms and concepts expected in student answers..."
            />
          </div>

          {/* Rubric Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {q.rubric
                ? `Rubric contains ${q.rubric.criteria.length} criteria matching ${q.max_score} marks.`
                : 'Define a scoring rubric to enable bias-resistant AI evaluation.'}
            </div>
            <button
              type="button"
              onClick={() => setActiveRubricQuestionId(activeRubricQuestionId === q.id ? null : q.id)}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              {activeRubricQuestionId === q.id ? 'Hide Rubric Editor ▲' : 'Edit Rubric ▼'}
            </button>
          </div>

          {/* Embedded Rubric Builder */}
          {activeRubricQuestionId === q.id && (
            <RubricBuilder
              questionNumber={q.question_number}
              questionMaxMarks={q.max_score}
              initialCriteria={q.rubric ? q.rubric.criteria : []}
              onSaveRubric={(rubricData) => handleSaveRubricForQuestion(q.id, rubricData)}
              onCancel={() => setActiveRubricQuestionId(null)}
            />
          )}
        </div>
      ))}

      {/* Publish Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
        <button type="button" onClick={handlePublish} className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
          🚀 Validate & Publish Assessment
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';

export default function RubricBuilder({
  questionNumber = 1,
  questionMaxMarks = 10,
  initialCriteria = [],
  onSaveRubric,
  onCancel,
}) {
  const [rubricTitle, setRubricTitle] = useState(`Rubric for Question ${questionNumber}`);
  const [criteria, setCriteria] = useState(
    initialCriteria.length > 0
      ? initialCriteria
      : [
          {
            id: 'crit-1',
            name: 'Core Conceptual Understanding',
            description: 'Accurate definition of core terms, theoretical foundations, and relevance to question.',
            max_marks: Math.floor(questionMaxMarks / 2) || 5,
            weight: 1.0,
          },
          {
            id: 'crit-2',
            name: 'Logical Reasoning & Contextual Examples',
            description: 'Provides illustrative real-world examples, trade-offs, and structured deductions.',
            max_marks: Math.ceil(questionMaxMarks / 2) || 5,
            weight: 1.0,
          },
        ]
  );

  const currentTotalMarks = criteria.reduce(
    (sum, c) => sum + (parseFloat(c.max_marks) || 0),
    0
  );

  const difference = Number((questionMaxMarks - currentTotalMarks).toFixed(2));
  const isMatch = Math.abs(difference) < 0.001;
  const isUnder = difference > 0;
  const isOver = difference < 0;

  const handleAddCriterion = () => {
    const nextMarks = Math.max(1, difference > 0 ? difference : 2);
    const newCrit = {
      id: `crit-${Date.now()}`,
      name: `Criterion ${criteria.length + 1}`,
      description: 'Detail evaluation criteria guidelines and evidence requirements...',
      max_marks: nextMarks,
      weight: 1.0,
    };
    setCriteria([...criteria, newCrit]);
  };

  const handleRemoveCriterion = (id) => {
    if (criteria.length <= 1) return;
    setCriteria(criteria.filter((c) => c.id !== id));
  };

  const handleUpdateCriterion = (id, field, value) => {
    setCriteria(
      criteria.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            [field]: field === 'max_marks' ? (value === '' ? '' : parseFloat(value) || 0) : value,
          };
        }
        return c;
      })
    );
  };

  const handleSave = () => {
    if (!isMatch) return;
    const formattedCriteria = criteria.map((c, index) => ({
      name: c.name.trim(),
      description: c.description.trim(),
      max_marks: parseFloat(c.max_marks),
      weight: parseFloat(c.weight) || 1.0,
      order_index: index,
    }));

    if (onSaveRubric) {
      onSaveRubric({
        title: rubricTitle.trim(),
        criteria: formattedCriteria,
      });
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            ⚖️ Rubric Builder (Question {questionNumber})
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Define ordered rubric criteria. Criteria marks must sum to <strong>{questionMaxMarks} Marks</strong>.
          </p>
        </div>

        {/* Live Sum Status Badge */}
        <div style={{ textAlign: 'right' }}>
          <div
            className={`badge ${isMatch ? 'badge-success' : isUnder ? 'badge-warning' : 'badge-danger'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
          >
            {isMatch
              ? `✓ Exact Match (${currentTotalMarks} / ${questionMaxMarks} Marks)`
              : isUnder
              ? `⚠ Remaining: ${difference} Marks Needed`
              : `✕ Exceeded by ${Math.abs(difference)} Marks`}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label className="input-label">Rubric Title</label>
        <input
          type="text"
          className="input-field"
          value={rubricTitle}
          onChange={(e) => setRubricTitle(e.target.value)}
          placeholder="e.g. Process Scheduling Evaluation Rubric"
        />
      </div>

      {/* Criteria List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {criteria.map((crit, index) => (
          <div
            key={crit.id}
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 40px', gap: '1rem', alignItems: 'start' }}>
              <div>
                <label className="input-label">Criterion #{index + 1} Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={crit.name}
                  onChange={(e) => handleUpdateCriterion(crit.id, 'name', e.target.value)}
                  placeholder="e.g. Conceptual Accuracy"
                  style={{ marginBottom: '0.75rem' }}
                />

                <label className="input-label">Scoring Guidelines & Evidence Expectation</label>
                <textarea
                  className="textarea-field"
                  rows="2"
                  value={crit.description}
                  onChange={(e) => handleUpdateCriterion(crit.id, 'description', e.target.value)}
                  placeholder="Explain what textual evidence warrants full vs partial credit..."
                />
              </div>

              <div>
                <label className="input-label">Max Marks</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  max={questionMaxMarks}
                  className="input-field"
                  value={crit.max_marks}
                  onChange={(e) => handleUpdateCriterion(crit.id, 'max_marks', e.target.value)}
                  style={{ textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>

              <div style={{ paddingTop: '1.75rem' }}>
                <button
                  type="button"
                  onClick={() => handleRemoveCriterion(crit.id)}
                  disabled={criteria.length <= 1}
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 0.75rem', color: '#f87171' }}
                  title="Remove criterion"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
        <button type="button" onClick={handleAddCriterion} className="btn btn-secondary">
          + Add Criterion
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isMatch}
            className="btn btn-primary"
          >
            Save Rubric ({currentTotalMarks}/{questionMaxMarks} Marks)
          </button>
        </div>
      </div>
    </div>
  );
}

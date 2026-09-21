import React, { useState } from 'react';

export default function AdminSettingsView() {
  const [confidenceThreshold, setConfidenceThreshold] = useState('0.85');
  const [multiPassVariance, setMultiPassVariance] = useState('10');
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [savedMessage, setSavedMessage] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setSavedMessage('Platform configuration parameters updated successfully.');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>⚙️ Platform Global Settings</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Tune institutional AI grading parameters, confidence thresholds, and security policies.
        </p>
      </div>

      {savedMessage && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', color: 'var(--success)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
          ✓ {savedMessage}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              Human Review Confidence Threshold (0.00 - 1.00)
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Evaluations with an overall confidence score below this threshold are automatically flagged for mandatory instructor review.
            </p>
            <input
              type="number"
              step="0.01"
              min="0.50"
              max="0.99"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(e.target.value)}
              className="form-input"
              style={{ maxWidth: '280px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              Multi-Pass Evaluation Consistency Variance Tolerance (%)
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              If scores across 3 passes vary by more than this percentage of max marks, median pass is selected and marked for review.
            </p>
            <input
              type="number"
              min="5"
              max="25"
              value={multiPassVariance}
              onChange={(e) => setMultiPassVariance(e.target.value)}
              className="form-input"
              style={{ maxWidth: '280px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              JWT Session Inactivity Timeout (Minutes)
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Duration of user inactivity before forcing token re-authentication.
            </p>
            <input
              type="number"
              min="15"
              max="240"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="form-input"
              style={{ maxWidth: '280px' }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
              Save System Parameters
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

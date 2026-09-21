import React, { useState } from 'react';

export default function TeacherSettingsView() {
  const [settings, setSettings] = useState({
    fairgrade_auto_flag_threshold: 0.75, // Flag if confidence < 75%
    fairgrade_multi_pass_variance: 15, // Flag if multi-pass score variance > 15%
    auto_publish_remedials: true,
    email_on_appeals: true,
    email_on_new_submissions: false,
    theme: 'Dark Glassmorphic (SkillForge Default)',
    default_submission_late_penalty: 10,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>⚙️</span> Teacher & FairGrade Grading Preferences
        </h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
          Tune AI evaluation sensitivity, confidence thresholds, appeal escalations, and automated Co-Pilot notifications.
        </p>
      </div>

      {saved && (
        <div
          style={{
            padding: '12px 18px',
            marginBottom: '20px',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#6ee7b7',
          }}
        >
          ✓ Grading preferences saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* FairGrade AI Guardrails */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#c7d2fe', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚖️</span> FairGrade Auto-Escalation & Confidence Guardrails
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '4px' }}>
                Confidence Score Flag Threshold
              </label>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                Submissions with AI confidence below this threshold will automatically flag for human teacher review.
              </div>
              <select
                value={settings.fairgrade_auto_flag_threshold}
                onChange={(e) => setSettings({ ...settings, fairgrade_auto_flag_threshold: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc' }}
              >
                <option value={0.7}>70% Confidence (Permissive)</option>
                <option value={0.75}>75% Confidence (Recommended Default)</option>
                <option value={0.8}>80% Confidence (Strict)</option>
                <option value={0.85}>85% Confidence (Very Strict)</option>
              </select>
            </div>

            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '4px' }}>
                Multi-Pass Score Variance Tolerance
              </label>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                Flag answer if blind multi-pass grading cycles diverge by more than this percentage.
              </div>
              <select
                value={settings.fairgrade_multi_pass_variance}
                onChange={(e) => setSettings({ ...settings, fairgrade_multi_pass_variance: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc' }}
              >
                <option value={10}>±10% Maximum Variance (High Consistency)</option>
                <option value={15}>±15% Maximum Variance (Recommended)</option>
                <option value={20}>±20% Maximum Variance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Co-Pilot Automation */}
        <div style={{ borderTop: '1px solid #334155', paddingTop: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#c7d2fe', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🤖</span> Teacher Co-Pilot Automation
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.auto_publish_remedials}
                onChange={(e) => setSettings({ ...settings, auto_publish_remedials: e.target.checked })}
              />
              <span>Auto-suggest remedial resources in Class Feed when &gt;15% students fail a core concept</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.email_on_appeals}
                onChange={(e) => setSettings({ ...settings, email_on_appeals: e.target.checked })}
              />
              <span>Notify faculty immediately when a student files a grade appeal with &gt;10 mark difference</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            width: 'fit-content',
          }}
        >
          💾 Save Preferences
        </button>
      </form>
    </div>
  );
}

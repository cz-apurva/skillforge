import React from 'react';

export default function StatusIndicator({
  status = 'operational', // 'operational' | 'warning' | 'error' | 'evaluating' | 'offline'
  label,
  showDot = true,
  className = '',
  style = {},
}) {
  const statusConfig = {
    operational: {
      color: 'var(--color-success)',
      bg: 'var(--color-success-bg)',
      border: 'var(--color-success-border)',
      text: 'var(--color-success-text)',
      defaultLabel: 'Operational',
    },
    warning: {
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
      border: 'var(--color-warning-border)',
      text: 'var(--color-warning-text)',
      defaultLabel: 'Attention Needed',
    },
    error: {
      color: 'var(--color-danger)',
      bg: 'var(--color-danger-bg)',
      border: 'var(--color-danger-border)',
      text: 'var(--color-danger-text)',
      defaultLabel: 'Offline / Error',
    },
    evaluating: {
      color: 'var(--color-info)',
      bg: 'var(--color-info-bg)',
      border: 'var(--color-info-border)',
      text: 'var(--color-info-text)',
      defaultLabel: 'Evaluating',
    },
    offline: {
      color: 'var(--color-text-muted)',
      bg: 'var(--color-bg-surface-elevated)',
      border: 'var(--color-border)',
      text: 'var(--color-text-muted)',
      defaultLabel: 'Inactive',
    },
  };

  const current = statusConfig[status] || statusConfig.operational;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.2rem 0.6rem',
        borderRadius: 'var(--radius-full)',
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        color: current.text,
        fontSize: '0.75rem',
        fontWeight: 600,
        ...style,
      }}
    >
      {showDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: current.color,
            boxShadow: `0 0 6px ${current.color}`,
          }}
        />
      )}
      <span>{label || current.defaultLabel}</span>
    </span>
  );
}

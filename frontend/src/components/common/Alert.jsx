import React from 'react';
import { InfoIcon, CheckIcon, AlertTriangleIcon } from './Icons';

export default function Alert({
  children,
  title,
  variant = 'info', // 'info' | 'success' | 'warning' | 'danger'
  onClose,
  icon,
  style = {},
  className = '',
}) {
  const variantStyles = {
    info: {
      bg: 'var(--color-info-bg)',
      border: 'var(--color-info-border)',
      color: 'var(--color-info-text)',
      defaultIcon: <InfoIcon size={18} color="var(--color-info-text)" />,
    },
    success: {
      bg: 'var(--color-success-bg)',
      border: 'var(--color-success-border)',
      color: 'var(--color-success-text)',
      defaultIcon: <CheckIcon size={18} color="var(--color-success-text)" />,
    },
    warning: {
      bg: 'var(--color-warning-bg)',
      border: 'var(--color-warning-border)',
      color: 'var(--color-warning-text)',
      defaultIcon: <AlertTriangleIcon size={18} color="var(--color-warning-text)" />,
    },
    danger: {
      bg: 'var(--color-danger-bg)',
      border: 'var(--color-danger-border)',
      color: 'var(--color-danger-text)',
      defaultIcon: <AlertTriangleIcon size={18} color="var(--color-danger-text)" />,
    },
  };

  const current = variantStyles[variant] || variantStyles.info;

  return (
    <div
      className={`animate-fade-in ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        borderRadius: 'var(--radius-md)',
        color: current.color,
        fontSize: '0.85rem',
        lineHeight: 1.45,
        ...style,
      }}
    >
      <span style={{ display: 'flex', flexShrink: 0, marginTop: '2px' }}>
        {icon || current.defaultIcon}
      </span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: '0.2rem', color: current.color }}>{title}</div>}
        <div style={{ color: 'var(--color-text-primary)' }}>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'currentColor',
            opacity: 0.7,
            cursor: 'pointer',
            padding: '0 0.25rem',
            fontSize: '1rem',
            lineHeight: 1,
          }}
          title="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

import React from 'react';
import Card from './Card';

export default function Metric({
  title,
  value,
  subtitle,
  icon,
  change,
  changeType = 'neutral', // 'positive' | 'negative' | 'neutral'
  variant = 'default',
  className = '',
  style = {},
  onClick,
}) {
  const changeColors = {
    positive: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
    negative: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
    neutral: { bg: 'var(--color-bg-surface-elevated)', text: 'var(--color-text-muted)' },
  };

  const currentChange = changeColors[changeType] || changeColors.neutral;

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        {icon && (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-primary-light)',
              color: '#a5b4fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-primary-border)',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {value}
        </span>
        {change && (
          <span
            style={{
              fontSize: '0.725rem',
              fontWeight: 600,
              padding: '0.1rem 0.4rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: currentChange.bg,
              color: currentChange.text,
            }}
          >
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {subtitle}
        </span>
      )}
    </Card>
  );
}

import React from 'react';

export default function Progress({
  value = 0,
  max = 100,
  label,
  showValue = false,
  variant = 'primary', // 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size = 'md', // 'sm' | 'md' | 'lg'
  style = {},
  className = '',
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const heightMap = {
    sm: '4px',
    md: '8px',
    lg: '12px',
  };

  const colorMap = {
    primary: 'var(--color-primary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    info: 'var(--color-info)',
  };

  return (
    <div className={className} style={{ width: '100%', ...style }}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.75rem' }}>
          {label && <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>}
          {showValue && <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{percentage}%</span>}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: heightMap[size],
          backgroundColor: 'var(--color-bg-app)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: colorMap[variant] || colorMap.primary,
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.4s ease-out',
          }}
        />
      </div>
    </div>
  );
}

import React from 'react';

export default function LoadingSkeleton({
  type = 'text', // 'text' | 'card' | 'table' | 'circle'
  rows = 3,
  height,
  width = '100%',
  style = {},
  className = '',
}) {
  if (type === 'circle') {
    const size = height || '40px';
    return (
      <div
        className={`skeleton-pulse ${className}`}
        style={{ width: size, height: size, borderRadius: '50%', ...style }}
      />
    );
  }

  if (type === 'card') {
    return (
      <div
        className={`card-surface ${className}`}
        style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', ...style }}
      >
        <div className="skeleton-pulse" style={{ width: '40%', height: '18px' }} />
        <div className="skeleton-pulse" style={{ width: '80%', height: '14px' }} />
        <div className="skeleton-pulse" style={{ width: '60%', height: '14px' }} />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`card-surface ${className}`} style={{ padding: '1rem', ...style }}>
        <div className="skeleton-pulse" style={{ width: '100%', height: '36px', marginBottom: '0.75rem' }} />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{ width: '100%', height: '28px', marginBottom: '0.5rem', opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
    );
  }

  // Default text lines
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width, ...style }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton-pulse"
          style={{
            width: i === rows - 1 && rows > 1 ? '70%' : '100%',
            height: height || '14px',
          }}
        />
      ))}
    </div>
  );
}

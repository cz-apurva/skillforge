import React from 'react';

export default function Badge({
  children,
  variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'
  size = 'md', // 'sm' | 'md'
  dot = false,
  className = '',
  style = {},
  ...rest
}) {
  const sizeStyles = {
    sm: { fontSize: '0.675rem', padding: '0.15rem 0.45rem' },
    md: { fontSize: '0.75rem', padding: '0.2rem 0.55rem' },
  };

  const badgeClass = variant === 'default' ? 'badge-secondary' : `badge-${variant}`;

  return (
    <span
      className={`badge ${badgeClass} ${className}`}
      style={{
        ...sizeStyles[size],
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
          }}
        />
      )}
      {children}
    </span>
  );
}

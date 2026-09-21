import React from 'react';

export default function Input({
  label,
  error,
  helperText,
  prefixIcon,
  suffixIcon,
  className = '',
  style = {},
  wrapperStyle = {},
  id,
  type = 'text',
  ...rest
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ width: '100%', marginBottom: '1rem', ...wrapperStyle }}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefixIcon && (
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            {prefixIcon}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          className={`input-field ${className}`}
          style={{
            paddingLeft: prefixIcon ? '2.35rem' : '0.85rem',
            paddingRight: suffixIcon ? '2.35rem' : '0.85rem',
            borderColor: error ? 'var(--color-danger)' : undefined,
            ...style,
          }}
          {...rest}
        />
        {suffixIcon && (
          <span
            style={{
              position: 'absolute',
              right: '0.75rem',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {suffixIcon}
          </span>
        )}
      </div>
      {error && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-danger-text)', marginTop: '0.3rem', margin: '0.3rem 0 0 0' }}>
          {error}
        </p>
      )}
      {!error && helperText && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem', margin: '0.3rem 0 0 0' }}>
          {helperText}
        </p>
      )}
    </div>
  );
}

import React from 'react';

export default function Select({
  label,
  error,
  options = [], // [{ value, label, disabled }]
  children,
  className = '',
  style = {},
  wrapperStyle = {},
  id,
  ...rest
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ width: '100%', marginBottom: '1rem', ...wrapperStyle }}>
      {label && (
        <label htmlFor={selectId} className="input-label">
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          id={selectId}
          className={`select-field ${className}`}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            paddingRight: '2rem',
            borderColor: error ? 'var(--color-danger)' : undefined,
            cursor: 'pointer',
            ...style,
          }}
          {...rest}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled} style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <span
          style={{
            position: 'absolute',
            right: '0.85rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--color-text-muted)',
            fontSize: '0.75rem',
          }}
        >
          ▼
        </span>
      </div>
      {error && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-danger-text)', marginTop: '0.3rem', margin: '0.3rem 0 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}

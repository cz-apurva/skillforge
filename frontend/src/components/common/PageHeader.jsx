import React from 'react';

export default function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
  breadcrumbs = [], // [{ label, onClick }]
  className = '',
  style = {},
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        marginBottom: '1.75rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--color-border-subtle)',
        ...style,
      }}
    >
      {breadcrumbs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {b.onClick ? (
                <button
                  type="button"
                  onClick={b.onClick}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 'inherit',
                  }}
                >
                  {b.label}
                </button>
              ) : (
                <span style={{ color: i === breadcrumbs.length - 1 ? 'var(--color-text-primary)' : 'inherit' }}>
                  {b.label}
                </span>
              )}
              {i < breadcrumbs.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {icon && (
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-light)',
                color: '#a5b4fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--color-primary-border)',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                {title}
              </h1>
              {badge && <span>{badge}</span>}
            </div>
            {subtitle && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>{actions}</div>}
      </div>
    </div>
  );
}

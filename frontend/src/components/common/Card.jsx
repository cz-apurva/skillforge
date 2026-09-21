import React from 'react';

export default function Card({
  children,
  className = '',
  style = {},
  hoverable = false,
  padding = '1.25rem',
  onClick,
  ...rest
}) {
  return (
    <div
      onClick={onClick}
      className={`card-surface ${hoverable ? 'card-surface-hover' : ''} ${className}`}
      style={{
        padding,
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  style = {},
  className = '',
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--color-border-subtle)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
        <div>
          {title && <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{title}</h3>}
          {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0 0' }}>{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{ ...style }}>
      {children}
    </div>
  );
}

export function CardFooter({ children, style = {}, className = '' }) {
  return (
    <div
      className={className}
      style={{
        marginTop: '1rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--color-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

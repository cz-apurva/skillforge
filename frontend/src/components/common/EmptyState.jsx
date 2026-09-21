import React from 'react';
import { EmptyDataIllustration } from './illustrations';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items to display right now.',
  action,
  icon,
  illustration,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`card-surface animate-fade-in ${className}`}
      style={{
        padding: '3rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <div style={{ marginBottom: '1.25rem' }}>
        {illustration ? illustration : icon ? icon : <EmptyDataIllustration size={140} />}
      </div>
      <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
        {title}
      </h4>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '400px', lineHeight: 1.5, marginBottom: action ? '1.25rem' : 0 }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}

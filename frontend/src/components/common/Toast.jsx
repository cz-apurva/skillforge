import React from 'react';
import Alert from './Alert';

export default function Toast({
  message,
  title,
  variant = 'info',
  onClose,
  position = 'bottom-right', // 'bottom-right' | 'top-right' | 'top-center'
}) {
  const positionStyles = {
    'bottom-right': { bottom: '1.5rem', right: '1.5rem' },
    'top-right': { top: '1.5rem', right: '1.5rem' },
    'top-center': { top: '1.5rem', left: '50%', transform: 'translateX(-50%)' },
  };

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 1100,
        maxWidth: '380px',
        width: 'calc(100% - 3rem)',
        boxShadow: 'var(--shadow-lg)',
        ...positionStyles[position],
      }}
    >
      <Alert title={title} variant={variant} onClose={onClose}>
        {message}
      </Alert>
    </div>
  );
}

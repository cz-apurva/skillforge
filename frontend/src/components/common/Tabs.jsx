import React from 'react';

export default function Tabs({
  tabs = [], // [{ id, label, icon, badge }]
  activeTab,
  onChange,
  variant = 'pills', // 'pills' | 'underline'
  className = '',
  style = {},
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: variant === 'pills' ? '0.35rem' : '1.5rem',
        borderBottom: variant === 'underline' ? '1px solid var(--color-border)' : 'none',
        background: variant === 'pills' ? 'var(--color-bg-app)' : 'transparent',
        padding: variant === 'pills' ? '0.3rem' : '0 0.5rem',
        borderRadius: variant === 'pills' ? 'var(--radius-md)' : 0,
        border: variant === 'pills' ? '1px solid var(--color-border-subtle)' : 'none',
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange && onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: variant === 'pills' ? '0.4rem 0.85rem' : '0.75rem 0.25rem',
              borderRadius: variant === 'pills' ? 'var(--radius-sm)' : 0,
              border: 'none',
              borderBottom: variant === 'underline' ? (isActive ? '2px solid var(--color-primary)' : '2px solid transparent') : 'none',
              background: variant === 'pills' ? (isActive ? 'var(--color-primary)' : 'transparent') : 'transparent',
              color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-surface-elevated)',
                  color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                  fontWeight: 600,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

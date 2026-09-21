import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import Card from '../common/Card';

export default function ForgotPassword({ onNavigateToLogin, onNavigateToReset }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [generatedToken, setGeneratedToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setResultMessage(null);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setResultMessage(data.message || 'Password reset link sent to your registered email.');
      if (data.reset_token) {
        setGeneratedToken(data.reset_token);
      }
    } catch {
      setResultMessage('Unable to process password reset request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 120px)',
        padding: '2rem 1.5rem',
      }}
    >
      <Card className="animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
            Reset Password
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Enter your account email to receive a secure password reset link.
          </p>
        </div>

        {resultMessage && (
          <Alert variant="info" style={{ marginBottom: '1.25rem' }}>
            {resultMessage}
          </Alert>
        )}

        {generatedToken && (
          <div
            style={{
              background: 'var(--color-bg-app)',
              border: '1px solid var(--color-primary-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.8rem' }}>
              Simulation: Reset Token Generated
            </div>
            <code style={{ color: '#a5b4fc', wordBreak: 'break-all', display: 'block', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              {generatedToken}
            </code>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateToReset && onNavigateToReset(generatedToken)}
              style={{ width: '100%' }}
            >
              Continue to Set New Password →
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. student@skillforge.ai"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            id="forgot-email"
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            style={{ width: '100%', marginTop: '0.5rem', fontWeight: 600 }}
          >
            Send Reset Link
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={onNavigateToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '0.825rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            ← Back to Sign In
          </button>
        </div>
      </Card>
    </div>
  );
}


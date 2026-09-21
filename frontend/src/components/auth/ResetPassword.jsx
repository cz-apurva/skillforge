import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import Card from '../common/Card';

export default function ResetPassword({ initialToken = '', onNavigateToLogin }) {
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !newPassword) return;

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error?.message || 'Failed to reset password');
      }

      setSuccessMessage('Password has been successfully reset! You can now sign in with your new password.');
    } catch (err) {
      setErrorMessage(err.message || 'Password reset failed. Token may be invalid or expired.');
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
            Create New Password
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Set a new secure password for your SkillForge account.
          </p>
        </div>

        {errorMessage && (
          <Alert variant="danger" style={{ marginBottom: '1.25rem' }}>
            {errorMessage}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" style={{ marginBottom: '1.25rem' }}>
            <div>{successMessage}</div>
            <Button
              variant="primary"
              size="sm"
              onClick={onNavigateToLogin}
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              Sign In Now →
            </Button>
          </Alert>
        )}

        {!successMessage && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Input
              label="Reset Token"
              type="text"
              placeholder="Paste token from reset email..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              id="reset-token"
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Min 6 characters..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              id="reset-new-password"
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Confirm password..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              id="reset-confirm-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              style={{ width: '100%', marginTop: '0.5rem', fontWeight: 600 }}
            >
              Save New Password
            </Button>
          </form>
        )}

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


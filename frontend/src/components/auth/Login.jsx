import React, { useState } from 'react';
import { AcademicHeroIllustration } from '../common/illustrations';
import { ShieldIcon, UserIcon, AcademicCapIcon, CheckIcon } from '../common/Icons';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import Badge from '../common/Badge';

export default function Login({ onLoginSuccess, onNavigateToForgot }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error?.message || 'Invalid credentials');
      }

      // Store JWT token and user info
      localStorage.setItem('skillforge_token', data.token);
      localStorage.setItem('skillforge_user', JSON.stringify(data.data));

      if (onLoginSuccess) {
        onLoginSuccess(data.data, data.token);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Password123!');
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
      <div
        className="card-surface animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '960px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          background: 'var(--color-bg-surface)',
        }}
      >
        {/* Left Column: Academic Branding & Editorial Illustration */}
        <div
          style={{
            padding: '2.5rem 2rem',
            background: 'linear-gradient(180deg, var(--color-bg-subtle) 0%, var(--color-bg-surface) 100%)',
            borderRight: '1px solid var(--color-border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #0284c7 100%)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                SF
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                  SkillForge AI
                </h1>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Adaptive Learning & Evaluation
                </p>
              </div>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3, marginBottom: '0.5rem' }}>
              Next-generation institutional learning intelligence
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              AI-assisted multi-pass FairGrade evaluation, teacher co-pilot analytics, and adaptive student mastery tracking.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
              <Badge variant="primary" size="sm">Multi-Pass Evaluation</Badge>
              <Badge variant="info" size="sm">Judge0 Code Sandbox</Badge>
              <Badge variant="success" size="sm">Audited RBAC</Badge>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <AcademicHeroIllustration width="100%" height="auto" />
          </div>
        </div>

        {/* Right Column: Clean Login Form */}
        <div style={{ padding: '2.5rem 2.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
              Sign In to Your Account
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.825rem' }}>
              Enter your institutional credentials to access your portal
            </p>
          </div>

          {errorMessage && (
            <Alert variant="danger" style={{ marginBottom: '1.25rem' }}>
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. teacher@skillforge.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="login-email"
            />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label htmlFor="login-password" className="input-label" style={{ marginBottom: 0 }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={onNavigateToForgot}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '0.785rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    padding: 0,
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                id="login-password"
                wrapperStyle={{ marginBottom: '1rem' }}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              style={{ width: '100%', marginTop: '0.5rem', fontWeight: 600 }}
            >
              Sign In to Portal
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem', textAlign: 'center', fontWeight: 600 }}>
              Quick Demo Logins (Default: Password123!)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleQuickLogin('admin@skillforge.ai')}
                icon={<ShieldIcon size={13} />}
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.3rem' }}
              >
                Admin
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleQuickLogin('teacher@skillforge.ai')}
                icon={<UserIcon size={13} />}
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.3rem' }}
              >
                Faculty
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleQuickLogin('student@skillforge.ai')}
                icon={<AcademicCapIcon size={13} />}
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.3rem' }}
              >
                Student
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


import React from 'react';
import Unauthorized from './Unauthorized';
import Login from './Login';

export default function ProtectedRoute({
  user,
  allowedRoles = [],
  children,
  onNavigate,
  onLoginSuccess,
}) {
  // If not logged in, redirect to Login
  if (!user) {
    return (
      <Login
        onLoginSuccess={onLoginSuccess}
        onNavigateToForgot={() => onNavigate && onNavigate('forgot-password')}
      />
    );
  }

  // Normalize allowed roles to uppercase
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
  const userRole = (user.role || '').toUpperCase();

  // If role is not authorized, render genuine Unauthorized route guard page
  if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(userRole)) {
    return <Unauthorized user={user} onNavigate={onNavigate} />;
  }

  return children;
}

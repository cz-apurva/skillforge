const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

/**
 * Middleware to authenticate user via JWT Bearer token.
 * Populates req.user with decoded payload: { id, email, name, role }.
 * Strict production mode: Rejects any request missing or with invalid Bearer token.
 */
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        ...decoded,
        role: decoded.role ? decoded.role.toUpperCase() : 'STUDENT',
      };
      return next();
    } catch (err) {
      const error = new Error('Invalid or expired authentication token');
      error.statusCode = 401;
      return next(error);
    }
  }

  const error = new Error('Authentication required: Bearer token missing');
  error.statusCode = 401;
  return next(error);
}

// Alias verifyAuth to authenticateUser for backward compatibility
const verifyAuth = authenticateUser;

/**
 * Middleware to enforce Role-Based Access Control (RBAC).
 * Supports both rest parameters authorizeRole('ADMIN', 'TEACHER')
 * and array authorizeRole(['ADMIN', 'TEACHER']).
 */
function authorizeRole(...roles) {
  const flattened = roles.flat().map((r) => r.toUpperCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      const error = new Error('Authentication required before role verification');
      error.statusCode = 401;
      return next(error);
    }

    const userRole = req.user.role.toUpperCase();
    if (!flattened.includes(userRole)) {
      try {
        const NotificationService = require('../services/notificationService');
        NotificationService.notifyAdminOnSecurityEvent({
          action: 'RBAC_ACCESS_DENIED',
          actor: req.user.email || req.user.id || 'Unknown',
          role: userRole,
          target: req.originalUrl || req.url || 'Protected Endpoint',
          reason: `User with role '${userRole}' attempted unauthorized access to endpoint requiring [${flattened.join(', ')}]`,
        }).catch(() => {});
      } catch {}

      const error = new Error(`Access denied: Insufficient permissions for role '${userRole}'. Requires [${flattened.join(', ')}]`);
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
}

// Alias requireRole to authorizeRole
const requireRole = authorizeRole;

module.exports = {
  authenticateUser,
  authorizeRole,
  verifyAuth,
  requireRole,
};

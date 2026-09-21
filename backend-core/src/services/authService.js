const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthService {
  /**
   * Authenticates user with email and password.
   * Returns signed JWT token and user profile including role.
   */
  static async login({ email, password }) {
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.toUpperCase(),
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.toUpperCase(),
        status: user.status || 'ACTIVE',
        created_at: user.created_at,
      },
    };
  }

  /**
   * Fetches profile of the currently authenticated user.
   */
  static async getAuthenticatedUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toUpperCase(),
      status: user.status || 'ACTIVE',
      created_at: user.created_at,
    };
  }

  /**
   * Generates a secure reset token and stores it on user with 1-hour expiration.
   */
  static async forgotPassword({ email }) {
    if (!email) {
      const error = new Error('Email is required');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't leak email existence, return generic success
      return {
        message: 'If an account exists with this email, a password reset link has been dispatched.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await User.updateResetToken(user.id, resetToken, expiresAt);

    return {
      message: 'If an account exists with this email, a password reset link has been dispatched.',
      reset_token: resetToken, // Exposed for testing & simulated email delivery
    };
  }

  /**
   * Validates reset token and sets new hashed password.
   */
  static async resetPassword({ token, newPassword }) {
    if (!token || !newPassword) {
      const error = new Error('Token and new password are required');
      error.statusCode = 400;
      throw error;
    }

    if (newPassword.length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findByResetToken(token);
    if (!user) {
      const error = new Error('Invalid or expired password reset token');
      error.statusCode = 400;
      throw error;
    }

    if (user.reset_token_expires_at && new Date(user.reset_token_expires_at) < new Date()) {
      const error = new Error('Password reset token has expired. Please request a new one.');
      error.statusCode = 400;
      throw error;
    }

    await User.updatePassword(user.id, newPassword);

    return {
      message: 'Password has been successfully reset. You may now login with your new credentials.',
    };
  }
}

module.exports = AuthService;

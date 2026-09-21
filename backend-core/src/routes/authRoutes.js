const express = require('express');
const AuthService = require('../services/authService');
const User = require('../models/User');
const { verifyAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @route   POST /login
 * @desc    Authenticate user and return JWT + user profile with role
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login({ email, password });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: result.token,
      data: result.user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /forgot-password
 * @desc    Request password reset link and token
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await AuthService.forgotPassword({ email });
    return res.status(200).json({
      success: true,
      message: result.message,
      reset_token: result.reset_token, // Provided for automated testing / local simulation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /reset-password
 * @desc    Reset password using valid reset token
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword, password } = req.body;
    const result = await AuthService.resetPassword({
      token,
      newPassword: newPassword || password,
    });
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /me
 * @desc    Get currently authenticated user's profile and role
 */
router.get('/me', verifyAuth, async (req, res, next) => {
  try {
    const user = await AuthService.getAuthenticatedUser(req.user.id);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /register
 * @desc    Create new user (STUDENT / TEACHER / ADMIN)
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findByEmail(email);
    if (existing) {
      const error = new Error('User with this email already exists');
      error.statusCode = 400;
      throw error;
    }

    const created = await User.create({ name, email, password, role: role || 'STUDENT' });
    const authResult = await AuthService.login({ email, password });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: authResult.token,
      data: authResult.user,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

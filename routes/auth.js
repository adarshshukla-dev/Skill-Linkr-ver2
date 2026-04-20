// routes/auth.js — Register & Login

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Helper: generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ─────────────────────────────────────────────
//  POST /api/auth/register/student
//  Register a new student
// ─────────────────────────────────────────────
router.post('/register/student', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('college').notEmpty().withMessage('College name is required'),
  body('degree').notEmpty().withMessage('Degree is required'),
  body('year').notEmpty().withMessage('Year is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { firstName, lastName, email, password, phone, city,
            college, degree, year, branch, gradYear, enrollNo,
            skills, bio, portfolioUrl } = req.body;

    // Check if email exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please log in.' });
    }

    const user = await User.create({
      firstName, lastName, email, password, phone, city,
      college, degree, year, branch, gradYear, enrollNo,
      skills: skills || [],
      bio, portfolioUrl,
      role: 'student',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Student account created successfully!',
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  POST /api/auth/register/client
//  Register a new client
// ─────────────────────────────────────────────
router.post('/register/client', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('company').notEmpty().withMessage('Company name is required'),
  body('industry').notEmpty().withMessage('Industry is required'),
  body('designation').notEmpty().withMessage('Designation is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { firstName, lastName, email, password, phone,
            company, designation, industry, companySize,
            city, website, projectTypes, typicalBudget } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please log in.' });
    }

    const user = await User.create({
      firstName, lastName, email, password, phone,
      company, designation, industry, companySize,
      city, website,
      projectTypes: projectTypes || [],
      typicalBudget,
      role: 'client',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Client account created successfully!',
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  POST /api/auth/login
//  Login student or client
// ─────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Role check
    if (role && user.role !== role) {
      return res.status(401).json({ success: false, message: `No ${role} account found with this email.` });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/auth/me
//  Get currently logged-in user
// ─────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ─────────────────────────────────────────────
//  PUT /api/auth/update-password
//  Change password
// ─────────────────────────────────────────────
router.put('/update-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    user.password = req.body.newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

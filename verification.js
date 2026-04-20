// routes/verification.js — College Verification System (NEW FEATURE)

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, studentOnly } = require('../middleware/auth');

// Simple admin check middleware
const adminOnly = (req, res, next) => {
  // In production: store admin emails in DB or env
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@skilllinkr.in').split(',');
  if (!ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ success: false, message: 'Admin access only.' });
  }
  next();
};

// ─────────────────────────────────────────────
//  POST /api/verification/submit
//  Student submits college ID for verification
// ─────────────────────────────────────────────
router.post('/submit', protect, studentOnly, async (req, res) => {
  try {
    const { collegeIdImageUrl, collegeEmail, enrollNo } = req.body;

    if (!collegeIdImageUrl && !collegeEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide college ID image URL or college email for verification.',
      });
    }

    const user = await User.findById(req.user._id);

    if (user.verificationStatus === 'verified') {
      return res.status(400).json({ success: false, message: 'Your account is already verified!' });
    }

    user.collegeIdImage     = collegeIdImageUrl || user.collegeIdImage;
    user.collegeEmail       = collegeEmail || user.collegeEmail;
    user.enrollNo           = enrollNo || user.enrollNo;
    user.verificationStatus = 'pending';

    await user.save();

    res.json({
      success: true,
      message: 'Verification request submitted! Our team will review within 24 hours.',
      status: 'pending',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/verification/status
//  Student checks their verification status
// ─────────────────────────────────────────────
router.get('/status', protect, studentOnly, async (req, res) => {
  const user = await User.findById(req.user._id).select('verificationStatus isVerified verificationNote verifiedAt college enrollNo');
  res.json({
    success: true,
    verificationStatus: user.verificationStatus,
    isVerified: user.isVerified,
    verifiedAt: user.verifiedAt,
    note: user.verificationNote || null,
  });
});

// ─────────────────────────────────────────────
//  GET /api/verification/pending  (ADMIN)
//  Get all students awaiting verification
// ─────────────────────────────────────────────
router.get('/pending', protect, adminOnly, async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      verificationStatus: 'pending',
    }).select('firstName lastName email college enrollNo collegeIdImage collegeEmail createdAt');

    res.json({ success: true, count: students.length, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  PUT /api/verification/approve/:userId  (ADMIN)
//  Admin approves a student's verification
// ─────────────────────────────────────────────
router.put('/approve/:userId', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        isVerified: true,
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        verificationNote: '',
      },
      { new: true }
    ).select('firstName lastName email college verificationStatus');

    if (!user) return res.status(404).json({ success: false, message: 'Student not found.' });

    res.json({
      success: true,
      message: `${user.firstName} ${user.lastName} verified successfully! ✅`,
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  PUT /api/verification/reject/:userId  (ADMIN)
//  Admin rejects — with a note explaining why
// ─────────────────────────────────────────────
router.put('/reject/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { note } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        isVerified: false,
        verificationStatus: 'rejected',
        verificationNote: note || 'Documents unclear. Please resubmit.',
      },
      { new: true }
    ).select('firstName lastName email verificationStatus verificationNote');

    if (!user) return res.status(404).json({ success: false, message: 'Student not found.' });

    res.json({
      success: true,
      message: `Verification rejected for ${user.firstName}.`,
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

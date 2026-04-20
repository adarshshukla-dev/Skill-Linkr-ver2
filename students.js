// routes/students.js — Student profile routes

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, studentOnly } = require('../middleware/auth');

// GET /api/students — browse all students (public)
router.get('/', async (req, res) => {
  try {
    const { skill, page = 1, limit = 12 } = req.query;
    const query = { role: 'student' };
    if (skill) query.skills = { $in: [skill] };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [students, total] = await Promise.all([
      User.find(query).select('-password').sort({ avgRating: -1, completedProjects: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(query),
    ]);
    res.json({ success: true, total, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/students/:id — single student profile
router.get('/:id', async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' }).select('-password');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/students/profile — update own profile
router.put('/profile', protect, studentOnly, async (req, res) => {
  try {
    const allowed = ['firstName','lastName','phone','city','college','degree','year','branch','gradYear','skills','bio','portfolioUrl'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, message: 'Profile updated!', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

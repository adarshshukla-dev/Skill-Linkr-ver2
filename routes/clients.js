// routes/clients.js — Client profile routes

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, clientOnly } = require('../middleware/auth');

// GET /api/clients/:id — public client profile
router.get('/:id', async (req, res) => {
  try {
    const client = await User.findOne({ _id: req.params.id, role: 'client' }).select('-password');
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });
    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/clients/profile — update own company profile
router.put('/profile', protect, clientOnly, async (req, res) => {
  try {
    const allowed = ['firstName','lastName','phone','city','company','designation','industry','companySize','website','projectTypes','typicalBudget'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, message: 'Company profile updated!', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

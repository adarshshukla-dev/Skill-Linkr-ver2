// routes/applications.js — Apply to projects, manage applications

const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Project = require('../models/Project');
const { protect, studentOnly, clientOnly } = require('../middleware/auth');

// ─────────────────────────────────────────────
//  POST /api/applications/:projectId
//  Student applies to a project
// ─────────────────────────────────────────────
router.post('/:projectId', protect, studentOnly, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (project.status !== 'open') return res.status(400).json({ success: false, message: 'This project is no longer accepting applications.' });

    // Check already applied
    const existing = await Application.findOne({ project: req.params.projectId, student: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: 'You have already applied to this project.' });

    const application = await Application.create({
      project: req.params.projectId,
      student: req.user._id,
      coverLetter: req.body.coverLetter,
      bidAmount:   req.body.bidAmount,
      timeline:    req.body.timeline,
    });

    // Increment applicant count
    await Project.findByIdAndUpdate(req.params.projectId, { $inc: { applicantCount: 1 } });

    await application.populate('student', 'firstName lastName college skills bio avgRating');

    res.status(201).json({ success: true, message: 'Application submitted successfully!', application });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Already applied to this project.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/applications/my
//  Student: get all my applications
// ─────────────────────────────────────────────
router.get('/my', protect, studentOnly, async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user._id })
      .populate('project', 'title category budget status company deadline client')
      .populate({ path: 'project', populate: { path: 'client', select: 'company firstName lastName city' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/applications/project/:projectId
//  Client: get all applicants for a project
// ─────────────────────────────────────────────
router.get('/project/:projectId', protect, clientOnly, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const applications = await Application.find({ project: req.params.projectId })
      .populate('student', 'firstName lastName college degree year skills bio avgRating completedProjects portfolioUrl profilePhoto')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: applications.length, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  PUT /api/applications/:id/status
//  Client: update application status (shortlist, reject)
// ─────────────────────────────────────────────
router.put('/:id/status', protect, clientOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['under_review', 'shortlisted', 'rejected'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('student', 'firstName lastName');

    res.json({ success: true, message: `Application marked as ${status}.`, application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  POST /api/applications/:id/review
//  Submit review after project completion
// ─────────────────────────────────────────────
router.post('/:id/review', protect, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const application = await Application.findById(req.params.id).populate('project');

    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    const User = require('../models/User');

    if (req.user.role === 'client') {
      application.clientRating = rating;
      application.clientReview = review;
      // Update student average rating
      const student = await User.findById(application.student);
      const newCount = student.ratingCount + 1;
      const newAvg = ((student.avgRating * student.ratingCount) + rating) / newCount;
      await User.findByIdAndUpdate(application.student, { avgRating: parseFloat(newAvg.toFixed(1)), ratingCount: newCount });
    } else {
      application.studentRating = rating;
      application.studentReview = review;
    }

    await application.save();
    res.json({ success: true, message: 'Review submitted. Thank you!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

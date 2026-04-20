// routes/projects.js — Project CRUD

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Application = require('../models/Application');
const { protect, clientOnly, studentOnly } = require('../middleware/auth');

// ─────────────────────────────────────────────
//  GET /api/projects
//  Browse all open projects (public)
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, category, budget, sort, page = 1, limit = 8 } = req.query;
    const query = { status: 'open' };

    // Search
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category) query.category = category;

    // Budget filter
    if (budget === 'low')     { query.budget = { $lt: 2000 }; }
    if (budget === 'mid')     { query.budget = { $gte: 2000, $lte: 8000 }; }
    if (budget === 'high')    { query.budget = { $gt: 8000, $lte: 20000 }; }
    if (budget === 'premium') { query.budget = { $gt: 20000 }; }

    // Sort
    let sortObj = { createdAt: -1 };
    if (sort === 'budget-high') sortObj = { budget: -1 };
    if (sort === 'budget-low')  sortObj = { budget: 1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('client', 'firstName lastName company city')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit)),
      Project.countDocuments(query),
    ]);

    res.json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      projects,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/projects/:id
//  Get single project details
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'firstName lastName company city website industry');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Increment views
    project.views += 1;
    await project.save();

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  POST /api/projects
//  Create a new project (client only)
// ─────────────────────────────────────────────
router.post('/', protect, clientOnly, [
  body('title').notEmpty().withMessage('Project title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('budget').isNumeric().withMessage('Budget must be a number'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { title, description, category, skills, budget, deadline, workMode } = req.body;

    const project = await Project.create({
      client: req.user._id,
      title, description, category,
      skills: skills || [],
      budget, deadline, workMode,
    });

    await project.populate('client', 'firstName lastName company city');

    res.status(201).json({
      success: true,
      message: 'Project posted successfully!',
      project,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  PUT /api/projects/:id
//  Update project (client only, own project)
// ─────────────────────────────────────────────
router.put('/:id', protect, clientOnly, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this project.' });
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, project: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  DELETE /api/projects/:id
//  Delete project (client only)
// ─────────────────────────────────────────────
router.delete('/:id', protect, clientOnly, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    await Project.findByIdAndDelete(req.params.id);
    await Application.deleteMany({ project: req.params.id });

    res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/projects/client/my-projects
//  Get all projects by logged-in client
// ─────────────────────────────────────────────
router.get('/client/my-projects', protect, clientOnly, async (req, res) => {
  try {
    const projects = await Project.find({ client: req.user._id })
      .populate('hiredStudent', 'firstName lastName college')
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  PUT /api/projects/:id/hire/:studentId
//  Hire a student for the project
// ─────────────────────────────────────────────
router.put('/:id/hire/:studentId', protect, clientOnly, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Update project
    project.hiredStudent = req.params.studentId;
    project.status = 'in_progress';
    project.escrowHeld = true;
    await project.save();

    // Update application status
    await Application.findOneAndUpdate(
      { project: req.params.id, student: req.params.studentId },
      { status: 'accepted' }
    );

    // Reject all other applications
    await Application.updateMany(
      { project: req.params.id, student: { $ne: req.params.studentId } },
      { status: 'rejected' }
    );

    res.json({ success: true, message: 'Student hired! Escrow activated.', project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  PUT /api/projects/:id/release-payment
//  Release escrow payment to student
// ─────────────────────────────────────────────
router.put('/:id/release-payment', protect, clientOnly, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    project.status = 'completed';
    project.paymentReleased = true;
    await project.save();

    // Update student earnings
    const User = require('../models/User');
    await User.findByIdAndUpdate(project.hiredStudent, {
      $inc: { totalEarned: project.budget, completedProjects: 1 }
    });

    // Update client spend
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalSpent: project.budget, completedProjects: 1 }
    });

    res.json({ success: true, message: `₹${project.budget} released to student successfully!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

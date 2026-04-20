// routes/collaboration.js — Freelancer helping another freelancer (NEW FEATURE)

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Application = require('../models/Application');
const { protect, studentOnly } = require('../middleware/auth');

// ─────────────────────────────────────────────
//  GET /api/collaboration/find
//  Find students open to collaborate (by skill)
//  "Main React sikhna chahta hoon — kaun help karega?"
// ─────────────────────────────────────────────
router.get('/find', async (req, res) => {
  try {
    const { skill, page = 1, limit = 12 } = req.query;

    const query = {
      role: 'student',
      isVerified: true,
      openToCollaborate: true,
    };

    if (skill) {
      query.$or = [
        { skills: { $in: [skill] } },
        { collaborationSkills: { $in: [skill] } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [students, total] = await Promise.all([
      User.find(query)
        .select('firstName lastName college degree year skills bio avgRating completedProjects collaborationSkills profilePhoto city')
        .sort({ avgRating: -1, completedProjects: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({ success: true, total, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  POST /api/collaboration/invite/:applicationId/:studentId
//  Student invites another student to co-work on their application
//  "Yaar mere saath is project mein kaam kar"
// ─────────────────────────────────────────────
router.post('/invite/:applicationId/:studentId', protect, studentOnly, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Only the applicant can invite
    if (application.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the applicant can invite a collaborator.' });
    }

    // Can't invite yourself
    if (req.params.studentId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot invite yourself.' });
    }

    // Check collaborator exists
    const collaborator = await User.findOne({ _id: req.params.studentId, role: 'student' });
    if (!collaborator) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    application.collaborator = req.params.studentId;
    application.collaboratorStatus = 'pending';
    await application.save();

    res.json({
      success: true,
      message: `Collaboration invite sent to ${collaborator.firstName}!`,
      collaborator: {
        id: collaborator._id,
        name: `${collaborator.firstName} ${collaborator.lastName}`,
        college: collaborator.college,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  PUT /api/collaboration/respond/:applicationId
//  Collaborator accepts or declines the invite
// ─────────────────────────────────────────────
router.put('/respond/:applicationId', protect, studentOnly, async (req, res) => {
  try {
    const { response } = req.body; // 'accepted' or 'declined'
    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ success: false, message: 'Response must be accepted or declined.' });
    }

    const application = await Application.findById(req.params.applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Only the invited collaborator can respond
    if (!application.collaborator || application.collaborator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not the invited collaborator.' });
    }

    application.collaboratorStatus = response;
    await application.save();

    // If accepted — add to both students' collaboratedWith list
    if (response === 'accepted') {
      await User.findByIdAndUpdate(application.student, {
        $addToSet: { collaboratedWith: req.user._id }
      });
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { collaboratedWith: application.student }
      });
    }

    res.json({
      success: true,
      message: response === 'accepted'
        ? 'You accepted the collaboration! Work together and deliver great results 🤝'
        : 'You declined the collaboration invite.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/collaboration/my-invites
//  Get all pending collaboration invites for me
// ─────────────────────────────────────────────
router.get('/my-invites', protect, studentOnly, async (req, res) => {
  try {
    const invites = await Application.find({
      collaborator: req.user._id,
      collaboratorStatus: 'pending',
    })
      .populate('project', 'title category budget deadline')
      .populate('student', 'firstName lastName college skills');

    res.json({ success: true, count: invites.length, invites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  PUT /api/collaboration/toggle
//  Toggle open to collaborate status
// ─────────────────────────────────────────────
router.put('/toggle', protect, studentOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.openToCollaborate = !user.openToCollaborate;
    await user.save();
    res.json({
      success: true,
      message: user.openToCollaborate
        ? 'You are now open to collaboration requests!'
        : 'You are no longer accepting collaboration requests.',
      openToCollaborate: user.openToCollaborate,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

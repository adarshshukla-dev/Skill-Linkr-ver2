// models/Application.js — UPDATED with Bidding fields

const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({

  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // ── BIDDING FIELDS (NEW) ──
  bidAmount:      { type: Number, required: true },   // student ka proposed price
  proposedDays:   { type: Number, required: true },   // kitne din mein karenga
  coverLetter:    { type: String, maxlength: 1500 },  // detailed proposal (long)
  milestones:     [{ title: String, days: Number }],  // optional: breakdown

  // ── STATUS ──
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'],
    default: 'submitted',
  },

  // ── COLLABORATION (NEW) ──
  // Student can add a co-freelancer to help them
  collaborator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  collaboratorStatus: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },

  // ── REVIEW (after completion) ──
  clientRating:  { type: Number, min: 1, max: 5 },
  clientReview:  { type: String },
  studentRating: { type: Number, min: 1, max: 5 },
  studentReview: { type: String },

}, { timestamps: true });

// One student can apply once per project
applicationSchema.index({ project: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);

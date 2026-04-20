// models/Project.js — Project listing model

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({

  // ── POSTED BY ──
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // ── PROJECT DETAILS ──
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category:    {
    type: String,
    required: true,
    enum: ['Design', 'Development', 'Content Writing', 'Social Media',
           'Video & Photo', 'Marketing', 'Data & Research', 'Other'],
  },
  skills:      [{ type: String }],
  budget:      { type: Number, required: true, min: 100 },
  deadline:    {
    type: String,
    enum: ['Within 2 days', 'Within 1 week', '1–2 weeks', '2–4 weeks', 'Flexible'],
    default: 'Flexible',
  },
  workMode:    { type: String, enum: ['Remote', 'On-site', 'Hybrid'], default: 'Remote' },

  // ── STATUS ──
  status: {
    type: String,
    enum: ['open', 'in_progress', 'review', 'completed', 'cancelled'],
    default: 'open',
  },
  isFeatured: { type: Boolean, default: false },

  // ── HIRED STUDENT ──
  hiredStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  // ── META ──
  applicantCount: { type: Number, default: 0 },
  views:          { type: Number, default: 0 },

  // ── PAYMENT ──
  escrowHeld:     { type: Boolean, default: false },
  paymentReleased:{ type: Boolean, default: false },

}, { timestamps: true });

// Text search index
projectSchema.index({ title: 'text', description: 'text', skills: 'text' });

module.exports = mongoose.model('Project', projectSchema);

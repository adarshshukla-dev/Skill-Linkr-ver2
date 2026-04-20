// models/User.js — UPDATED with College Verification fields

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({

  // ── COMMON FIELDS ──
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true, minlength: 8 },
  phone:      { type: String, trim: true },
  role:       { type: String, enum: ['student', 'client'], required: true },
  city:       { type: String, trim: true },
  profilePhoto: { type: String, default: '' },

  // ── COLLEGE VERIFICATION (NEW) ──
  isVerified:       { type: Boolean, default: false },       // admin ne verify kiya
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified',
  },
  collegeIdImage:   { type: String, default: '' },           // uploaded college ID photo URL
  collegeEmail:     { type: String, default: '' },           // .edu or college email (optional)
  verifiedAt:       { type: Date },
  verificationNote: { type: String },                        // admin ka note (if rejected)

  // ── STUDENT FIELDS ──
  college:      { type: String },
  degree:       { type: String },
  year:         { type: String },
  branch:       { type: String },
  gradYear:     { type: String },
  enrollNo:     { type: String },
  skills:       [{ type: String }],
  bio:          { type: String, maxlength: 500 },
  portfolioUrl: { type: String },
  isPro:        { type: Boolean, default: false },

  // ── COLLABORATION (NEW) ──
  // Students I have collaborated with
  collaboratedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  openToCollaborate: { type: Boolean, default: true },   // kya main dusron ki help karna chahta hoon
  collaborationSkills: [{ type: String }],               // jin skills mein help kar sakta hoon

  // ── CLIENT FIELDS ──
  company:      { type: String },
  designation:  { type: String },
  industry:     { type: String },
  companySize:  { type: String },
  website:      { type: String },
  companyLogo:  { type: String, default: '' },
  projectTypes: [{ type: String }],
  typicalBudget: { type: Number },

  // ── STATS ──
  totalEarned:       { type: Number, default: 0 },
  totalSpent:        { type: Number, default: 0 },
  completedProjects: { type: Number, default: 0 },
  avgRating:         { type: Number, default: 0 },
  ratingCount:       { type: Number, default: 0 },

}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(entered) {
  return await bcrypt.compare(entered, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

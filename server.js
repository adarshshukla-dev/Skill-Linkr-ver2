// ─────────────────────────────────────────────
//  Skill Linkr — Main Server Entry Point
//  Node.js + Express + MongoDB Atlas
// ─────────────────────────────────────────────

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const app = express();

// ── MIDDLEWARE ──
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:5500',  // Live Server (VS Code)
    'http://localhost:5500',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── ROUTES ──
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/clients',  require('./routes/clients'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/collaboration',  require('./routes/collaboration'));
app.use('/api/verification',   require('./routes/verification'));

// ── HEALTH CHECK ──
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Skill Linkr API is running!',
    version: '1.0.0',
    status: 'OK',
    endpoints: {
      auth:         '/api/auth',
      students:     '/api/students',
      clients:      '/api/clients',
      projects:     '/api/projects',
      applications: '/api/applications',
    }
  });
});

// ── 404 HANDLER ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── DATABASE + START ──
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas connected successfully');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

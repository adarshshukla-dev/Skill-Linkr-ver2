// middleware/auth.js — JWT protection middleware

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect route — must be logged in
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Role check — only students
const studentOnly = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
  }
  next();
};

// Role check — only clients
const clientOnly = (req, res, next) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ success: false, message: 'Access denied. Clients only.' });
  }
  next();
};

module.exports = { protect, studentOnly, clientOnly };

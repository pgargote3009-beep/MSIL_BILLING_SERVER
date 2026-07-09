const jwt = require('jsonwebtoken');
const User = require('../models/User');

const FALLBACK_JWT_SECRET = 'dev-jwt-secret-change-me';

function extractBearerToken(req) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim();
}

async function protect(req, res, next) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Authentication token is missing' });
    }

    const secret = process.env.JWT_SECRET || FALLBACK_JWT_SECRET;

    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub).select('name mobileNumber role isVerified');

    if (!user) {
      return res.status(401).json({ message: 'User not found for this token' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Account is not OTP verified' });
    }

    req.user = {
      id: String(user._id),
      name: user.name,
      mobileNumber: user.mobileNumber,
      role: user.role
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token' });
  }
}

function authorize(...allowedRoles) {
  const normalizedRoles = allowedRoles.map((role) => String(role).toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!normalizedRoles.includes(String(req.user.role).toLowerCase())) {
      return res.status(403).json({ message: 'You are not authorized for this operation' });
    }

    return next();
  };
}

module.exports = {
  protect,
  authorize
};

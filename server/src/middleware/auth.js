const jwt = require('jsonwebtoken');

/**
 * protect — Verifies JWT from Authorization header.
 * Sets req.user = { id, role, name, mobile }
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No authentication token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

/**
 * authorize — Returns middleware that restricts access to specified roles.
 * Usage: authorize('admin') or authorize('admin', 'staff')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Not authorized for this action' });
    }
    next();
  };
};

// Default export for routes using `const auth = require(...)`
// Named exports for routes using `const { protect, authorize } = require(...)`
module.exports = protect;
module.exports.protect = protect;
module.exports.authorize = authorize;

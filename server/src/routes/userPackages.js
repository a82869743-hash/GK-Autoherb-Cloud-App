/**
 * ─── USER PACKAGES ROUTES ───────────────────────────────────
 * Additional endpoints for package subscription management.
 * The main assign endpoint is at POST /api/packages/assign (Task 4).
 * These routes provide read access + usage tracking.
 *
 * GET    /user-packages/active       → Get active package with remaining counts
 * GET    /user-packages/history      → Package subscription history
 */

const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/userPackagesController');

// Get active package — customers see their own, admin can query any user
router.get('/active', protect, ctrl.getActivePackage);

// Package subscription history
router.get('/history', protect, ctrl.listUserPackages);

module.exports = router;

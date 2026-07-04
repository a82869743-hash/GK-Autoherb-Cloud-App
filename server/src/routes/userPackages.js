/**
 * ─── USER PACKAGES ROUTES ───────────────────────────────────
 * Additional endpoints for package subscription management.
 * The main assign endpoint is at POST /api/packages/assign (Task 4).
 * These routes provide read access + usage tracking + renewal.
 *
 * GET    /user-packages/active           → Get active package with remaining counts
 * GET    /user-packages/history          → Package subscription history
 * POST   /user-packages/:id/renew       → Renew an existing package
 * POST   /user-packages/consume         → Consume reserved service usage
 */

const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/userPackagesController');

// Get active package — customers see their own, admin can query any user
router.get('/active', protect, ctrl.getActivePackage);

// Package subscription history
router.get('/history', protect, ctrl.listUserPackages);

// Export package subscription history (Excel)
router.get('/export', protect, ctrl.exportUserPackages);

// Renew a package (admin only)
router.post('/:id/renew', protect, role(['admin']), ctrl.renewPackage);

// Consume a reserved service (admin only — after job completion)
router.post('/consume', protect, role(['admin']), ctrl.consumeService);

// Bulk renew packages (multi-car) (admin only)
router.post('/bulk-renew', protect, role(['admin']), ctrl.bulkRenewPackages);

module.exports = router;

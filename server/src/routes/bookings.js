const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/bookingsController');

// Vehicle history (admin only) — must be before /:id routes
router.get('/vehicle-history/:regNo', auth, role(['admin']), ctrl.vehicleHistory);

router.get('/',           auth, role(['admin', 'customer']), ctrl.list);
router.get('/pending',    auth, role(['admin']), ctrl.listPending);
router.get('/:id',        auth, role(['admin', 'customer']), ctrl.getOne);
router.post('/',          auth, role(['customer', 'admin']), ctrl.create);
router.patch('/:id/cancel', auth, role(['admin', 'customer']), ctrl.cancel);

// ─── Approval Workflow (Admin only) ─────────────────────
router.patch('/:id/approve', auth, role(['admin']), ctrl.approve);
router.patch('/:id/reject',  auth, role(['admin']), ctrl.reject);

module.exports = router;

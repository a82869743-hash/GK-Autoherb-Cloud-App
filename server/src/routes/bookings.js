const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/bookingsController');

// Vehicle history (admin only) — must be before /:id routes
router.get('/vehicle-history/:regNo', auth, role(['admin']), ctrl.vehicleHistory);

router.get('/',           auth, role(['admin', 'customer']), ctrl.list);
router.get('/:id',        auth, role(['admin', 'customer']), ctrl.getOne);
router.post('/',          auth, role(['customer', 'admin']), ctrl.create);
router.patch('/:id/cancel', auth, role(['admin', 'customer']), ctrl.cancel);

module.exports = router;

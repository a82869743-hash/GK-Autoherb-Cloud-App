const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/couponsController');

// ─── Public / Customer Facing ────────────────────────
router.post('/validate', ctrl.validateCoupon); // Public or customer validation
router.get('/active',     ctrl.listActiveOffers); // Active offers list

// ─── Admin Management ────────────────────────────────
router.get('/',               auth, role(['admin']), ctrl.listCoupons);
router.post('/',              auth, role(['admin']), ctrl.createCoupon);
router.put('/:id',            auth, role(['admin']), ctrl.updateCoupon);
router.patch('/:id/toggle',   auth, role(['admin']), ctrl.toggleCoupon);
router.delete('/:id',         auth, role(['admin']), ctrl.deleteCoupon);
router.get('/:id/redemptions', auth, role(['admin']), ctrl.getCouponRedemptions);
router.post('/share',         auth, role(['admin']), ctrl.shareCoupon);

module.exports = router;

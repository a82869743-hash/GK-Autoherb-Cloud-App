const router = require('express').Router();

// Import middleware correctly
const { protect } = require('../middleware/auth');
const role = require('../middleware/role');

// Import controller
const loyaltyController = require('../controllers/loyaltyController');

// ─── Customer routes ─────────────────────────
router.get('/mine',          protect, role(['customer']), loyaltyController.get);
router.get('/mine/history',  protect, role(['customer']), loyaltyController.history);
router.get('/mine/vouchers', protect, role(['customer']), loyaltyController.myVouchers);

// ─── Reward catalogue (customers browse, admin manages) ─────
router.get('/rewards',              protect, role(['customer', 'admin']), loyaltyController.listRewards);
router.post('/rewards',             protect, role(['admin']), loyaltyController.createReward);
router.put('/rewards/:rewardId',    protect, role(['admin']), loyaltyController.updateReward);
router.delete('/rewards/:rewardId', protect, role(['admin']), loyaltyController.deleteReward);
router.post('/rewards/:rewardId/redeem', protect, role(['customer', 'admin']), loyaltyController.redeemReward);
router.get('/redemptions',          protect, role(['admin']), loyaltyController.listRedemptions);
router.patch('/redemptions/:redemptionId', protect, role(['admin']), loyaltyController.updateRedemption);

// ─── Admin routes ────────────────────────────
router.get('/search',        protect, role(['admin']), loyaltyController.search);
router.get('/settings',      protect, role(['admin']), loyaltyController.getSettings);
router.patch('/settings',    protect, role(['admin']), loyaltyController.updateSettings);
router.get('/:customerId',           protect, role(['admin']), loyaltyController.get);
router.get('/:customerId/history',   protect, role(['admin']), loyaltyController.history);
router.patch('/:customerId',         protect, role(['admin']), loyaltyController.update);

// ─── Points operations ──────────────────────
router.post('/earn',         protect, role(['admin']), loyaltyController.earnPoints);
router.post('/redeem',       protect, role(['admin', 'customer']), loyaltyController.redeemPoints);
router.post('/redeem-wash',  protect, role(['admin', 'customer']), loyaltyController.redeemPointsToWash);

module.exports = router;

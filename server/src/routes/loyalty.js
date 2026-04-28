const router = require('express').Router();

// Import middleware correctly
const { protect } = require('../middleware/auth');
const role = require('../middleware/role');

// Import controller
const loyaltyController = require('../controllers/loyaltyController');

// Map exports exactly to what exists
const getLoyalty = loyaltyController.get || loyaltyController.getLoyalty;
const updateLoyalty = loyaltyController.update || loyaltyController.updateLoyalty;
const getLoyaltyHistory = loyaltyController.history || loyaltyController.getLoyaltyHistory;

// Routes
router.get('/mine', protect, role(['customer']), getLoyalty);
router.get('/mine/history', protect, role(['customer']), getLoyaltyHistory);
router.get('/:customerId', protect, role(['admin']), getLoyalty);
router.get('/:customerId/history', protect, role(['admin']), getLoyaltyHistory);
router.patch('/:customerId', protect, role(['admin']), updateLoyalty);

module.exports = router;

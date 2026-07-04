const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/feedbackController');

router.get('/', auth, role(['admin']), ctrl.getFeedback);
router.get('/stats', auth, role(['admin']), ctrl.getFeedbackStats);
router.post('/', auth, ctrl.submitFeedback);
router.put('/:id/reply', auth, role(['admin']), ctrl.replyToFeedback);
router.get('/referral', auth, ctrl.getReferralStats);
router.post('/referral/generate', auth, ctrl.generateReferralCode);
router.post('/referral/apply', auth, ctrl.applyReferralCode);

module.exports = router;

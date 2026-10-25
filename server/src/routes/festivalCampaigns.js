const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/festivalCampaignsController');

router.use(auth, role(['admin']));
router.get('/', ctrl.list);
router.get('/audience-count', ctrl.audienceCount);
router.post('/', ctrl.create);
router.post('/:id/cancel', ctrl.cancel);

module.exports = router;

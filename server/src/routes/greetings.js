const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/greetingsController');

router.get('/campaigns',        auth, role(['admin']), ctrl.listCampaigns);
router.post('/campaigns',       auth, role(['admin']), ctrl.saveCampaign);
router.put('/campaigns/:id',    auth, role(['admin']), ctrl.saveCampaign);
router.delete('/campaigns/:id', auth, role(['admin']), ctrl.deleteCampaign);
router.get('/upcoming',         auth, role(['admin']), ctrl.upcoming);
router.post('/send',            auth, role(['admin']), ctrl.sendNow);
router.get('/logs',             auth, role(['admin']), ctrl.logs);

module.exports = router;

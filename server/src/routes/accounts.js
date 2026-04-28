const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/accountsController');

router.get('/summary',       auth, role(['admin']), ctrl.summary);
router.get('/transactions',  auth, role(['admin']), ctrl.transactions);
router.get('/report',        auth, role(['admin']), ctrl.report);
router.get('/kpis',          auth, role(['admin']), ctrl.kpis);

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/reportsController');

// All reports are admin-only
router.get('/sales',     auth, role(['admin']), ctrl.salesReport);
router.get('/inventory', auth, role(['admin']), ctrl.inventoryReport);
router.get('/job-cards', auth, role(['admin']), ctrl.jobCardReport);

module.exports = router;

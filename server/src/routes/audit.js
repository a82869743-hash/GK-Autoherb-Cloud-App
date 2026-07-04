const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/auditController');

router.get('/', auth, role(['admin']), ctrl.getAuditLogs);
router.get('/summary', auth, role(['admin']), ctrl.getAuditSummary);

module.exports = router;

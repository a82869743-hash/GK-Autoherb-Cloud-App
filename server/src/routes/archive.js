const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/archiveController');

router.get('/', auth, role(['admin']), ctrl.listArchived);

module.exports = router;

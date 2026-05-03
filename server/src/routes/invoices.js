const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { adminOrStaff } = require('../middleware/role');
const ctrl = require('../controllers/invoicesController');

router.get('/', protect, adminOrStaff, ctrl.listAll);

module.exports = router;

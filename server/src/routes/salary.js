const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/salaryController');

router.get('/', auth, role(['admin']), ctrl.getSalary);
router.post('/calculate', auth, role(['admin']), ctrl.calculateSalary);
router.put('/:id', auth, role(['admin']), ctrl.updateSalary);

module.exports = router;

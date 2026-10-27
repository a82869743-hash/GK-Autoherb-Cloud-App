const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/packageEmiController');

router.get('/my', auth, role(['customer']), ctrl.myPlans);
router.get('/', auth, role(['admin']), ctrl.list);
router.post('/installments/:id/pay', auth, role(['admin', 'staff']), ctrl.recordPayment);
router.post('/:id/remind', auth, role(['admin']), ctrl.remind);

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/inventoryController');

router.get('/',          auth, role(['admin', 'staff']), ctrl.list);
router.get('/:id',       auth, role(['admin', 'staff']), ctrl.getOne);
router.post('/',         auth, role(['admin']), ctrl.create);
router.put('/:id',       auth, role(['admin']), ctrl.update);
router.patch('/:id/quantity', auth, role(['admin']), ctrl.adjustQuantity);
router.delete('/:id',    auth, role(['admin']), ctrl.softDelete);

module.exports = router;

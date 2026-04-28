const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/servicesController');

router.get('/',             ctrl.list);  // public
router.get('/:id',          ctrl.getOne);
router.post('/',            auth, role(['admin']), ctrl.create);
router.put('/:id',          auth, role(['admin']), ctrl.update);
router.patch('/:id/toggle', auth, role(['admin']), ctrl.toggleActive);
router.delete('/:id',       auth, role(['admin']), ctrl.delete);

module.exports = router;

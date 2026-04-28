const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/packagesController');
const userPkgCtrl = require('../controllers/userPackagesController');

// Existing package CRUD routes (untouched)
router.get('/',              ctrl.list);  // public
router.get('/:id',           ctrl.getOne);
router.post('/',             auth, role(['admin']), ctrl.create);
router.put('/:id',           auth, role(['admin']), ctrl.update);
router.patch('/:id/toggle',  auth, role(['admin']), ctrl.togglePublish);
router.delete('/:id',        auth, role(['admin']), ctrl.delete);

// ─── TASK 4: Package Assignment (POST /packages/assign) ─────
// Admin assigns a package to a customer
router.post('/assign', auth, role(['admin']), userPkgCtrl.assignPackage);

module.exports = router;

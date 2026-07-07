const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/rolesController');

router.get('/', auth, role(['admin']), ctrl.listRoles);
router.post('/', auth, role(['admin']), ctrl.createRole);
router.put('/:id', auth, role(['admin']), ctrl.updateRole);
router.delete('/:id', auth, role(['admin']), ctrl.deleteRole);

router.get('/permissions', auth, role(['admin']), ctrl.listAllPermissions);
router.get('/:id/permissions', auth, role(['admin']), ctrl.getRolePermissions);
router.post('/:id/permissions', auth, role(['admin']), ctrl.saveRolePermissions);

module.exports = router;

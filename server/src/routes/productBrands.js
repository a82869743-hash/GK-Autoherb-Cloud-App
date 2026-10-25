const router = require('express').Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const role = require('../middleware/role');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/productBrandsController');

router.get('/', optionalAuth, ctrl.list); // public
router.post('/', auth, role(['admin']), upload.single('file'), ctrl.create);
router.put('/:id', auth, role(['admin']), upload.single('file'), ctrl.update);
router.delete('/:id', auth, role(['admin']), ctrl.remove);

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/customersController');

router.get('/', auth, role(['admin']), ctrl.list);
router.get('/:id', auth, role(['admin']), ctrl.getDetail);
router.post('/:id/notes', auth, role(['admin']), ctrl.addNote);

module.exports = router;

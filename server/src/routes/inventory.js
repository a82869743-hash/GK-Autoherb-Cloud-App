const router = require('express').Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/inventoryController');

router.post('/bulk-upload', auth, role(['admin']), upload.single('file'), ctrl.bulkUpload);
router.post('/upload-image', auth, role(['admin']), upload.single('image'), ctrl.uploadImage);
router.get('/',          auth, role(['admin', 'staff']), ctrl.list);
router.get('/:id',       auth, role(['admin', 'staff']), ctrl.getOne);
router.post('/',         auth, role(['admin']), ctrl.create);
router.put('/:id',       auth, role(['admin']), ctrl.update);
router.patch('/:id/quantity', auth, role(['admin']), ctrl.adjustQuantity);
router.delete('/:id',    auth, role(['admin']), ctrl.softDelete);

module.exports = router;

const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/jobCartController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Vehicle lookup
router.get('/vehicles/lookup/:regNo', auth, role(['admin']), ctrl.lookup);

// Job cart CRUD
router.get('/',         auth, role(['admin', 'customer']), ctrl.list);
router.post('/',        auth, role(['admin', 'staff']), ctrl.create);
router.get('/:id',      auth, role(['admin', 'customer', 'staff']), ctrl.getOne);
router.put('/:id',      auth, role(['admin', 'staff']), ctrl.update);

// Status transitions
router.patch('/:id/submit',   auth, role(['admin', 'staff']), ctrl.submit);
router.patch('/:id/complete', auth, role(['admin']), ctrl.complete);

// Services
router.post('/:id/services',       auth, role(['admin', 'staff']), ctrl.addService);
router.put('/:id/services/:sid',   auth, role(['admin', 'staff']), ctrl.updateService);
router.delete('/:id/services/:sid', auth, role(['admin', 'staff']), ctrl.deleteService);

// Photos
router.post('/:id/photos',        auth, role(['admin', 'staff']), upload.single('photo'), ctrl.uploadPhoto);
router.delete('/:id/photos/:pid', auth, role(['admin', 'staff']), ctrl.deletePhoto);

// Invoice
router.get('/:id/invoice', auth, role(['admin', 'customer']), ctrl.getInvoice);

module.exports = router;

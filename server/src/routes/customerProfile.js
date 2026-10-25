const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/customerProfileController');

router.get('/',                 auth, role(['customer']), ctrl.getProfile);
router.put('/',                 auth, role(['customer']), ctrl.updateProfile);
router.post('/photo',           auth, role(['customer']), ctrl.uploadPhoto);
router.delete('/photo',         auth, role(['customer']), ctrl.removePhoto);
router.get('/warranties',       auth, role(['customer']), ctrl.myWarranties);
router.get('/segment',          auth, role(['customer', 'admin']), ctrl.segmentFor);

router.get('/addresses',                       auth, role(['customer']), ctrl.listAddresses);
router.post('/addresses',                      auth, role(['customer']), ctrl.createAddress);
router.put('/addresses/:addressId',            auth, role(['customer']), ctrl.updateAddress);
router.patch('/addresses/:addressId/default',  auth, role(['customer']), ctrl.setDefaultAddress);
router.delete('/addresses/:addressId',         auth, role(['customer']), ctrl.deleteAddress);

module.exports = router;

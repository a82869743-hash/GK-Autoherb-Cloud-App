const express = require('express');
const router = express.Router();
const vehiclesController = require('../controllers/vehiclesController');
const auth = require('../middleware/auth');

// Existing routes (untouched)
router.get('/my-vehicles', auth, vehiclesController.getVehicles);
router.get('/brands', vehiclesController.getBrands);
router.get('/models', vehiclesController.getModels);
router.get('/variants', vehiclesController.getVariants);

// ─── New Car Management Routes ──────────────────────────────
router.post('/add',          auth, vehiclesController.addCar);
router.patch('/:id/primary', auth, vehiclesController.setPrimary);
router.delete('/:id',        auth, vehiclesController.deleteCar);

module.exports = router;



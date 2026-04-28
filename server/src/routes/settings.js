const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

// Protected route for Admin to read settings
router.get('/', protect, authorize('admin'), settingsController.getAll);

// Protected route for Admin to update settings
router.patch('/', protect, authorize('admin'), settingsController.updateAll);

module.exports = router;

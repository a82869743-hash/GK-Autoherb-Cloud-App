const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

// Public route for customer apps, chatbots, and dashboards to read studio parameters
router.get('/public', settingsController.getPublic);

// Protected route for Admin to read all settings
router.get('/', protect, authorize('admin'), settingsController.getAll);

// Protected route for Admin to update settings
router.patch('/', protect, authorize('admin'), settingsController.updateAll);

// Automation & Service Reminders
router.get('/reminders/preview',  protect, authorize('admin'), settingsController.previewReminders);
router.post('/reminders/send-now', protect, authorize('admin'), settingsController.sendRemindersNow);

module.exports = router;

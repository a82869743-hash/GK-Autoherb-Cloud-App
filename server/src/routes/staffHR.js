const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/staffHRController');

// Tasks
router.get('/tasks', auth, role(['admin','staff']), ctrl.getStaffTasks);
router.post('/tasks', auth, role(['admin']), ctrl.createStaffTask);
router.put('/tasks/:id/status', auth, role(['admin','staff']), ctrl.updateTaskStatus);

// Leaves
router.get('/leaves', auth, role(['admin','staff']), ctrl.getStaffLeaves);
router.post('/leaves', auth, ctrl.requestLeave);
router.put('/leaves/:id/status', auth, role(['admin']), ctrl.updateLeaveStatus);

// Performance
router.get('/performance', auth, role(['admin']), ctrl.getStaffPerformance);
router.post('/performance', auth, role(['admin']), ctrl.addPerformanceReview);

module.exports = router;

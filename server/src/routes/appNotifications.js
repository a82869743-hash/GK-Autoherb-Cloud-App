const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/appNotificationsController');

router.get('/push/public-key', ctrl.publicKey);
router.use(auth);
router.get('/', ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.post('/read-all', ctrl.markAllRead);
router.post('/:id/read', ctrl.markRead);
router.post('/push/subscribe', ctrl.subscribe);
router.post('/push/unsubscribe', ctrl.unsubscribe);
router.post('/push/test', ctrl.test);

module.exports = router;

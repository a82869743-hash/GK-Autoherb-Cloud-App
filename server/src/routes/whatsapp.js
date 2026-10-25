const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/whatsappController');

router.get('/',                  auth, role(['admin']), ctrl.list);
router.get('/stats',             auth, role(['admin']), ctrl.stats);
router.post('/send',             auth, role(['admin']), ctrl.sendManual);
router.post('/send-manual',      auth, role(['admin']), ctrl.sendManual);
router.post('/send-invoice',     auth, role(['admin']), ctrl.sendInvoice);

// Template management & retries
router.get('/templates',         auth, role(['admin']), ctrl.listTemplates);
router.put('/templates/:id',     auth, role(['admin']), ctrl.updateTemplate);
router.post('/templates/test-send', auth, role(['admin']), ctrl.testSendTemplate);
router.post('/retry/:id',        auth, role(['admin']), ctrl.retryNotification);

// Provider status, inbox & auto-bot
router.get('/provider-status',   auth, role(['admin']), ctrl.providerStatus);
router.get('/inbox',             auth, role(['admin']), ctrl.inbox);
router.patch('/inbox/:id',       auth, role(['admin']), ctrl.updateInbox);
router.post('/inbox/:id/reply',  auth, role(['admin']), ctrl.replyInbox);
router.post('/simulate-incoming', auth, role(['admin']), ctrl.simulateIncoming);

module.exports = router;

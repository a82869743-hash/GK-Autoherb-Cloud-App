const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const chatbotController = require('../controllers/chatbotController');
const { protect, authorize } = require('../middleware/auth');

// Optional auth helper: if bearer token is present, decode user to attach to chatbot session
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Proceed unauthenticated without rejecting request
    }
  }
  next();
};

// ─── Customer / Public Chatbot Endpoints ───────────────────
router.post('/session', optionalAuth, chatbotController.initSession);
router.post('/message', optionalAuth, chatbotController.sendMessage);
router.post('/lead', chatbotController.captureLead);

// ─── Admin Monitoring & Knowledge Channel Endpoints ────────
router.use('/admin', protect, authorize('admin'));

router.get('/admin/stats', chatbotController.adminGetStats);
router.get('/admin/conversations', chatbotController.adminGetConversations);
router.get('/admin/conversations/:id', chatbotController.adminGetMessages);
router.post('/admin/conversations/:id/reply', chatbotController.adminSendMessage);

router.get('/admin/knowledge', chatbotController.adminGetKnowledge);
router.post('/admin/knowledge', chatbotController.adminSaveKnowledge);
router.delete('/admin/knowledge/:id', chatbotController.adminDeleteKnowledge);

module.exports = router;

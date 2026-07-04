const axios = require('axios');

/**
 * ─── MESSAGING SERVICE (2FACTOR.IN) ──────────────────────────
 * 
 * Sends transactional SMS via 2Factor.in API.
 * All DLT templates must be pre-registered on the DLT portal.
 *
 * ENV required:
 *   MSG91_AUTH_KEY   — Your 2Factor.in API key
 *   MSG91_SENDER_ID  — Approved 6-char DLT sender ID (default: GKAHER)
 */

class MessagingService {
  constructor() {
    this.apiKey = process.env.MSG91_AUTH_KEY;
    this.senderId = process.env.MSG91_SENDER_ID || 'GKAHER';
  }

  /**
   * Send Transactional SMS via 2Factor.in
   * @param {string} mobile — 10-digit Indian mobile (no country code)
   * @param {string} message — DLT-approved message text (must match exactly)
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async sendSMS(mobile, templateId, shortUrl, variables = {}) {
    if (!this.apiKey) {
      console.log(`[MOCK SMS] To: ${mobile} | Variables:`, variables);
      return { success: true, mocked: true };
    }

    // Build the actual message from variables
    // For campaigns, the message_content is passed as variables.content
    const message = variables.content || variables.body || '';
    if (!message) {
      console.error('[SMS] No message content provided');
      return { success: false, error: 'No message content' };
    }

    try {
      const response = await axios.get('https://2factor.in/API/R1/', {
        params: {
          module: 'TRANS_SMS',
          apikey: this.apiKey,
          to: mobile,
          from: this.senderId,
          msg: message,
        },
        timeout: 10000,
      });

      if (response.data && response.data.Status === 'Success') {
        console.log(`[SMS] SENT — To: ${mobile} | SessionId: ${response.data.Details}`);
        return { success: true, data: response.data };
      } else {
        console.error(`[SMS] FAILED — To: ${mobile} | Response:`, response.data);
        return { success: false, error: response.data?.Details || 'SMS send failed' };
      }
    } catch (error) {
      console.error('[SMS] ERROR —', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.Details || error.message };
    }
  }

  async sendWhatsApp(to, templateName, defaultParams = {}) {
    const whatsappController = require('../controllers/whatsappController');
    return await whatsappController._sendWhatsAppMessage(
      to, 
      templateName, 
      defaultParams.params || [], 
      defaultParams.body || ''
    );
  }
}

module.exports = new MessagingService();

const axios = require('axios');

class MessagingService {
  constructor() {
    this.msg91BaseUrl = 'https://control.msg91.com/api/v5';
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.senderId = process.env.MSG91_SENDER_ID || 'GKAUTO';
  }

  /**
   * Send WhatsApp Message via MSG91
   * @param {string} to - Destination number with country code (e.g., 919876543210)
   * @param {string} templateName - The pre-approved template name
   * @param {Object} defaultParams - Key-value map of variables in the template
   */
  async sendWhatsApp(to, templateName, defaultParams = {}) {
    if (!this.authKey) {
      console.log(`[MOCK WHATSAPP] To: ${to} | Template: ${templateName} | Params:`, defaultParams);
      return { success: true, mocked: true };
    }

    try {
      const response = await axios.post(`${this.msg91BaseUrl}/whatsapp/whatsapp-outbound-message/bulk/`, {
        integrated_number: process.env.WHATSAPP_NUMBER || "919925566886",
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: templateName,
            language: { code: "en", policy: "deterministic" },
            namespace: process.env.WHATSAPP_NAMESPACE,
            to_and_components: [
              {
                to: [to],
                components: this._buildTemplateComponents(defaultParams)
              }
            ]
          }
        }
      }, {
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json'
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('WhatsApp sending failed:', error?.response?.data || error.message);
      return { success: false, error: 'Failed to send WhatsApp message' };
    }
  }

  /**
   * Send promotional SMS or Transactional SMS via MSG91
   */
  async sendSMS(to, templateId, shortUrl = '1', variables = {}) {
    if (!this.authKey) {
      console.log(`[MOCK SMS] To: ${to} | TemplateID: ${templateId} | Variables:`, variables);
      return { success: true, mocked: true };
    }

    try {
      const response = await axios.post(`${this.msg91BaseUrl}/flow/`, {
        template_id: templateId,
        short_url: shortUrl,
        recipients: [
          {
            mobiles: to,
            ...variables
          }
        ]
      }, {
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json'
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('SMS sending failed:', error?.response?.data || error.message);
      return { success: false, error: 'Failed to send SMS' };
    }
  }

  // Internal helper to map MSG91 dynamic params
  _buildTemplateComponents(params) {
    if (Object.keys(params).length === 0) return {};
    const components = {};
    if (params.body) {
      components["body_1"] = {
        type: "text",
        value: params.body
      };
    }
    if (params.header) {
      components["header_1"] = {
        type: "text",
        value: params.header
      };
    }
    return components;
  }
}

module.exports = new MessagingService();

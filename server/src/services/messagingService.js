const axios = require('axios');
const pool = require('../config/db');
const whatsapp = require('./whatsappProvider');

const PROMOTIONAL_EVENTS = [
  'PACKAGE_EXPIRY_REMINDER', 'WELCOME_MESSAGE', 'PAYMENT_REMINDER', 'SERVICE_REMINDER',
  'BIRTHDAY_WISH', 'ANNIVERSARY_WISH', 'COUPON_ISSUED', 'WARRANTY_EXPIRY_REMINDER',
  'FESTIVAL_OFFER', 'PACKAGE_NEXT_WASH', 'PACKAGE_EXPIRED',
];

function appBaseUrl() {
  return (process.env.APP_BASE_URL || 'https://gkautobook.cloud').replace(/\/$/, '');
}

function renderTemplate(body, variables) {
  let out = body || '';
  for (const [key, value] of Object.entries(variables || {})) {
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value === null || value === undefined ? '' : String(value));
  }
  // Blank out anything left unfilled so customers never see raw {{placeholders}}
  return out.replace(/\{\{\s*[a-z0-9_]+\s*\}\}/gi, '').replace(/[ \t]{2,}/g, ' ').trim();
}

function parseVariableOrder(template) {
  try {
    const v = typeof template.variables === 'string' ? JSON.parse(template.variables) : template.variables;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

class MessagingService {
  constructor() {
    this.apiKey = process.env.TWO_FACTOR_API_KEY || process.env.MSG91_AUTH_KEY;
    this.senderId = process.env.MSG91_SENDER_ID || 'GKAHER';
  }

  appBaseUrl() {
    return appBaseUrl();
  }

  renderTemplate(body, variables) {
    return renderTemplate(body, variables);
  }

  /**
   * Send Transactional SMS via 2Factor.in / MSG91
   */
  async sendSMS(mobile, templateId, shortUrl, variables = {}) {
    if (!this.apiKey) {
      console.log(`[MOCK SMS] To: ${mobile} | Variables:`, variables);
      return { success: true, mocked: true };
    }

    const message = variables.content || variables.body || '';
    if (!message) {
      console.error('[SMS] No message content provided');
      return { success: false, error: 'No message content' };
    }

    // Normalize phone to 10 digits
    let cleanedMobile = String(mobile).replace(/\D/g, '');
    if (cleanedMobile.length > 10) {
      cleanedMobile = cleanedMobile.substring(cleanedMobile.length - 10);
    }

    try {
      const response = await axios.get('https://2factor.in/API/R1/', {
        params: {
          module: 'TRANS_SMS',
          apikey: this.apiKey,
          to: cleanedMobile,
          from: this.senderId,
          msg: message,
        },
        timeout: 10000,
      });

      if (response.data && response.data.Status === 'Success') {
        console.log(`[SMS] SENT — To: ${cleanedMobile} | SessionId: ${response.data.Details}`);
        return { success: true, data: response.data };
      } else {
        console.error(`[SMS] FAILED — To: ${cleanedMobile} | Response:`, response.data);
        return { success: false, error: response.data?.Details || 'SMS send failed' };
      }
    } catch (error) {
      console.error('[SMS] ERROR —', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.Details || error.message };
    }
  }

  /**
   * Free-form WhatsApp text (used by reminders, bot replies and manual sends).
   * Goes out through the Cloud API when configured, otherwise is queued with a click-to-chat link.
   */
  async sendWhatsApp(to, templateName, defaultParams = {}, meta = {}) {
    // Some callers pass the message itself as the 2nd argument
    if (!defaultParams.body && typeof templateName === 'string' && /\s/.test(templateName)) {
      defaultParams = { ...defaultParams, body: templateName };
      templateName = 'manual_message';
    }
    const messageBody = defaultParams.body || `Template: ${templateName}`;
    if (defaultParams.body) {
      require('./appNotify').notifyUser({ userId: meta.customer_id || null, mobile: to, event: templateName === 'manual_message' ? 'MESSAGE' : templateName || meta.message_type, body: defaultParams.body }).catch(() => {});
    }
    const result = await whatsapp.sendText(to, messageBody);
    try {
      const [ins] = await pool.query(
        `INSERT INTO whatsapp_messages (customer_id, phone, template_name, message_type, message_body, status, provider_message_id, error_message, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          meta.customer_id || null,
          whatsapp.normalizePhone(to),
          templateName,
          meta.message_type || 'manual',
          messageBody,
          result.status === 'sent' ? 'sent' : result.status === 'failed' ? 'failed' : 'pending',
          result.provider_message_id || null,
          result.error ? String(result.error).slice(0, 500) : null,
          result.status === 'sent' ? new Date() : null,
        ]
      );
      return { ...result, id: ins.insertId };
    } catch (err) {
      console.error('[sendWhatsApp] Error logging:', err.message);
      return result;
    }
  }

  async getTemplate(eventTrigger) {
    const [templates] = await pool.query(
      'SELECT * FROM v2_whatsapp_templates WHERE event_trigger = ? AND is_active = 1 LIMIT 1',
      [eventTrigger]
    );
    return templates[0] || null;
  }

  /**
   * Deliver one rendered template to one phone over WhatsApp (+ SMS fallback) and log it.
   */
  async deliver({ customerId = null, mobile, template, variables, references = {} }) {
    const messageBody = renderTemplate(template.message_body, variables);

    // Same message in the app inbox + phone notification (free, works even before WhatsApp is connected)
    require('./appNotify').notifyUser({
      userId: customerId, mobile, event: template.event_trigger, body: messageBody,
      refType: references.type || null, refId: references.id || null,
    }).catch(() => {});

    let waResult;
    if (template.provider_template_name) {
      const ordered = parseVariableOrder(template).map((k) => variables[k]);
      waResult = await whatsapp.sendTemplate(mobile, template.provider_template_name, template.provider_language, ordered, messageBody);
    } else {
      waResult = await whatsapp.sendText(mobile, messageBody);
    }

    const waStatus = waResult.status === 'sent' ? 'sent' : waResult.status === 'failed' ? 'failed' : 'queued';
    await pool.query(
      `INSERT INTO v2_notification_logs (customer_id, mobile, channel, template_name, message_body, status, attempts, last_attempt_at, response_data, reference_type, reference_id)
       VALUES (?, ?, 'whatsapp', ?, ?, ?, 1, NOW(), ?, ?, ?)`,
      [
        customerId, mobile, template.template_name, messageBody, waStatus,
        JSON.stringify({ wa_link: waResult.wa_link, mode: waResult.mode, provider_message_id: waResult.provider_message_id, error: waResult.error }),
        references.type || null, references.id || null,
      ]
    );
    await pool.query(
      `INSERT INTO whatsapp_messages (customer_id, phone, template_name, message_type, message_body, status, provider_message_id, error_message, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId, whatsapp.normalizePhone(mobile), template.template_name,
        String(template.event_trigger || 'manual').toLowerCase().slice(0, 40), messageBody,
        waStatus === 'queued' ? 'pending' : waStatus, waResult.provider_message_id || null,
        waResult.error ? String(waResult.error).slice(0, 500) : null, waStatus === 'sent' ? new Date() : null,
      ]
    );

    // SMS goes out only when WhatsApp didn't actually deliver (not configured / failed)
    let smsResult = { success: false, skipped: true };
    const smsAllowed = process.env.MESSAGES_ENABLED !== 'false' && template.send_sms !== 0;
    if (smsAllowed && waStatus !== 'sent') {
      smsResult = await this.sendSMS(mobile, process.env.MSG91_PROMO_TEMPLATE_ID || 'PROMO123', null, { content: messageBody });
      await pool.query(
        `INSERT INTO v2_notification_logs (customer_id, mobile, channel, template_name, message_body, status, attempts, last_attempt_at, response_data, reference_type, reference_id)
         VALUES (?, ?, 'sms', ?, ?, ?, 1, NOW(), ?, ?, ?)`,
        [customerId, mobile, template.template_name, messageBody, smsResult.success ? 'sent' : 'failed', JSON.stringify(smsResult), references.type || null, references.id || null]
      );
    }

    return { success: true, message: messageBody, wa_link: waResult.wa_link, whatsapp: waStatus, sms: smsResult };
  }

  /**
   * Universal customer notification by event trigger (see v2_whatsapp_templates).
   */
  async notify(customerId, eventTrigger, variables = {}, references = {}) {
    try {
      const [users] = await pool.query(
        'SELECT id, name, mobile, opt_out_promotional FROM users WHERE id = ?',
        [customerId]
      );
      if (!users.length || !users[0].mobile) {
        console.warn(`[notify] Customer ${customerId} not found or has no mobile`);
        return { success: false, error: 'Customer not found or has no mobile' };
      }
      const customer = users[0];

      if (PROMOTIONAL_EVENTS.includes(eventTrigger) && customer.opt_out_promotional === 1) {
        console.log(`[notify] Customer ${customerId} opted out of promotional messages — skipping ${eventTrigger}`);
        return { success: true, opted_out: true };
      }

      const template = await this.getTemplate(eventTrigger);
      if (!template) {
        console.warn(`[notify] Active template for trigger ${eventTrigger} not found`);
        return { success: false, error: 'Template not found' };
      }

      const vars = { customer_name: customer.name, booking_url: `${appBaseUrl()}/customer/bookings/new`, ...variables };
      const result = await this.deliver({ customerId, mobile: customer.mobile, template, variables: vars, references });

      const io = global.__gkIo;
      if (io) io.emit('notification_logged', { customer_id: customerId, trigger: eventTrigger });
      return result;
    } catch (err) {
      console.error('[notify] Error:', err);
      return { success: false, error: err.message };
    }
  }

  /** Same as notify() but to a raw phone number (admin alerts, unregistered numbers). */
  async notifyPhone(mobile, eventTrigger, variables = {}, references = {}) {
    try {
      if (!mobile) return { success: false, error: 'No mobile' };
      const template = await this.getTemplate(eventTrigger);
      if (!template) return { success: false, error: 'Template not found' };
      return await this.deliver({ customerId: null, mobile, template, variables, references });
    } catch (err) {
      console.error('[notifyPhone] Error:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new MessagingService();

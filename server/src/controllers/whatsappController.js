const pool = require('../config/db');

const messagingService = require('../services/messagingService');
const whatsapp = require('../services/whatsappProvider');
const whatsappBot = require('../services/whatsappBot');

// All outgoing WhatsApp goes through the provider (Cloud API when configured, queued link otherwise)
async function sendWhatsAppMessage(phone, templateName, params = [], messageBody = '') {
  return messagingService.sendWhatsApp(phone, templateName || 'manual', { body: messageBody || `Template: ${templateName}` });
}

// ─── SEND MANUAL MESSAGE ────────────────────────────────
exports.sendManual = async (req, res) => {
  try {
    const { phone, message, customer_id } = req.body;
    if (!phone || !message) return res.status(400).json({ success: false, error: 'Phone and message required' });

    const result = await sendWhatsAppMessage(phone, null, [], message);
    if (customer_id) {
      try {
        await pool.query(`UPDATE whatsapp_messages SET customer_id = ? WHERE id = ?`, [customer_id, result.id]);
      } catch (dbErr) {}
    }
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('WhatsApp sendManual error:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
};

// ─── SEND INVOICE VIA WHATSAPP ──────────────────────────
exports.sendInvoice = async (req, res) => {
  try {
    const { phone, invoice_id, customer_name, amount } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone required' });

    const message = `🧾 *GK AutoHerb Invoice*\n\nDear ${customer_name || 'Customer'},\nYour invoice #${invoice_id} for ₹${Number(amount).toLocaleString('en-IN')} is ready.\n\nThank you for choosing GK AutoHerb! 🚗✨`;
    const result = await sendWhatsAppMessage(phone, null, [], message);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('WhatsApp sendInvoice error:', err);
    res.status(500).json({ success: false, error: 'Failed to send invoice' });
  }
};

// ─── AUTO: BOOKING CONFIRMATION ─────────────────────────
exports.sendBookingConfirmation = async (phone, customerName, date, time, serviceName) => {
  const message = `✅ *Booking Confirmed*\n\nHi ${customerName},\nYour booking for *${serviceName}* is confirmed.\n📅 ${date}\n⏰ ${time}\n\nSee you at GK AutoHerb! 🚗`;
  return sendWhatsAppMessage(phone, null, [], message);
};

// ─── AUTO: SERVICE COMPLETE ─────────────────────────────
exports.sendServiceComplete = async (phone, customerName, vehicleReg) => {
  const message = `🎉 *Service Complete!*\n\nHi ${customerName},\nYour vehicle (${vehicleReg}) service is complete and ready for pickup!\n\nThank you for choosing GK AutoHerb! ⭐`;
  return sendWhatsAppMessage(phone, null, [], message);
};

// ─── AUTO: PAYMENT REMINDER ─────────────────────────────
exports.sendPaymentReminder = async (phone, customerName, amount, dueDate) => {
  const message = `💳 *Payment Reminder*\n\nHi ${customerName},\nYou have a pending payment of ₹${Number(amount).toLocaleString('en-IN')}.\nDue: ${dueDate}\n\nPay online or visit GK AutoHerb. 🚗`;
  return sendWhatsAppMessage(phone, null, [], message);
};

// ─── AUTO: PACKAGE EXPIRY REMINDER ──────────────────────
exports.sendPackageExpiryReminder = async (phone, customerName, packageName, expiryDate) => {
  const message = `⚠️ *Package Expiring Soon*\n\nHi ${customerName},\nYour *${packageName}* package expires on ${expiryDate}.\n\nRenew now to continue enjoying premium services! 💎`;
  return sendWhatsAppMessage(phone, null, [], message);
};

// ─── LIST MESSAGE HISTORY ───────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { customer_id, status, message_type, from, to, page = 1, limit = 50 } = req.query;
    let where = '1=1';
    const params = [];

    if (customer_id) { where += ' AND wm.customer_id = ?'; params.push(customer_id); }
    if (status) { where += ' AND wm.status = ?'; params.push(status); }
    if (message_type) { where += ' AND wm.message_type = ?'; params.push(message_type); }
    if (from) { where += ' AND wm.created_at >= ?'; params.push(from); }
    if (to) { where += ' AND wm.created_at <= ?'; params.push(to + ' 23:59:59'); }

    const offset = (page - 1) * limit;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM whatsapp_messages wm WHERE ${where}`, params);
    const [rows] = await pool.query(
      `SELECT wm.*, u.name as customer_name FROM whatsapp_messages wm
       LEFT JOIN users u ON u.id = wm.customer_id
       WHERE ${where} ORDER BY wm.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({ success: true, data: rows, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

// ─── STATS ──────────────────────────────────────────────
exports.stats = async (req, res, next) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'sent') as sent,
        SUM(status = 'delivered') as delivered,
        SUM(status = 'failed') as failed,
        SUM(status = 'pending') as pending,
        SUM(DATE(created_at) = CURDATE()) as today
      FROM whatsapp_messages
    `);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

// Export helper for use in other controllers
exports._sendWhatsAppMessage = sendWhatsAppMessage;

// ─── TEMPLATES MANAGEMENT (v2_whatsapp_templates) ───────
exports.listTemplates = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM v2_whatsapp_templates ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List templates error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { message_body, is_active, provider_template_name, provider_language, send_sms } = req.body;

    const [existing] = await pool.query('SELECT id FROM v2_whatsapp_templates WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Template not found' });

    const updates = []; const params = [];
    if (message_body !== undefined) { updates.push('message_body = ?'); params.push(message_body); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (provider_template_name !== undefined) { updates.push('provider_template_name = ?'); params.push(provider_template_name || null); }
    if (provider_language !== undefined) { updates.push('provider_language = ?'); params.push(provider_language || 'en'); }
    if (send_sms !== undefined) { updates.push('send_sms = ?'); params.push(send_sms ? 1 : 0); }

    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields provided' });
    params.push(id);

    await pool.query(`UPDATE v2_whatsapp_templates SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Template updated successfully' });
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
};

exports.testSendTemplate = async (req, res) => {
  try {
    const { phone, template_id, variables = {} } = req.body;
    if (!phone || !template_id) {
      return res.status(400).json({ success: false, error: 'Phone and template_id are required' });
    }

    const [templates] = await pool.query('SELECT * FROM v2_whatsapp_templates WHERE id = ?', [template_id]);
    if (!templates.length) return res.status(404).json({ success: false, error: 'Template not found' });

    const tmpl = templates[0];
    let msgBody = tmpl.message_body;
    for (const [key, val] of Object.entries(variables)) {
      msgBody = msgBody.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(val));
    }

    const result = await sendWhatsAppMessage(phone, null, [], msgBody);
    res.json({ success: true, message: 'Test message dispatched', data: result, rendered_message: msgBody });
  } catch (err) {
    console.error('Test send template error:', err);
    res.status(500).json({ success: false, error: 'Failed to send test message' });
  }
};

// ─── RETRY NOTIFICATION ─────────────────────────────────
exports.retryNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM v2_notification_logs WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Notification log not found' });

    const log = rows[0];
    const messagingService = require('../services/messagingService');

    let result = { success: false };
    if (log.channel === 'sms' || log.channel === 'both') {
      result = await messagingService.sendSMS(log.mobile, process.env.MSG91_PROMO_TEMPLATE_ID || 'PROMO123', null, {
        content: log.message_body
      });
    } else {
      result = await sendWhatsAppMessage(log.mobile, null, [], log.message_body);
    }

    const newStatus = result.success ? 'sent' : 'failed';
    await pool.query(
      `UPDATE v2_notification_logs SET status = ?, attempts = attempts + 1, last_attempt_at = NOW(), response_data = ? WHERE id = ?`,
      [newStatus, JSON.stringify(result), id]
    );

    res.json({ success: true, message: `Notification retry ${newStatus}`, data: result });
  } catch (err) {
    console.error('Retry notification error:', err);
    res.status(500).json({ success: false, error: 'Retry attempt failed' });
  }
};


// ─── PROVIDER STATUS (admin) ────────────────────────────
exports.providerStatus = async (req, res) => {
  const base = messagingService.appBaseUrl();
  res.json({
    success: true,
    data: {
      connected: whatsapp.isConfigured(),
      mode: whatsapp.isConfigured() ? 'cloud_api' : 'queued',
      webhook_url: `${base}/api/whatsapp/webhook`,
      verify_token_set: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      app_secret_set: Boolean(process.env.WHATSAPP_APP_SECRET),
      required_env: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'],
    },
  });
};

// ─── META WEBHOOK: verification handshake (public) ──────
exports.webhookVerify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// ─── META WEBHOOK: incoming messages & delivery receipts (public, raw body) ──
exports.webhookReceive = async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  if (!whatsapp.verifySignature(raw, req.get('x-hub-signature-256'))) {
    return res.sendStatus(401);
  }
  // Meta expects a fast 200 — process after acknowledging
  res.sendStatus(200);

  try {
    const payload = JSON.parse(raw.toString('utf8') || '{}');
    const { messages, statuses } = whatsapp.parseWebhook(payload);

    for (const st of statuses) {
      const mapped = ['sent', 'delivered', 'read', 'failed'].includes(st.status) ? st.status : null;
      if (!mapped) continue;
      await pool.query(
        'UPDATE whatsapp_messages SET status = ?, error_message = COALESCE(?, error_message) WHERE provider_message_id = ?',
        [mapped, st.error || null, st.id]
      );
      await pool.query(
        "UPDATE v2_notification_logs SET status = ? WHERE channel = 'whatsapp' AND JSON_UNQUOTE(JSON_EXTRACT(response_data, '$.provider_message_id')) = ?",
        [mapped, st.id]
      );
    }

    for (const m of messages) {
      await whatsappBot.handleIncoming({ from: m.from, name: m.name, text: m.text, providerMessageId: m.id });
    }
  } catch (err) {
    console.error('[WA WEBHOOK] processing error:', err);
  }
};

// ─── INBOX (admin) ──────────────────────────────────────
exports.inbox = async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 50 } = req.query;
    let where = '1=1';
    const params = [];
    if (category && category !== 'all') { where += ' AND wi.category = ?'; params.push(category); }
    if (status && status !== 'all') { where += ' AND wi.status = ?'; params.push(status); }
    if (search) {
      where += ' AND (wi.phone LIKE ? OR wi.message_body LIKE ? OR u.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const offset = (Number(page) - 1) * Number(limit);

    const [rows] = await pool.query(
      `SELECT wi.*, u.name AS customer_name, u.mobile AS customer_mobile, h.name AS handled_by_name
       FROM whatsapp_inbox wi
       LEFT JOIN users u ON u.id = wi.customer_id
       LEFT JOIN users h ON h.id = wi.handled_by
       WHERE ${where} ORDER BY wi.received_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );
    const [counts] = await pool.query('SELECT category, status, COUNT(*) AS n FROM whatsapp_inbox GROUP BY category, status');
    res.json({ success: true, data: rows, counts });
  } catch (err) {
    console.error('WhatsApp inbox error:', err);
    res.status(500).json({ success: false, error: 'Failed to load inbox' });
  }
};

exports.updateInbox = async (req, res) => {
  try {
    const { status, category } = req.body;
    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (status === 'resolved') { updates.push('handled_by = ?', 'handled_at = NOW()'); params.push(req.user.id); }
    if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
    await pool.query(`UPDATE whatsapp_inbox SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    res.json({ success: true, message: 'Inbox item updated' });
  } catch (err) {
    console.error('Update inbox error:', err);
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
};

exports.replyInbox = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
    const [rows] = await pool.query('SELECT * FROM whatsapp_inbox WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    const item = rows[0];
    const result = await messagingService.sendWhatsApp(item.phone, 'staff_reply', { body: message }, { customer_id: item.customer_id, message_type: 'staff_reply' });
    await pool.query("UPDATE whatsapp_inbox SET status = 'resolved', handled_by = ?, handled_at = NOW() WHERE id = ?", [req.user.id, item.id]);
    res.json({
      success: true,
      data: result,
      message: result.status === 'sent' ? 'Reply sent on WhatsApp' : 'Reply queued — open the WhatsApp link to send it',
    });
  } catch (err) {
    console.error('Reply inbox error:', err);
    res.status(500).json({ success: false, error: 'Failed to send reply' });
  }
};

// Lets the admin test the auto-bot before the WhatsApp API is connected
exports.simulateIncoming = async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ success: false, error: 'Phone and message are required' });
    const result = await whatsappBot.handleIncoming({ from: phone, text: message, providerMessageId: null });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Simulate incoming error:', err);
    res.status(500).json({ success: false, error: 'Bot failed to process the message' });
  }
};

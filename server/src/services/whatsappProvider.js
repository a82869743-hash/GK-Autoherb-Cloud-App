/**
 * WhatsApp provider — Meta WhatsApp Cloud API.
 *
 * Everything in the app sends WhatsApp through this file. To go live, set in server/.env:
 *   WHATSAPP_ACCESS_TOKEN      permanent system-user token
 *   WHATSAPP_PHONE_NUMBER_ID   phone number id from Meta Business Manager
 *   WHATSAPP_VERIFY_TOKEN      any secret string, also entered in the Meta webhook settings
 *   WHATSAPP_APP_SECRET        app secret, used to verify webhook signatures (recommended)
 * and point the Meta webhook at  https://<your-domain>/api/whatsapp/webhook
 *
 * Until those are set the provider runs in "queued" mode: messages are stored with
 * a click-to-chat link so staff can still send them by hand from the admin panel.
 */
const crypto = require('crypto');

const API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v20.0';

function isConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** 10-digit Indian mobile → 91XXXXXXXXXX (Cloud API format, no plus sign). */
function normalizePhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  if (digits.length === 11 && digits.startsWith('0')) digits = '91' + digits.slice(1);
  return digits;
}

function clickToChatLink(phone, body) {
  return `https://api.whatsapp.com/send?phone=${normalizePhone(phone)}&text=${encodeURIComponent(body || '')}`;
}

async function post(payload) {
  const res = await fetch(`${API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  const id = data?.messages?.[0]?.id;
  if (id) return { success: true, status: 'sent', provider_message_id: id, response: data };
  return { success: false, status: 'failed', error: data?.error?.message || `HTTP ${res.status}`, response: data };
}

/**
 * Free-form text. Meta only delivers this inside the 24h customer-service window
 * (i.e. as a reply); business-initiated messages need an approved template.
 */
async function sendText(phone, body) {
  const to = normalizePhone(phone);
  if (!isConfigured()) {
    return { success: true, status: 'queued', mode: 'queued', wa_link: clickToChatLink(to, body) };
  }
  try {
    const result = await post({ to, type: 'text', text: { preview_url: true, body } });
    return { ...result, mode: 'cloud_api', wa_link: clickToChatLink(to, body) };
  } catch (err) {
    return { success: false, status: 'failed', mode: 'cloud_api', error: err.message, wa_link: clickToChatLink(to, body) };
  }
}

/**
 * Approved template message. `orderedParams` must follow the {{1}}, {{2}}… order of the
 * template registered with Meta (we use the `variables` order stored on the template row).
 */
async function sendTemplate(phone, providerTemplateName, language, orderedParams, fallbackBody) {
  const to = normalizePhone(phone);
  if (!isConfigured()) {
    return { success: true, status: 'queued', mode: 'queued', wa_link: clickToChatLink(to, fallbackBody) };
  }
  try {
    const components = orderedParams.length
      ? [{ type: 'body', parameters: orderedParams.map((p) => ({ type: 'text', text: String(p ?? '') })) }]
      : [];
    const result = await post({
      to,
      type: 'template',
      template: { name: providerTemplateName, language: { code: language || 'en' }, components },
    });
    return { ...result, mode: 'cloud_api', wa_link: clickToChatLink(to, fallbackBody) };
  } catch (err) {
    return { success: false, status: 'failed', mode: 'cloud_api', error: err.message, wa_link: clickToChatLink(to, fallbackBody) };
  }
}

/** Interactive quick-reply buttons (max 3) — used by the reminder bot inside the 24h window. */
async function sendButtons(phone, body, buttons) {
  const to = normalizePhone(phone);
  if (!isConfigured()) {
    return { success: true, status: 'queued', mode: 'queued', wa_link: clickToChatLink(to, body) };
  }
  try {
    const result = await post({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: { buttons: buttons.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } })) },
      },
    });
    return { ...result, mode: 'cloud_api' };
  } catch (err) {
    return { success: false, status: 'failed', mode: 'cloud_api', error: err.message };
  }
}

/**
 * One-time password via a Meta "Authentication" template (body {{1}} = code, plus the
 * copy-code button Meta requires on authentication templates).
 */
async function sendAuthOtp(phone, providerTemplateName, language, otp) {
  if (!isConfigured() || !providerTemplateName) return { success: false, status: 'skipped' };
  const to = normalizePhone(phone);
  try {
    return await post({
      to,
      type: 'template',
      template: {
        name: providerTemplateName,
        language: { code: language || 'en' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: String(otp) }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(otp) }] },
        ],
      },
    });
  } catch (err) {
    return { success: false, status: 'failed', error: err.message };
  }
}

/** Validates X-Hub-Signature-256 when WHATSAPP_APP_SECRET is configured. */
function verifySignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true;
  if (!signatureHeader || !rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureHeader));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Pulls incoming user messages and delivery statuses out of a Cloud API webhook payload.
 */
function parseWebhook(payload) {
  const messages = [];
  const statuses = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const names = Object.fromEntries((value.contacts || []).map((c) => [c.wa_id, c.profile?.name]));
      for (const m of value.messages || []) {
        let text = '';
        if (m.type === 'text') text = m.text?.body || '';
        else if (m.type === 'button') text = m.button?.text || m.button?.payload || '';
        else if (m.type === 'interactive') text = m.interactive?.button_reply?.id || m.interactive?.button_reply?.title || m.interactive?.list_reply?.id || '';
        else text = `[${m.type}]`;
        messages.push({ id: m.id, from: m.from, name: names[m.from] || null, text, type: m.type, timestamp: m.timestamp });
      }
      for (const s of value.statuses || []) {
        statuses.push({ id: s.id, status: s.status, recipient: s.recipient_id, error: s.errors?.[0]?.title });
      }
    }
  }
  return { messages, statuses };
}

module.exports = {
  isConfigured,
  normalizePhone,
  clickToChatLink,
  sendText,
  sendTemplate,
  sendButtons,
  sendAuthOtp,
  verifySignature,
  parseWebhook,
};

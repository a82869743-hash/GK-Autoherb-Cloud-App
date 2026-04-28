/**
 * ─── SEND TRANSACTIONAL SMS VIA 2FACTOR.IN ──────────────────
 * Sends a DLT-compliant transactional SMS for job card updates.
 *
 * API: GET https://2factor.in/API/R1/
 *   ?module=TRANS_SMS
 *   &apikey={MSG91_AUTH_KEY}
 *   &to={mobile}
 *   &from={MSG91_SENDER_ID}
 *   &msg={message}
 *
 * ENV required:
 *   MSG91_AUTH_KEY   — Your 2Factor.in API key
 *   MSG91_SENDER_ID  — Approved 6-char DLT sender ID
 *   APP_BASE_URL     — Base URL for tracking links
 *
 * ⚠️  Message MUST exactly match the approved DLT template.
 * Returns boolean: true on success, false on failure.
 * NEVER throws — safe for fire-and-forget usage.
 */

const axios = require('axios');

/**
 * Send job card SMS notification via 2Factor.in
 * @param {string} mobile — 10-digit Indian mobile number (no country code)
 * @param {string|number} jobId — Job card ID
 * @returns {Promise<boolean>}
 */
async function sendSms(mobile, jobId) {
  const apiKey = process.env.MSG91_AUTH_KEY;
  const sender = process.env.MSG91_SENDER_ID || 'GKAHER';
  const baseUrl = process.env.APP_BASE_URL || 'https://gkautobook.cloud';

  if (!apiKey) {
    console.log(`[DEV SMS] To: ${mobile} | JobId: ${jobId} (API key not set)`);
    return false;
  }

  // ⚠️ DLT template — must match EXACTLY what is registered on DLT portal
  const message = `GK AutoHerb: Your job card ${jobId} is ready. Track here ${baseUrl}/job/${jobId}`;

  try {
    const response = await axios.get('https://2factor.in/API/R1/', {
      params: {
        module: 'TRANS_SMS',
        apikey: apiKey,
        to: mobile,
        from: sender,
        msg: message,
      },
      timeout: 10000,
    });

    if (response.data && response.data.Status === 'Success') {
      console.log(`SMS SENT SUCCESS — Mobile: ${mobile} | JobId: ${jobId} | SessionId: ${response.data.Details}`);
      return true;
    } else {
      console.error(`SMS FAILED — Mobile: ${mobile} | JobId: ${jobId} | Response:`, response.data);
      return false;
    }
  } catch (err) {
    console.error(`SMS FAILED — Mobile: ${mobile} | JobId: ${jobId} | Error:`, err.response?.data || err.message);
    return false;
  }
}

module.exports = sendSms;

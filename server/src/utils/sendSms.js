/**
 * ─── SEND TRANSACTIONAL SMS VIA 2FACTOR.IN ──────────────────
 * Sends a transactional SMS to an Indian mobile number
 * using the 2Factor transactional SMS API (R1 endpoint).
 *
 * API: GET https://2factor.in/API/R1/
 *   ?module=TRANS_SMS
 *   &apikey={API_KEY}
 *   &to={mobile}
 *   &from={SENDER_ID}
 *   &msg={message}
 *
 * ENV required:
 *   TWOFACTOR_API_KEY  — Your 2Factor.in API key
 *   TWOFACTOR_SENDER   — Approved 6-char sender ID (default: GKAHER)
 *
 * ⚠️  If API key is missing → logs to console (dev mode)
 * ⚠️  If API call fails → logs error, returns { success: false }
 *     NEVER throws — safe for fire-and-forget usage
 */

const axios = require('axios');

const TWOFACTOR_R1 = 'https://2factor.in/API/R1/';

/**
 * Send a transactional SMS via 2Factor.in
 * @param {string} mobile  — 10-digit Indian mobile number (no country code)
 * @param {string} message — SMS body text
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function sendSms(mobile, message) {
  const apiKey = process.env.TWOFACTOR_API_KEY;
  const sender = process.env.TWOFACTOR_SENDER || 'GKAHER';

  // ── Dev mode: no API key → log to console ────────
  if (!apiKey) {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║  [DEV SMS] To: ${mobile}`);
    console.log(`║  Message: ${message.substring(0, 60)}...`);
    console.log(`║  2Factor API key not configured`);
    console.log(`╚══════════════════════════════════════════╝\n`);
    return { success: true, mocked: true };
  }

  try {
    const response = await axios.get(TWOFACTOR_R1, {
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
      console.log(`[2Factor SMS] ✓ Sent to ${mobile} | SessionId: ${response.data.Details}`);
      return { success: true, data: response.data };
    } else {
      console.error(`[2Factor SMS] ✗ Unexpected response for ${mobile}:`, response.data);
      return { success: false, error: response.data?.Details || 'Unexpected response' };
    }
  } catch (err) {
    const errMsg = err.response?.data?.Details || err.response?.data?.Status || err.message;
    console.error(`[2Factor SMS] ✗ Failed to send to ${mobile}:`, errMsg);
    return { success: false, error: errMsg };
  }
}

module.exports = sendSms;

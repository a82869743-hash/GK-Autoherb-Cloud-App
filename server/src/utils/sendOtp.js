/**
 * ─── SEND OTP VIA 2FACTOR.IN ────────────────────────────────
 * Sends a numeric OTP to a 10-digit Indian mobile number
 * using the 2Factor transactional OTP API.
 *
 * API: GET https://2factor.in/API/V1/{API_KEY}/SMS/{mobile}/{otp}
 *
 * ENV required:
 *   TWOFACTOR_API_KEY — Your 2Factor.in API key
 *
 * ⚠️  If API key is missing → logs to console (dev mode)
 * ⚠️  If API call fails → logs error, returns { success: false }
 *     NEVER throws — safe for fire-and-forget usage
 */

const axios = require('axios');

const TWOFACTOR_BASE = 'https://2factor.in/API/V1';

/**
 * Send OTP via 2Factor.in SMS
 * @param {string} mobile  — 10-digit Indian mobile number (no country code)
 * @param {string} otp     — Numeric OTP string (e.g. "4829")
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function sendOtp(mobile, otp) {
  const apiKey = process.env.TWOFACTOR_API_KEY;

  // ── Dev mode: no API key → log to console ────────
  if (!apiKey) {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║  [DEV] OTP for ${mobile}: ${otp}              ║`);
    console.log(`║  2Factor API key not configured           ║`);
    console.log(`╚══════════════════════════════════════════╝\n`);
    return { success: true, mocked: true };
  }

  try {
    const url = `${TWOFACTOR_BASE}/${apiKey}/SMS/${mobile}/${otp}`;
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data && response.data.Status === 'Success') {
      console.log(`[2Factor OTP] ✓ Sent to ${mobile} | SessionId: ${response.data.Details}`);
      return { success: true, data: response.data };
    } else {
      console.error(`[2Factor OTP] ✗ Unexpected response for ${mobile}:`, response.data);
      return { success: false, error: response.data?.Details || 'Unexpected response' };
    }
  } catch (err) {
    const errMsg = err.response?.data?.Details || err.response?.data?.Status || err.message;
    console.error(`[2Factor OTP] ✗ Failed to send to ${mobile}:`, errMsg);
    return { success: false, error: errMsg };
  }
}

module.exports = sendOtp;

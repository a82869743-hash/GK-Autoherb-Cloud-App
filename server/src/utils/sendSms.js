/**
 * ─── SEND TRANSACTIONAL SMS VIA 2FACTOR.IN ──────────────────
 * Production-ready DLT-compliant transactional SMS for job card updates.
 */

const axios = require('axios');

/**
 * Send job card SMS notification via 2Factor.in
 * @param {string|number} mobile — Indian mobile number (will be formatted to 91XXXXXXXXXX)
 * @param {string|number} jobId — Job card ID
 * @returns {Promise<boolean>}
 */
async function sendJobCardSMS(mobile, jobId) {
  const apiKey = process.env.MSG91_AUTH_KEY;
  const sender = process.env.MSG91_SENDER_ID || 'GKAUTO';
  const baseUrl = process.env.APP_BASE_URL || 'https://gkautobook.cloud';

  if (!apiKey) {
    console.log(`[DEV SMS] To: ${mobile} | JobId: ${jobId} (API key not set)`);
    return false;
  }

  // 1. Validate & Format Phone Number
  let cleanMobile = String(mobile).replace(/\D/g, '');
  if (cleanMobile.length === 10) {
    cleanMobile = '91' + cleanMobile;
  } else if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
    // Already correct
  } else {
    console.error(`[SMS FAILED] Invalid mobile number format: ${mobile}`);
    return false;
  }

  // 2. Validate Variables
  if (!jobId) {
    console.error('[SMS FAILED] Missing Job ID');
    return false;
  }

  const trackingUrl = `${baseUrl}/job/${jobId}`;
  
  // 3. Build API Payload
  const url = `https://2factor.in/API/V1/${apiKey}/ADDON_SERVICES/SEND/TSMS`;
  const payload = {
    From: sender,
    To: cleanMobile,
    TemplateName: 'GK_JOB_ALERT',
    VAR1: String(jobId),
    VAR2: trackingUrl
  };

  // 4. Send API Request with Retry Logic
  let attempt = 0;
  const maxRetries = 2;

  while (attempt <= maxRetries) {
    try {
      const response = await axios.post(url, payload, { timeout: 10000 });

      if (response.data && response.data.Status === 'Success') {
        console.log(`[SMS SUCCESS] Mobile: ${cleanMobile} | JobId: ${jobId} | SessionId: ${response.data.Details}`);
        return true;
      } else {
        console.error(`[SMS FAILED] API Error (Attempt ${attempt + 1}):`, response.data);
        
        // Do not retry if DLT rejection (it will always fail)
        if (JSON.stringify(response.data).includes('DLT-CNT-REJECT')) {
          console.error('[SMS FATAL] DLT Content Rejection! Check Template mapping.');
          return false;
        }
      }
    } catch (err) {
      console.error(`[SMS ERROR] Request Failed (Attempt ${attempt + 1}):`, err.response?.data || err.message);
    }
    
    attempt++;
    if (attempt <= maxRetries) {
      console.log(`[SMS RETRY] Retrying in 2 seconds...`);
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  return false;
}

module.exports = sendJobCardSMS;

/**
 * ─── SEND TRANSACTIONAL SMS VIA 2FACTOR.IN ──────────────────
 * Production-ready DLT-compliant transactional SMS for job card updates.
 * DEBUG MODE ENABLED
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
    console.log(`[DEBUG SMS] To: ${mobile} | JobId: ${jobId} (API key not set)`);
    return false;
  }

  // 1. Validate & Format Phone Number
  let cleanMobile = String(mobile).replace(/\D/g, '');
  if (cleanMobile.length === 10) {
    cleanMobile = '91' + cleanMobile;
  } else if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
    // Already correct
  } else {
    console.error(`[DEBUG SMS FAILED] Invalid mobile number format: ${mobile}`);
    return false;
  }

  if (!jobId) {
    console.error('[DEBUG SMS FAILED] Missing Job ID');
    return false;
  }

  const trackingUrl = `${baseUrl}/job/${jobId}`;
  
  // 3. Build CORRECT API Endpoint & Payload
  // ✅ Correct Endpoint: /ADDON_SERVICES/SEND/TSMS
  const url = `https://2factor.in/API/V1/${apiKey}/ADDON_SERVICES/SEND/TSMS`;
  const payload = {
    From: sender,
    To: cleanMobile,
    TemplateName: 'GK_JOB_ALERT',
    VAR1: String(jobId),
    VAR2: trackingUrl
  };

  console.log('\n=============================================');
  console.log('🔹 DEBUG SMS REQUEST DETAILS');
  console.log('=============================================');
  console.log('Endpoint URL:', url.replace(apiKey, 'HIDDEN_API_KEY'));
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('Headers: Content-Type: application/json');
  console.log('=============================================\n');

  // 4. Send API Request
  let attempt = 0;
  const maxRetries = 2;

  while (attempt <= maxRetries) {
    try {
      const response = await axios.post(url, payload, { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000 
      });

      console.log(`[DEBUG SMS RESPONSE - Attempt ${attempt + 1}]`);
      console.log('Status Code:', response.status);
      console.log('Response Body:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.Status === 'Success') {
        console.log(`✅ [SMS API SUCCESS] Mobile: ${cleanMobile} | JobId: ${jobId}`);
        return true;
      } else {
        console.error(`❌ [SMS FAILED] API rejected payload:`, response.data);
        
        if (JSON.stringify(response.data).includes('DLT-CNT-REJECT')) {
          console.error('❌ [FATAL] DLT Content Rejection! API is correct, but telecom operator scrub failed.');
          return false;
        }
      }
    } catch (err) {
      console.error(`❌ [SMS ERROR] Request Failed (Attempt ${attempt + 1}):`);
      if (err.response) {
        console.error('Error Status:', err.response.status);
        console.error('Error Data:', err.response.data);
      } else {
        console.error('Error Message:', err.message);
      }
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

require('dotenv').config();

async function testSMS() {
  const apiKey = process.env.MSG91_AUTH_KEY || process.env.TWOFACTOR_API_KEY;
  if (!apiKey) {
    console.error('MSG91_AUTH_KEY or TWOFACTOR_API_KEY not configured in .env');
    return;
  }
  const url = `https://2factor.in/API/V1/${apiKey}/ADDON_SERVICES/SEND/TSMS`;

  const payloads = [
    {
      label: 'With Full Tracking URL',
      data: { From: 'GKAUTO', To: '918238538098', TemplateName: 'GK_JOB_ALERT', VAR1: '9', VAR2: 'https://gkautobook.cloud/job/9' }
    },
    {
      label: 'With Short URL',
      data: { From: 'GKAUTO', To: '918238538098', TemplateName: 'GK_JOB_ALERT', VAR1: '9', VAR2: 'gkautobook.cloud' }
    },
    {
      label: 'With Simple Text',
      data: { From: 'GKAUTO', To: '918238538098', TemplateName: 'GK_JOB_ALERT', VAR1: '9', VAR2: 'ready' }
    }
  ];

  for (const item of payloads) {
    try {
      console.log(`\nTesting: ${item.label}`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
      const data = await res.json();
      console.log('Result:', data);
    } catch(e) {
      console.log('Error:', e.message);
    }
  }
}
testSMS();

async function testSMS() {
  const apiKey = '53af389f-418d-11f1-9800-0200cd936042';
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

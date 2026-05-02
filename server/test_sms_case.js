async function test() {
  const url = `https://2factor.in/API/V1/53af389f-418d-11f1-9800-0200cd936042/ADDON_SERVICES/SEND/TSMS`;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ From: 'GKAUTO', To: '918238538098', TemplateName: 'GK_JOB_ALERT_V2', var1: '14', var2: 'https://test.com/14' }) });
    const data = await res.json();
    console.log('Lowercase vars:', data);
  } catch(e) { console.log('Lower error', e.message); }
  
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ From: 'GKAUTO', To: '918238538098', TemplateName: 'GK_JOB_ALERT_V2', VAR1: '15', VAR2: 'https://test.com/15' }) });
    const data = await res.json();
    console.log('Uppercase vars:', data);
  } catch(e) { console.log('Upper error', e.message); }
}
test();

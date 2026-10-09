require('dotenv').config();

async function test() {
  const apiKey = process.env.MSG91_AUTH_KEY || process.env.TWOFACTOR_API_KEY;
  if (!apiKey) {
    console.error('MSG91_AUTH_KEY or TWOFACTOR_API_KEY not configured in .env');
    return;
  }
  const url = `https://2factor.in/API/R1/?module=TRANS_SMS&apikey=${apiKey}&to=918238538098&from=GKAUTO&msg=GK AutoHerb: Your job card 13 is ready. Track here https://gkautobook.cloud/job/13`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('R1 result:', data);
  } catch(e) { console.log('R1 error', e.message); }
}
test();

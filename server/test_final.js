const sendSms = require('./src/utils/sendSms');
async function test() {
  process.env.MSG91_AUTH_KEY = '53af389f-418d-11f1-9800-0200cd936042';
  process.env.APP_BASE_URL = 'https://gkautobook.cloud';
  process.env.MSG91_SENDER_ID = 'GKAUTO';
  
  await sendSms('918238538098', 16);
}
test();

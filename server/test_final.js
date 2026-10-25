require('dotenv').config();
const sendSms = require('./src/utils/sendSms');
async function test() {
  process.env.APP_BASE_URL = process.env.APP_BASE_URL || 'https://gkautobook.cloud';
  process.env.MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'GKAUTO';
  
  await sendSms('918238538098', 16);
}
test();

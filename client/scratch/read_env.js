const fs = require('fs');
const dotenv = require('/root/app/server/node_modules/dotenv');

try {
  const envConfig = dotenv.parse(fs.readFileSync('/root/app/server/.env'));
  console.log("RAZORPAY_KEY_ID:", envConfig.RAZORPAY_KEY_ID);
  console.log("RAZORPAY_KEY_SECRET exists:", !!envConfig.RAZORPAY_KEY_SECRET);
} catch (err) {
  console.error(err);
}

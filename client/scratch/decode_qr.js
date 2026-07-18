const fs = require('fs');
const QrCode = require('qrcode-reader');
const jimp = require('jimp');

async function main() {
  const Jimp = jimp.Jimp || jimp;
  const image = await Jimp.read('/var/www/gkauto/qr.jpg');
  const qr = new QrCode();
  qr.callback = function(err, value) {
    if (err) {
      console.error(err);
      return;
    }
    console.log("QR Code decoded URL:", value.result);
  };
  qr.decode(image.bitmap);
}
main().catch(console.error);

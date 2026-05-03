const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const cmd = "mysql -u root -p1234 gk_autoherb -e \"ALTER TABLE manual_bills ADD COLUMN status ENUM('paid','voided','cancelled') NOT NULL DEFAULT 'paid' AFTER payment_method;\" 2>&1";
  c.exec(cmd, (err, stream) => {
    if (err) { console.error(err); c.end(); return; }
    stream.on('close', () => c.end())
      .on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });

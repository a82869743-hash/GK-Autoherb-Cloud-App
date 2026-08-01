const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = 'mysql -u root -p1234 gk_autoherb -e "ALTER TABLE product_orders ADD COLUMN notes TEXT NULL AFTER shipping_address;"';
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('ALTER TABLE product_orders ADD COLUMN notes completed with code:', code);
      conn.end();
    }).on('data', (d) => process.stdout.write(d.toString()))
      .stderr.on('data', (d) => process.stderr.write(d.toString()));
  });
}).connect({
  host: '187.127.151.21',
  port: 22,
  username: 'root',
  password: 'AryanSingh123@'
});

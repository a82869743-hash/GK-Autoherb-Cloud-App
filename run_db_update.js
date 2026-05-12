const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(`
    mysql -u root -p"1234" gk_autoherb -e "ALTER TABLE bookings ADD COLUMN completed_at DATETIME NULL;"
    mysql -u root -p"1234" gk_autoherb -e "ALTER TABLE services ADD COLUMN price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;"
    mysql -u root -p"1234" gk_autoherb -e "ALTER TABLE package_usage ADD COLUMN reserved_at DATETIME NULL;"
  `, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('DB updates finished.');
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '187.127.151.21',
  port: 22,
  username: 'root',
  password: 'AryanSingh123@'
});

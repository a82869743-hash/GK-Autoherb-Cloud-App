const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec('mysql -u root -p"1234" gk_autoherb -e "DESCRIBE user_packages;"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => c.end())
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });

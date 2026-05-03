const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const cmd = 'cd /root/app && git pull origin main && cd client && npm run build && cp -r dist/* /var/www/gkauto/ && chown -R www-data:www-data /var/www/gkauto && cd /root/app && pm2 restart all';
  c.exec(cmd, (err, stream) => {
    if (err) { console.error(err); c.end(); return; }
    stream.on('close', () => c.end())
      .on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });

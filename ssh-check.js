const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const code = `
    const http = require('http');
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: 4, role: 'admin' }, 'supersecret123', { expiresIn: '1d' });
    
    http.get({
      hostname: 'localhost',
      port: 5000,
      path: '/api/staff',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', data);
        process.exit(0);
      });
    }).on('error', (err) => {
      console.error(err);
      process.exit(1);
    });
  `;
  c.exec(`cd /root/app/server && node -e "${code.replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => c.end())
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });

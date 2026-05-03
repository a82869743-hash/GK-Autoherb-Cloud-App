const http = require('http');
const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec('mysql -u root -p"1234" gk_autoherb -N -e "SELECT password FROM users WHERE role=\'admin\' LIMIT 1;"', (err, stream) => {
    let token = '';
    stream.on('data', d => token += d.toString().trim());
    stream.on('close', () => {
      c.exec('curl -s -H "Authorization: Bearer ' + token + '" http://localhost:5000/api/packages/requests', (e, s) => {
        s.on('data', chunk => console.log(chunk.toString()));
        s.on('close', () => c.end());
      });
    });
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });

const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec('curl -s -H "Authorization: Bearer $(mysql -u root -p\\"1234\\" gk_autoherb -N -e \\"SELECT token FROM some_where?\\")" ... wait, I can just write a quick express script or use the same query', (err, stream) => {
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });

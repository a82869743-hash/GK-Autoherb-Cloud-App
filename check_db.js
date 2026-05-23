const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const query = `
    SELECT p.name, ps.total_count, s.name as service_name 
    FROM packages p 
    LEFT JOIN package_services ps ON p.id = ps.package_id 
    LEFT JOIN services s ON ps.service_id = s.id 
    WHERE p.is_active = 1;
  `;
  c.exec('mysql -u root -p"1234" gk_autoherb -e "' + query + '"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => c.end())
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });

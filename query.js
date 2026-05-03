const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec(`mysql -u root -p"1234" gk_autoherb -e "
      SELECT pr.*, u.name as customer_name, u.mobile as customer_mobile,
             v.registration_no, v.brand, v.model,
             p.name as package_name
      FROM package_requests pr
      JOIN users u ON pr.customer_id = u.id
      JOIN vehicles v ON pr.vehicle_id = v.id
      JOIN packages p ON pr.package_id = p.id
      ORDER BY pr.created_at DESC"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => c.end())
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });

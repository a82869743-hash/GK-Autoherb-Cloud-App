const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const code = `
    const pool = require('/root/app/server/src/config/db.js');
    pool.query('SELECT id, status, completed_at FROM job_carts').then(([rows]) => {
      console.log(rows);
      process.exit(0);
    }).catch(console.error);
  `;
  c.exec(`node -e "${code.replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => c.end())
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });

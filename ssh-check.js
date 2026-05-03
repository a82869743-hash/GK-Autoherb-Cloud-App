const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const code = `
    const pool = require('/root/app/server/src/config/db.js');
    (async () => {
      try {
        const [pkg] = await pool.query("SHOW CREATE TABLE packages");
        console.log(pkg[0]['Create Table']);
        const [cpkg] = await pool.query("SHOW CREATE TABLE customer_packages");
        console.log(cpkg[0]['Create Table']);
        const [veh] = await pool.query("SHOW CREATE TABLE vehicles");
        console.log(veh[0]['Create Table']);
        process.exit(0);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    })();
  `;
  c.exec(`node -e "${code.replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => c.end())
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });

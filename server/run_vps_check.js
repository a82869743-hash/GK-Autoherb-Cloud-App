const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS');
  
  const scriptContent = `
    const mysql = require('mysql2/promise');
    (async () => {
      try {
        const conn = await mysql.createConnection({
          host: 'localhost',
          user: 'root',
          password: '1234',
          database: 'gk_autoherb'
        });
        
        const [svcs] = await conn.query("SELECT id, name FROM services");
        console.log("=== SERVICES ===");
        console.log(svcs.map(s => \`\${s.id}: \${s.name}\`).join('\\n'));
        
        const [pkgs] = await conn.query("SELECT id, name, paid_wash_count, wash_count, wax_count FROM packages");
        console.log("=== PACKAGES ===");
        console.log(pkgs.map(p => \`\${p.id}: \${p.name} (paid: \${p.paid_wash_count}, wash: \${p.wash_count}, wax: \${p.wax_count})\`).join('\\n'));

        process.exit(0);
      } catch (e) {
        console.error(e);
        process.exit(1);
      }
    })();
  `;

  conn.exec(`cat << 'EOF' > /root/app/server/vps_db_check.js\n${scriptContent}\nEOF\nnode /root/app/server/vps_db_check.js\nrm /root/app/server/vps_db_check.js\n`, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', () => {
      console.log('Result:\n', out);
      conn.end();
    }).on('data', (d) => {
      out += d;
    }).stderr.on('data', (d) => {
      console.error('STDERR:', d.toString());
    });
  });
}).connect({
  host: '187.127.151.21',
  port: 22,
  username: 'root',
  password: 'AryanSingh123@'
});

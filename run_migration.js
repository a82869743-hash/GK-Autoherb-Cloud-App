const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const cmds = [
    // 1. Add 'cancelled' to job_carts status enum
    "ALTER TABLE job_carts MODIFY COLUMN status ENUM('draft','open','complete','cancelled') NOT NULL DEFAULT 'draft'",
    // 2. Verify manual_bills status column exists
    "SHOW COLUMNS FROM manual_bills LIKE 'status'",
  ];
  const sql = cmds.join('; ');
  const cmd = `mysql -u root -p1234 gk_autoherb -e "${sql}" 2>&1`;
  c.exec(cmd, (err, stream) => {
    if (err) { console.error(err); c.end(); return; }
    stream.on('close', () => c.end())
      .on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });

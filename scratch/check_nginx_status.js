const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS');
  
  const checkScript = `
    echo "=== 1. Git Commit on Server ==="
    cd /root/app && git log -1 --oneline

    echo ""
    echo "=== 2. Nginx Status ==="
    systemctl status nginx | grep -E "Active|Loaded"

    echo ""
    echo "=== 3. Nginx Web Root Files (/var/www/gkauto) ==="
    ls -la /var/www/gkauto

    echo ""
    echo "=== 4. PM2 Backend Status ==="
    pm2 status

    echo ""
    echo "=== 5. Nginx Config Test ==="
    nginx -t
  `;
  
  conn.exec(checkScript, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Check finished :: code: ' + code);
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err.message);
}).connect({
  host: '154.201.2.148',
  port: 22,
  username: 'root',
  password: 'Password@123',
  readyTimeout: 30000
});

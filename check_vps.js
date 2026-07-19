const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS');
  
  const script = `
    echo "=== PM2 Error Logs ==="
    tail -n 50 /root/.pm2/logs/gk-backend-error.log || pm2 logs gk-backend --lines 50 --no-colors

    echo ""
    echo "=== Columns in packages table ==="
    mysql -u root -p1234 gk_autoherb -e "SHOW COLUMNS FROM packages;" 2>/dev/null

    echo ""
    echo "=== Columns in user_packages table ==="
    mysql -u root -p1234 gk_autoherb -e "SHOW COLUMNS FROM user_packages;" 2>/dev/null

    echo ""
    echo "=== Done ==="
  `;
  
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Finished :: code: ' + code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write('' + data);
    }).stderr.on('data', (data) => {
      process.stderr.write('STDERR: ' + data);
    });
  });
}).connect({
  host: '187.127.151.21',
  port: 22,
  username: 'root',
  password: 'AryanSingh123@',
  readyTimeout: 99999,
  tryKeyboard: true,
  onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
    if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
      finish(['AryanSingh123@']);
    } else {
      finish([]);
    }
  }
});

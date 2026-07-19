const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS');
  
  const script = `
    echo "=== Current Nginx Config ==="
    cat /etc/nginx/sites-available/default 2>/dev/null || cat /etc/nginx/nginx.conf

    echo ""
    echo "=== Frontend files ==="
    ls -la /var/www/gkauto/ 2>/dev/null | head -10

    echo ""
    echo "=== PM2 status ==="
    pm2 list

    echo ""
    echo "=== Check Express static serving ==="
    grep -n "static\\|dist\\|client\\|build\\|index.html" /root/app/server/src/app.js || echo "No static serving found in app.js"

    echo ""
    echo "=== Check server.js ==="
    cat /root/app/server/src/server.js 2>/dev/null | head -30

    echo ""
    echo "=== Nginx enabled sites ==="
    ls -la /etc/nginx/sites-enabled/ 2>/dev/null

    echo ""
    echo "=== Test localhost:5000 ==="
    curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:5000/
    echo ""
    curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:5000/api/packages
    echo ""

    echo ""
    echo "=== PM2 logs (last 15 lines) ==="
    pm2 logs --nostream --lines 15

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

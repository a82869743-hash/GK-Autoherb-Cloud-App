const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS');
  
  const deployScript = `
    set -e
    echo "=== Updating code from git ==="
    cd /root/app
    git reset --hard
    git pull origin main
    
    echo "=== Updating backend dependencies ==="
    cd server
    npm install --legacy-peer-deps
    
    echo "=== Preserving server .env (DB password, 2FA, API keys) ==="
    # .env is gitignored so git pull won't touch it
    
    echo "=== Running DB migrations (add missing columns/tables) ==="
    node scripts/migrate_columns.js || echo "Migration script failed (non-fatal)"
    
    echo "=== Running price updates ==="
    node scripts/update_prices.js || echo "Price update script failed (non-fatal)"
    
    echo "=== Creating uploads directory ==="
    mkdir -p uploads/products
    chmod 755 uploads/products
    
    echo "=== Restarting backend ==="
    pm2 restart all || pm2 start src/server.js
    
    echo "=== Building frontend ==="
    cd ../client
    npm install --legacy-peer-deps
    npm run build
    
    echo "=== Deploying to Nginx ==="
    rm -rf /var/www/gkauto/*
    cp -r dist/* /var/www/gkauto/
    
    echo "=== Restarting Nginx ==="
    systemctl restart nginx
    
    echo "=== Deployment Complete! ==="
  `;
  
  conn.exec(deployScript, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Deploy finished :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
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

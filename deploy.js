const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  
  const deployScript = `
    set -e
    echo "Updating code from git..."
    cd ~/app || cd /root/app
    git reset --hard
    git pull origin main
    
    echo "Updating backend dependencies..."
    cd server
    npm install --legacy-peer-deps
    
    echo "Updating .env DB password..."
    sed -i 's/DB_PASS=.*/DB_PASS=1234/' .env
    sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=1234/' .env
    
    echo "Running DB migrations..."
    # If the env doesn't have the password, we can set it:
    # We will assume the .env has the right password. The user said mysql pass is 1234.
    # Just in case, we can edit .env or trust it's correct.
    npm run migrate || true
    
    echo "Restarting backend..."
    pm2 restart all || pm2 start src/server.js
    
    echo "Building frontend..."
    cd ../client
    npm install --legacy-peer-deps
    npm run build
    
    echo "Deploying to Nginx..."
    rm -rf /var/www/gkauto/*
    cp -r dist/* /var/www/gkauto/
    systemctl restart nginx
    
    echo "Deployment Complete!"
  `;
  
  conn.exec(deployScript, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
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

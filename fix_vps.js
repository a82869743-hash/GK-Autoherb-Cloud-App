const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS');
  
  const script = `
    set -e

    echo "=== Restoring proper Nginx config with SSL ==="
    cat > /etc/nginx/sites-available/gkauto << 'NGINXEOF'
server {
    server_name gkautobook.cloud www.gkautobook.cloud;

    root /var/www/gkauto;
    index index.html;

    # ─── Static assets (JS/CSS with hashed filenames) — long cache ───
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # ─── index.html — never cache (so new deploys are picked up) ───
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # ─── SPA fallback ───
    location / {
        try_files $uri $uri/ /index.html;
        # Never cache SPA HTML document under any path
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # ─── API proxy ───
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 10M;
    }

    # ─── Socket.io WebSocket proxy ───
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
    }

    # ─── Uploads proxy (product images served via Express static) ───
    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/gkautobook.cloud/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/gkautobook.cloud/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.gkautobook.cloud) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = gkautobook.cloud) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name gkautobook.cloud www.gkautobook.cloud;
    return 404; # managed by Certbot
}
NGINXEOF

    echo "=== Testing Nginx config ==="
    nginx -t

    echo "=== Restarting Nginx ==="
    systemctl restart nginx

    echo "=== Verifying ==="
    systemctl status nginx --no-pager -l | head -5
    curl -s -o /dev/null -w "HTTPS test -> HTTP %{http_code}" https://gkautobook.cloud/ 2>/dev/null || echo "HTTPS curl not available, testing locally"
    curl -s -o /dev/null -w "Local / -> HTTP %{http_code}" http://localhost/
    echo ""
    curl -s -o /dev/null -w "Local /api/packages -> HTTP %{http_code}" http://localhost/api/packages
    echo ""

    echo ""
    echo "=== SSL Nginx config restored successfully! ==="
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

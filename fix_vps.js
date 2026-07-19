const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS');
  
  const script = `
    echo "=== FIX 1: Add pickup_enabled to packages table ==="
    mysql -u root -p1234 gk_autoherb -e "
      ALTER TABLE packages ADD COLUMN pickup_enabled TINYINT(1) NOT NULL DEFAULT 0;
    " 2>/dev/null && echo "pickup_enabled column added" || echo "pickup_enabled may already exist"

    echo ""
    echo "=== FIX 2: Set pickup_enabled = 1 for Gold/Diamond/Platinum ==="
    mysql -u root -p1234 gk_autoherb -e "
      UPDATE packages SET pickup_enabled = 1 WHERE name LIKE '%Gold%' OR name LIKE '%Diamond%' OR name LIKE '%Platinum%';
    " 2>/dev/null && echo "pickup_enabled values updated" || echo "Failed to update pickup_enabled values"

    echo ""
    echo "=== FIX 3: Create v2_customer_addresses table ==="
    mysql -u root -p1234 gk_autoherb -e "
      CREATE TABLE IF NOT EXISTS v2_customer_addresses (
        id int unsigned NOT NULL AUTO_INCREMENT,
        customer_id int unsigned NOT NULL,
        address varchar(500) NOT NULL,
        landmark varchar(255) DEFAULT NULL,
        city varchar(100) NOT NULL,
        state varchar(100) NOT NULL,
        pincode varchar(20) NOT NULL,
        latitude decimal(10,8) DEFAULT NULL,
        longitude decimal(11,8) DEFAULT NULL,
        is_default tinyint(1) DEFAULT 0,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    " 2>/dev/null && echo "v2_customer_addresses table created" || echo "Failed to create v2_customer_addresses table"

    echo ""
    echo "=== Restart PM2 to pick up changes ==="
    pm2 restart all

    echo ""
    echo "=== ALL NEW DB FIXES APPLIED ==="
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

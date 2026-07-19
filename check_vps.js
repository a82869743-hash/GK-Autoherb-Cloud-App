const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS');
  
  const script = `
    echo "=== Inventory table ==="
    mysql -u root -p1234 gk_autoherb -e "SELECT id, product_name, selling_price, quantity, status FROM inventory WHERE is_deleted = 0 ORDER BY id;" 2>/dev/null

    echo ""
    echo "=== Bookings table columns ==="
    mysql -u root -p1234 gk_autoherb -e "SHOW COLUMNS FROM bookings;" 2>/dev/null

    echo ""
    echo "=== Check if pickup_type exists ==="
    mysql -u root -p1234 gk_autoherb -e "SELECT column_name FROM information_schema.columns WHERE table_schema='gk_autoherb' AND table_name='bookings' AND column_name='pickup_type';" 2>/dev/null

    echo ""
    echo "=== Inventory table columns ==="
    mysql -u root -p1234 gk_autoherb -e "SHOW COLUMNS FROM inventory;" 2>/dev/null

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

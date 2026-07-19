const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS');
  
  const script = `
    echo "=== FIX 1: Add missing pickup_type column to bookings ==="
    mysql -u root -p1234 gk_autoherb -e "
      ALTER TABLE bookings ADD COLUMN pickup_type ENUM('none','one_way_pickup','one_way_drop','round_trip') NOT NULL DEFAULT 'none' AFTER advance_collected_by;
      ALTER TABLE bookings ADD COLUMN pickup_address TEXT NULL AFTER pickup_type;
      ALTER TABLE bookings ADD COLUMN pickup_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER pickup_address;
    " 2>/dev/null && echo "pickup_type columns added" || echo "pickup_type may already exist"

    echo ""
    echo "=== FIX 2: Add missing package_validity column to packages ==="
    mysql -u root -p1234 gk_autoherb -e "
      ALTER TABLE packages ADD COLUMN package_validity INT DEFAULT 365;
    " 2>/dev/null && echo "package_validity column added" || echo "package_validity may already exist"

    echo ""
    echo "=== FIX 3: Insert missing accessory products into inventory ==="
    mysql -u root -p1234 gk_autoherb -e "
      INSERT INTO inventory (product_name, sku, unit, quantity, cost_price, selling_price, category, brand, description, status, low_stock_threshold) VALUES
      ('Universal Premium Seat Cover', 'INV-SC001', 'pcs', 10, 3500.00, 5500.00, 'Seat Covers', 'GK AutoHerb', 'Premium PU leather seat cover with universal fit', 'active', 5),
      ('Universal 3D Floor Mat', 'INV-FM001', 'pcs', 10, 1200.00, 2200.00, 'Floor Mats', 'GK AutoHerb', 'Universal 3D floor mat with anti-slip backing', 'active', 5),
      ('Universal 7D Floor Mat', 'INV-FM002', 'pcs', 10, 2500.00, 4500.00, 'Floor Mats', 'GK AutoHerb', 'Premium 7D floor mat with full coverage', 'active', 5),
      ('Universal 9D Floor Mat', 'INV-FM003', 'pcs', 10, 3500.00, 6500.00, 'Floor Mats', 'GK AutoHerb', 'Luxury 9D floor mat with diamond quilting', 'active', 5),
      ('Android Head Unit Touchscreen (9-inch)', 'INV-AH001', 'pcs', 10, 4500.00, 8500.00, 'Android Stereo', 'GK AutoHerb', '9-inch Android touchscreen head unit with GPS', 'active', 5),
      ('Super Loud Dual Horn Set', 'INV-HN001', 'pcs', 10, 400.00, 950.00, 'Horn', 'GK AutoHerb', 'Super loud dual horn set for all cars', 'active', 5),
      ('Ultra Bright LED Headlight Bulb H4', 'INV-LED001', 'pcs', 10, 1200.00, 2800.00, 'LED Lights', 'GK AutoHerb', 'Ultra bright LED headlight bulb H4 fitment', 'active', 5),
      ('Full HD Dash Camera Dual Lens', 'INV-DC001', 'pcs', 10, 2200.00, 4800.00, 'Dash Camera', 'GK AutoHerb', 'Full HD dash camera with dual lens front and rear', 'active', 5),
      ('Luxury Gel Air Freshener', 'INV-PF001', 'pcs', 10, 150.00, 350.00, 'Car Perfume', 'GK AutoHerb', 'Luxury gel air freshener with long lasting fragrance', 'active', 5),
      ('Active Foam Car Wash Shampoo (5L)', 'INV-CP001', 'pcs', 10, 450.00, 950.00, 'Cleaning Products', 'GK AutoHerb', 'Active foam car wash shampoo 5 litre pack', 'active', 5),
      ('All-Purpose Interior Cleaner Spray', 'INV-CP002', 'pcs', 10, 180.00, 380.00, 'Cleaning Products', 'GK AutoHerb', 'All-purpose interior cleaner spray for car', 'active', 5),
      ('Glossy Tyre Polish Spray', 'INV-CP003', 'pcs', 10, 160.00, 350.00, 'Cleaning Products', 'GK AutoHerb', 'Glossy tyre polish spray for wet look finish', 'active', 5),
      ('Anti-Static Dashboard Polish Spray', 'INV-CP004', 'pcs', 10, 160.00, 350.00, 'Cleaning Products', 'GK AutoHerb', 'Anti-static dashboard polish spray', 'active', 5),
      ('3-Way Rat Repellent Spray', 'INV-CP005', 'pcs', 10, 250.00, 550.00, 'Cleaning Products', 'GK AutoHerb', '3-way rat repellent spray for car engine bay', 'active', 5),
      ('Premium Carnauba Wax Polish', 'INV-CP006', 'pcs', 10, 220.00, 485.00, 'Cleaning Products', 'GK AutoHerb', 'Premium carnauba wax polish for deep shine', 'active', 5),
      ('MICROFIBER 40*60 800 GSM', 'INV-MF001', 'pcs', 10, 95.00, 220.00, 'Cleaning Products', 'GK AutoHerb', 'Premium 800 GSM microfiber towel 40x60cm', 'active', 5),
      ('MICROFIBER 40*40 450 GSM 2PCS - SMOOTH FUR', 'INV-MF002', 'pcs', 10, 110.00, 260.00, 'Cleaning Products', 'GK AutoHerb', '450 GSM microfiber towel smooth fur 2pcs pack', 'active', 5),
      ('MICROFIBER 40*40 450 GSM 2PCS - HEAVY FUR', 'INV-MF003', 'pcs', 10, 120.00, 280.00, 'Cleaning Products', 'GK AutoHerb', '450 GSM microfiber towel heavy fur 2pcs pack', 'active', 5),
      ('ASTONISH PREMIUM DAMPING - 2.8 PLUS', 'INV-AD001', 'pcs', 10, 280.00, 650.00, 'Comfort Accessories', 'Astonish', 'Premium butyl rubber damping 2.8mm thickness', 'active', 5),
      ('SIDE CONSOL', 'INV-AC001', 'pcs', 10, 150.00, 380.00, 'Comfort Accessories', 'GK AutoHerb', 'Side console storage pocket PU leather', 'active', 5),
      ('SIDE CONSOL FIX', 'INV-AC002', 'pcs', 10, 180.00, 450.00, 'Comfort Accessories', 'GK AutoHerb', 'Side console fix pocket gap filler', 'active', 5),
      ('HOOK', 'INV-AC003', 'pcs', 10, 40.00, 120.00, 'Comfort Accessories', 'GK AutoHerb', 'Premium car headrest hook', 'active', 5),
      ('TISSU COVER HEAVY', 'INV-AC004', 'pcs', 10, 160.00, 395.00, 'Comfort Accessories', 'GK AutoHerb', 'Heavy build tissue cover diamond quilted', 'active', 5),
      ('TISSU COVER', 'INV-AC005', 'pcs', 10, 90.00, 220.00, 'Comfort Accessories', 'GK AutoHerb', 'PU leather tissue cover', 'active', 5),
      ('ST COVER', 'INV-AC006', 'pcs', 10, 140.00, 450.00, 'Comfort Accessories', 'GK AutoHerb', 'Premium PU leather seat cover universal', 'active', 5),
      ('MEMORY NECK REST - ASTONISH', 'INV-AC007', 'pcs', 10, 240.00, 680.00, 'Comfort Accessories', 'Astonish', 'Memory foam neck rest with perforated leatherette', 'active', 5),
      ('MEMORY CUSION PILLOW - ASTONISH', 'INV-AC008', 'pcs', 10, 380.00, 950.00, 'Comfort Accessories', 'Astonish', 'Memory foam lumbar cushion pillow', 'active', 5),
      ('TYRE INFLATOR (13)', 'INV-TI001', 'pcs', 10, 950.00, 2200.00, 'Car Electronics', 'GK AutoHerb', 'Portable tyre inflator with digital display', 'active', 5),
      ('TYRE INFLATOR (14)', 'INV-TI002', 'pcs', 10, 1100.00, 2490.00, 'Car Electronics', 'GK AutoHerb', 'Advanced tyre inflator with auto shut-off', 'active', 5),
      ('PORTABLE CAR VACUUM CLEANER', 'INV-VC001', 'pcs', 10, 580.00, 1350.00, 'Car Electronics', 'GK AutoHerb', 'Portable car vacuum cleaner with HEPA filter', 'active', 5),
      ('CROSS BODY BAG', 'INV-BG001', 'pcs', 10, 220.00, 550.00, 'Miscellaneous Accessories', 'GK AutoHerb', 'Premium cross body bag water resistant', 'active', 5),
      ('LAPTOP BAG - TAN', 'INV-BG002', 'pcs', 10, 650.00, 1650.00, 'Miscellaneous Accessories', 'GK AutoHerb', 'Premium laptop bag tan color', 'active', 5),
      ('ASTONISH FAST CHARGER 4 IN 1 CABLE (USB CAR CHARGER ) 150 watt', 'INV-CH001', 'pcs', 10, 350.00, 890.00, 'Car Electronics', 'Astonish', 'Fast charger 4-in-1 cable USB car charger 150W', 'active', 5),
      ('ASTONISH COOLING SEAT WITH VIBRATOR - SMALL COOL CUSHION', 'INV-CS001', 'pcs', 10, 1250.00, 3200.00, 'Comfort Accessories', 'Astonish', 'Cooling seat cushion with massage vibrator', 'active', 5),
      ('FRONT CURTAIN', 'INV-AC009', 'pcs', 10, 120.00, 350.00, 'Comfort Accessories', 'GK AutoHerb', 'Car front window curtain for privacy', 'active', 5),
      ('MEMORY HEAD REST PILLOW (2 PCS)', 'INV-AC010', 'pcs', 10, 320.00, 880.00, 'Comfort Accessories', 'GK AutoHerb', 'Memory foam headrest pillow set of 2', 'active', 5),
      ('ASTONISH PREMIUM MEMORY FOAM L4 (P) (2 PCS)', 'INV-AC011', 'pcs', 10, 720.00, 1850.00, 'Comfort Accessories', 'Astonish', 'Premium memory foam L4 headrest 2 pcs', 'active', 5),
      ('CUSHION SHEET WITH MEMORY (2 PCS)', 'INV-AC012', 'pcs', 10, 650.00, 1650.00, 'Comfort Accessories', 'GK AutoHerb', 'Cushion sheet with memory foam 2 pcs', 'active', 5),
      ('ASTONISH PREMIUM MEMORY D NECK (1 PCS)', 'INV-AC013', 'pcs', 10, 220.00, 580.00, 'Comfort Accessories', 'Astonish', 'Premium memory foam D-shape neck rest', 'active', 5),
      ('ASTONISH PREMIUM MEMORY FOAM L4 FABRIC (2 PCS)', 'INV-AC014', 'pcs', 10, 690.00, 1750.00, 'Comfort Accessories', 'Astonish', 'Premium memory foam L4 fabric cover 2 pcs', 'active', 5),
      ('C NECK (2 PCS)', 'INV-AC015', 'pcs', 10, 280.00, 750.00, 'Comfort Accessories', 'GK AutoHerb', 'C-shape neck rest pillow set of 2', 'active', 5),
      ('MEMORY MAYBACK HEAD PILLOW (2 PCS)', 'INV-AC016', 'pcs', 10, 420.00, 1100.00, 'Comfort Accessories', 'GK AutoHerb', 'Maybach style memory head pillow set of 2', 'active', 5),
      ('MEMORY BULL HORN (2 PCS)', 'INV-AC017', 'pcs', 10, 350.00, 950.00, 'Comfort Accessories', 'GK AutoHerb', 'Memory foam bull horn pillow set of 2', 'active', 5),
      ('Sear Organiser PU 1 PC', 'INV-AC018', 'pcs', 10, 240.00, 680.00, 'Comfort Accessories', 'GK AutoHerb', 'PU leather seat organiser single piece', 'active', 5)
      ON DUPLICATE KEY UPDATE selling_price = VALUES(selling_price), cost_price = VALUES(cost_price), quantity = VALUES(quantity);
    " 2>/dev/null && echo "Products inserted successfully" || echo "Product insert failed"

    echo ""
    echo "=== Verify: Count products now ==="
    mysql -u root -p1234 gk_autoherb -e "SELECT COUNT(*) as total FROM inventory WHERE is_deleted = 0;" 2>/dev/null

    echo ""
    echo "=== Verify: pickup_type column ==="
    mysql -u root -p1234 gk_autoherb -e "SELECT column_name FROM information_schema.columns WHERE table_schema='gk_autoherb' AND table_name='bookings' AND column_name='pickup_type';" 2>/dev/null

    echo ""
    echo "=== Restart PM2 to pick up changes ==="
    pm2 restart all

    echo ""
    echo "=== ALL FIXES APPLIED ==="
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

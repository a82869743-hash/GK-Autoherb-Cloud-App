/**
 * Run Package System V2 migrations (052 + 053)
 * Usage: node run_migration_v2.js
 * Requires: .env with DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  console.log('✓ Connected to', process.env.DB_NAME);

  // --- Step 1: Schema migration (052) ---
  // We run it statement-by-statement to handle the DELIMITER issue
  console.log('\n━━━ Running 052_package_system_v2 ━━━');
  
  // a) Create the helper procedure
  await conn.query(`
    DROP PROCEDURE IF EXISTS _add_col_if_missing
  `);
  await conn.query(`
    CREATE PROCEDURE _add_col_if_missing(
      IN tbl VARCHAR(64), IN col VARCHAR(64), IN col_def VARCHAR(255)
    )
    BEGIN
      SET @q = CONCAT('ALTER TABLE \`', tbl, '\` ADD COLUMN \`', col, '\` ', col_def);
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
      ) THEN
        PREPARE stmt FROM @q;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
      END IF;
    END
  `);
  console.log('  ✓ Created helper procedure');

  // b) Add missing columns to packages
  await conn.query(`CALL _add_col_if_missing('packages', 'paid_wash_count', 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER wax_count')`);
  await conn.query(`CALL _add_col_if_missing('packages', 'sort_order', 'INT NOT NULL DEFAULT 0 AFTER visible_to_customer')`);
  console.log('  ✓ packages table updated');

  // c) Create package_pricing table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS package_pricing (
      id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      package_id   INT UNSIGNED NOT NULL,
      car_type     ENUM('SMALL_HATCHBACK','MEDIUM_HATCHBACK','SEDAN_SUV','PREMIUM_SEDAN','LARGE_CAR') NOT NULL,
      pricing_type ENUM('basic','premium') NOT NULL DEFAULT 'basic',
      price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
      UNIQUE KEY uq_pkg_car_pricing (package_id, car_type, pricing_type),
      INDEX idx_package_id (package_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  ✓ package_pricing table created');

  // d) Add columns to package_requests
  await conn.query(`CALL _add_col_if_missing('package_requests', 'pricing_type', "ENUM('basic','premium') NOT NULL DEFAULT 'basic' AFTER price")`);
  await conn.query(`CALL _add_col_if_missing('package_requests', 'car_type', 'VARCHAR(50) NULL AFTER pricing_type')`);
  console.log('  ✓ package_requests table updated');

  // e) Add columns to user_packages
  await conn.query(`CALL _add_col_if_missing('user_packages', 'pricing_type', "ENUM('basic','premium') NULL DEFAULT 'basic'")`);
  await conn.query(`CALL _add_col_if_missing('user_packages', 'car_type', 'VARCHAR(50) NULL')`);
  console.log('  ✓ user_packages table updated');

  // Cleanup
  await conn.query(`DROP PROCEDURE IF EXISTS _add_col_if_missing`);

  // --- Step 2: Seed data (053) ---
  console.log('\n━━━ Running 053_seed_packages_v2 ━━━');
  const seedSQL = fs.readFileSync(
    path.join(__dirname, 'migrations', '053_seed_packages_v2.sql'),
    'utf8'
  );
  await conn.query(seedSQL);
  console.log('  ✓ Seed data inserted');

  // Verify
  const [packages] = await conn.query(`SELECT id, name, paid_wash_count, sort_order, is_active FROM packages WHERE is_active = 1 ORDER BY sort_order`);
  console.log('\n━━━ Active Packages ━━━');
  packages.forEach(p => console.log(`  ${p.sort_order}. ${p.name} (id=${p.id}, paid_washes=${p.paid_wash_count})`));

  const [pricing] = await conn.query(`SELECT COUNT(*) as cnt FROM package_pricing`);
  console.log(`  Total pricing rows: ${pricing[0].cnt}`);

  const [services] = await conn.query(`
    SELECT p.name, COUNT(ps.id) as svc_count
    FROM packages p
    JOIN package_services ps ON ps.package_id = p.id
    WHERE p.is_active = 1
    GROUP BY p.id, p.name
    ORDER BY p.sort_order
  `);
  console.log('\n━━━ Complimentary Services ━━━');
  services.forEach(s => console.log(`  ${s.name}: ${s.svc_count} services`));

  await conn.end();
  console.log('\n✅ Migration complete!');
}

run().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});

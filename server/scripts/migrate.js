/**
 * GK AutoHerb — Database Migration Runner
 * Runs all SQL migration files in sequence.
 * Usage: node scripts/migrate.js
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function migrate() {
  // Connect without database first to create it if needed
  const initConn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME;
  await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await initConn.query(`USE \`${dbName}\``);
  console.log(`✓ Database "${dbName}" ready`);

  // Read and sort migration files
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`\nRunning ${files.length} migrations...\n`);

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8').trim();
    if (!sql) continue;

    try {
      await initConn.query(sql);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
      // Continue on duplicate table errors, fail on others
      if (!err.message.includes('already exists') && !err.message.includes('Duplicate') && !err.message.includes('DROP')) {
        await initConn.end();
        process.exit(1);
      }
    }
  }

  await initConn.end();
  console.log('\n✓ All migrations completed successfully.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

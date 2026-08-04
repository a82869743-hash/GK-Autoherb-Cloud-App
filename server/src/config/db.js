const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mysql = require('mysql2/promise');

// ─── Environment Safety Guard ───────────────────────
// Prevents local development servers from accidentally connecting
// to the production database, and vice versa.
const isProduction = process.env.NODE_ENV === 'production';
const dbHost = process.env.DB_HOST || 'localhost';
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];
const isLocalDB = LOCAL_HOSTS.includes(dbHost);

// GUARD 1: In development mode, ONLY allow localhost database
if (!isProduction && !isLocalDB) {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════╗');
  console.error('║  🚨 SAFETY BLOCK: CANNOT CONNECT TO REMOTE DATABASE!   ║');
  console.error('║                                                          ║');
  console.error(`║  DB_HOST = ${dbHost.padEnd(44)}║`);
  console.error('║  NODE_ENV = development                                  ║');
  console.error('║                                                          ║');
  console.error('║  You are running in DEVELOPMENT mode but your DB_HOST    ║');
  console.error('║  points to a REMOTE server. This is blocked to prevent   ║');
  console.error('║  accidental changes to the production database.          ║');
  console.error('║                                                          ║');
  console.error('║  FIX: Set DB_HOST=localhost in your server/.env file     ║');
  console.error('╚══════════════════════════════════════════════════════════╝');
  console.error('');
  process.exit(1);
}

// GUARD 2: In production mode, ensure NODE_ENV is explicitly set
if (isProduction && !process.env.NODE_ENV) {
  console.error('[FATAL] Production server must have NODE_ENV=production explicitly set.');
  process.exit(1);
}

// ─── Environment Banner ─────────────────────────────
console.log('');
if (isProduction) {
  console.log('┌─────────────────────────────────────────┐');
  console.log('│  🟢 PRODUCTION SERVER                   │');
  console.log(`│  Database: ${process.env.DB_NAME}@${dbHost}`.padEnd(42) + '│');
  console.log('└─────────────────────────────────────────┘');
} else {
  console.log('┌─────────────────────────────────────────┐');
  console.log('│  🔵 LOCAL DEVELOPMENT SERVER            │');
  console.log(`│  Database: ${process.env.DB_NAME}@${dbHost}`.padEnd(42) + '│');
  console.log('│  ⚠ Changes only affect LOCAL database   │');
  console.log('└─────────────────────────────────────────┘');
}
console.log('');

// ─── Validate required DB env vars ──────────────────
const requiredVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
for (const v of requiredVars) {
  if (!process.env[v]) {
    console.error(`[FATAL] Missing required environment variable: ${v}`);
    process.exit(1);
  }
}

const pool = mysql.createPool({
  host: dbHost,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+05:30',
  multipleStatements: true,
  // Resilience: auto-reconnect on idle disconnect
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
});

// Test connection on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query("SET time_zone = '+05:30'");
    console.log(`✓ MySQL connected: ${process.env.DB_NAME}@${dbHost} (Timezone set to IST +05:30)`);
    conn.release();
  } catch (err) {
    console.error('✗ MySQL connection failed:', err.message);
    console.error('  Check your DB_HOST, DB_USER, DB_PASSWORD, DB_NAME environment variables');
  }
})();

module.exports = pool;

const pool = require('./server/src/config/db');
async function run() {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('DESCRIBE bookings');
    console.log(rows);
  } finally {
    conn.release();
    process.exit(0);
  }
}
run();

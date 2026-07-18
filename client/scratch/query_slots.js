const pool = require('/root/app/server/src/config/db');
(async () => {
  try {
    const [rows] = await pool.query("SELECT * FROM slots WHERE slot_date = '2026-07-07'");
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

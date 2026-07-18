const pool = require('/root/app/server/src/config/db');
(async () => {
  try {
    const [rows] = await pool.query("SELECT * FROM v2_notification_logs WHERE reference_type = 'job_cart' AND reference_id = 11");
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

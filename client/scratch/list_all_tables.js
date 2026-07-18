const pool = require('/root/app/server/src/config/db');
(async () => {
  try {
    const [rows] = await pool.query("SHOW TABLES");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

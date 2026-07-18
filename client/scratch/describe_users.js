const pool = require('/root/app/server/src/config/db');
(async () => {
  try {
    const [columns] = await pool.query("DESCRIBE users");
    console.log(columns);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

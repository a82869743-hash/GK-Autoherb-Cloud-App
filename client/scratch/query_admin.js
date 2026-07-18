const pool = require('/root/app/server/src/config/db');
(async () => {
  try {
    const [rows] = await pool.query("SELECT id, name, mobile, email, role FROM users WHERE role = 'admin'");
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

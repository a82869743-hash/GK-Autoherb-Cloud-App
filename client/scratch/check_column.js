const pool = require('/root/app/server/src/config/db');
(async () => {
  try {
    const [rows] = await pool.query("DESCRIBE users");
    console.log(rows.filter(r => r.Field === 'base_salary' || r.Field === 'custom_role_id'));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

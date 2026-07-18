const pool = require('../server/src/config/db');

(async () => {
  try {
    // Update user_packages id 23 (Surya's Platinum package for GJ06RR1234)
    await pool.query(
      `UPDATE user_packages SET start_date = '2026-01-18 00:00:00', end_date = '2026-12-31 00:00:00' WHERE id = 23`
    );
    console.log('✓ Successfully updated start_date to 2026-01-18 and end_date to 2026-12-31 for user_package id 23.');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    const adminHash = await bcrypt.hash('admin123', 10);
    const testHash = await bcrypt.hash('test123', 10);

    // Update GK AutoHerb Owner password
    await conn.query(
      `UPDATE users SET password_hash = ? WHERE mobile = '9000000001'`,
      [adminHash]
    );
    console.log('✓ GK AutoHerb Owner password updated to: admin123');

    // Update other admins just in case
    await conn.query(
      `UPDATE users SET password_hash = ? WHERE role = 'admin' AND mobile IN ('8478399398', '8788998789', '9408424541')`,
      [adminHash]
    );
    console.log('✓ Other admin passwords updated to: admin123');

    // Update test customer password
    await conn.query(
      `UPDATE users SET password_hash = ? WHERE mobile = '9000000002'`,
      [testHash]
    );
    console.log('✓ Test Customer password updated to: test123');

    // Update test staff password
    await conn.query(
      `UPDATE users SET password_hash = ? WHERE mobile = '9000000003'`,
      [testHash]
    );
    console.log('✓ Test Staff password updated to: test123');

    await conn.end();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

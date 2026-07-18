const pool = require('/root/app/server/src/config/db');
(async () => {
  try {
    // 1. job cart 11
    console.log("--- 1. JOB CART 11 ---");
    const [carts] = await pool.query(`
      SELECT jc.*, v.registration_no, v.brand, v.model, v.customer_id,
             u.name AS customer_name, u.mobile AS customer_mobile, u.email AS customer_email
      FROM job_carts jc
      JOIN vehicles v ON jc.vehicle_id = v.id
      JOIN users u ON v.customer_id = u.id
      WHERE jc.id = 11
    `);
    console.log("Cart row count:", carts.length);
    if (carts.length > 0) {
      const cart = carts[0];
      const [services] = await pool.query('SELECT * FROM job_services WHERE job_cart_id = 11 ORDER BY id');
      const serviceIds = services.map(s => s.id);
      console.log("Services count:", services.length);
      console.log("Service IDs:", serviceIds);
    }

    // 2. messages log
    console.log("--- 2. MESSAGES LOG ---");
    const [messages] = await pool.query(`
      SELECT nl.id, nl.customer_id, nl.mobile, nl.channel, nl.template_name,
             nl.message_body, nl.message_body AS message_preview, nl.status,
             nl.attempts, nl.last_attempt_at, nl.response_data, nl.created_at AS sent_at,
             u.name AS customer_name 
      FROM v2_notification_logs nl
      LEFT JOIN users u ON nl.customer_id = u.id
      WHERE nl.reference_type = 'job_cart' AND nl.reference_id = 11
      ORDER BY nl.created_at DESC
    `);
    console.log("Messages count:", messages.length);

    // 3. services
    console.log("--- 3. SERVICES ---");
    const [servicesCatalog] = await pool.query('SELECT * FROM services');
    console.log("Services catalog count:", servicesCatalog.length);

    // 4. inventory
    console.log("--- 4. INVENTORY ---");
    const [inventory] = await pool.query('SELECT * FROM inventory LIMIT 500');
    console.log("Inventory count:", inventory.length);

    console.log("ALL QUERIES SUCCESSFUL!");
    process.exit(0);
  } catch (err) {
    console.error("FAILED WITH ERROR:", err);
    process.exit(1);
  }
})();

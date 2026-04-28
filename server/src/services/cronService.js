const cron = require('node-cron');
const pool = require('../config/db');
const messagingService = require('./messagingService');

/**
 * Initializes all cron jobs for the application.
 */
exports.initCronJobs = () => {
  // 1. Daily morning task: Send reminders for customers who haven't visited recently
  // Runs at 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running daily morning task: Service Reminders');
    try {
      // Find customers whose last service visit was exactly 90 days ago
      const [rows] = await pool.query(`
        SELECT v.id, v.brand, v.model, v.registration_no, u.mobile, u.name 
        FROM vehicles v
        JOIN users u ON v.customer_id = u.id
        JOIN job_carts jc ON jc.vehicle_id = v.id
        WHERE jc.status = 'complete'
          AND jc.completed_at = DATE_SUB(CURDATE(), INTERVAL 90 DAY)
          AND u.is_active = 1
          AND u.mobile IS NOT NULL
        GROUP BY v.id
      `);

      for (const vehicle of rows) {
        if (vehicle.mobile) {
          await messagingService.sendWhatsApp(
            `91${vehicle.mobile}`, 
            'service_reminder', 
            { body: `Hi ${vehicle.name}, your ${vehicle.brand} ${vehicle.model} (${vehicle.registration_no}) is due for service! Visit GK AutoHerb.` }
          ).catch(() => {});
        }
      }
      console.log(`[CRON] Sent ${rows.length} service reminders`);
    } catch (err) {
      console.error('[CRON] Error in service reminder task:', err);
    }
  });

  // 2. Daily evening task: Mark absentees for staff who didn't clock in
  // Runs at 21:00 (9:00 PM) every day
  cron.schedule('0 21 * * *', async () => {
    console.log('[CRON] Running daily evening task: Marking absentees');
    try {
      await pool.query(`
        INSERT INTO staff_attendance (staff_id, att_date, status)
        SELECT id, CURDATE(), 'absent'
        FROM users
        WHERE role = 'staff' AND is_active = 1
        AND id NOT IN (
          SELECT staff_id FROM staff_attendance WHERE att_date = CURDATE()
        )
      `);
    } catch (err) {
      console.error('[CRON] Error in attendance task:', err);
    }
  });
  
  console.log('[CRON] Jobs initialized successfully');
};

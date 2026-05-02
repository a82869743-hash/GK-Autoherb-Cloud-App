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

  // 3. BOOKING EXPIRY — Expire pending_approval bookings after 5 min
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      // Find expired pending bookings
      const [expiredBookings] = await pool.query(`
        SELECT id, slot_id, customer_id, is_free_wash
        FROM bookings
        WHERE status = 'pending_approval'
          AND expires_at IS NOT NULL
          AND expires_at < NOW()
      `);

      if (expiredBookings.length === 0) return;

      console.log(`[CRON] Expiring ${expiredBookings.length} pending bookings`);

      for (const booking of expiredBookings) {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();

          // Mark as expired
          await conn.query(
            "UPDATE bookings SET status = 'expired', expires_at = NULL WHERE id = ? AND status = 'pending_approval'",
            [booking.id]
          );

          // Restore slot count
          await conn.query(
            'UPDATE slots SET booked_count = GREATEST(0, booked_count - 1) WHERE id = ?',
            [booking.slot_id]
          );

          // Restore free wash if applicable
          if (booking.is_free_wash) {
            await conn.query(
              'UPDATE loyalty SET free_washes = free_washes + 1 WHERE customer_id = ?',
              [booking.customer_id]
            );
          }

          await conn.commit();
          console.log(`[CRON] Booking #${booking.id} expired — slot ${booking.slot_id} freed`);
        } catch (e) {
          await conn.rollback();
          console.error(`[CRON] Failed to expire booking #${booking.id}:`, e.message);
        } finally {
          conn.release();
        }
      }
    } catch (err) {
      // Only log if it's an actual error, not "table doesn't exist yet"
      if (err.code !== 'ER_BAD_FIELD_ERROR' && err.code !== 'ER_NO_SUCH_TABLE') {
        console.error('[CRON] Error in booking expiry task:', err);
      }
    }
  });
  
  console.log('[CRON] Jobs initialized successfully');
};

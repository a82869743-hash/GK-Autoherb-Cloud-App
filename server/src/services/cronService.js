const cron = require('node-cron');
const pool = require('../config/db');
const messagingService = require('./messagingService');

/**
 * Executes or previews Service Reminders with configurable intervals,
 * idempotency safeguards, and Admin Daily Digest alerts.
 */
async function runServiceReminders(options = { isManual: false, isPreview: false, io: null }) {
  try {
    // 1. Fetch configurable reminder settings
    const [settingsRows] = await pool.query(
      "SELECT key_name, value FROM settings WHERE key_name IN ('service_reminders_enabled', 'service_reminder_interval_days', 'service_reminder_wash_days', 'service_reminder_template', 'admin_whatsapp_number', 'admin_daily_digest_enabled')"
    );
    const settings = settingsRows.reduce((acc, curr) => {
      acc[curr.key_name] = curr.value;
      return acc;
    }, {});

    const isEnabled = settings.service_reminders_enabled !== '0';
    if (!isEnabled && !options.isManual && !options.isPreview) {
      console.log('[CRON] Service reminders disabled in settings. Skipping.');
      return { success: true, skipped: true, reason: 'Reminders disabled in settings' };
    }

    const intervalDays = parseInt(settings.service_reminder_interval_days || '90', 10);
    const adminMobile = settings.admin_whatsapp_number || '9408424541';
    const baseUrl = process.env.CLIENT_URL || 'https://gkautobook.cloud';
    const bookingUrl = `${baseUrl}/customer/booking`;

    // 2. Query vehicles whose last service was intervalDays ago or more
    const [dueVehicles] = await pool.query(`
      SELECT v.id as vehicle_id, v.brand, v.model, v.registration_no,
             u.id as customer_id, u.name as customer_name, u.mobile,
             MAX(jc.completed_at) as last_visit,
             DATEDIFF(CURDATE(), MAX(jc.completed_at)) as days_since_last_visit
      FROM vehicles v
      JOIN users u ON v.customer_id = u.id
      JOIN job_carts jc ON jc.vehicle_id = v.id
      WHERE jc.status = 'complete'
        AND u.is_active = 1
        AND (u.opt_out_promotional IS NULL OR u.opt_out_promotional = 0)
        AND u.mobile IS NOT NULL
      GROUP BY v.id
      HAVING days_since_last_visit >= ?
      ORDER BY days_since_last_visit DESC
      LIMIT 100
    `, [intervalDays]);

    // 3. Query vehicles Due Soon (interval - 7 days to interval)
    const [dueSoonVehicles] = await pool.query(`
      SELECT v.id as vehicle_id, v.brand, v.model, v.registration_no,
             u.id as customer_id, u.name as customer_name, u.mobile,
             MAX(jc.completed_at) as last_visit,
             DATEDIFF(CURDATE(), MAX(jc.completed_at)) as days_since_last_visit
      FROM vehicles v
      JOIN users u ON v.customer_id = u.id
      JOIN job_carts jc ON jc.vehicle_id = v.id
      WHERE jc.status = 'complete'
        AND u.is_active = 1
        AND u.mobile IS NOT NULL
      GROUP BY v.id
      HAVING days_since_last_visit >= (? - 7) AND days_since_last_visit < ?
      LIMIT 100
    `, [intervalDays, intervalDays]);

    // 4. Query Open Job Carts
    const [openJobs] = await pool.query("SELECT COUNT(*) as open_count FROM job_carts WHERE status = 'open'");
    const openJobsCount = openJobs[0]?.open_count || 0;

    let sentCount = 0;
    const candidates = [];

    for (const veh of dueVehicles) {
      const vehName = veh.registration_no || `${veh.brand} ${veh.model}`;

      // Idempotency check: don't send duplicate reminder if sent within last 14 days
      const [recentReminder] = await pool.query(`
        SELECT id FROM v2_notification_logs
        WHERE customer_id = ?
          AND reference_type = 'service_reminder'
          AND reference_id = ?
          AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
        LIMIT 1
      `, [veh.customer_id, veh.vehicle_id]);

      const alreadyReminded = recentReminder.length > 0;

      candidates.push({
        customer_id: veh.customer_id,
        customer_name: veh.customer_name,
        mobile: veh.mobile,
        vehicle_id: veh.vehicle_id,
        vehicle_name: vehName,
        days_since_last_visit: veh.days_since_last_visit,
        already_reminded_recently: alreadyReminded
      });

      if (!alreadyReminded && !options.isPreview) {
        // Send WhatsApp with SMS fallback
        await messagingService.notify(
          veh.customer_id,
          'SERVICE_REMINDER',
          {
            customer_name: veh.customer_name,
            vehicle_name: vehName,
            booking_url: bookingUrl
          },
          { type: 'service_reminder', id: veh.vehicle_id }
        ).catch(e => console.warn(`Service reminder error for vehicle ${veh.vehicle_id}:`, e.message));

        sentCount++;
      }
    }

    // 5. Admin Notifications (Daily Digest)
    if (!options.isPreview) {
      // In-app Socket.io notification
      const io = options.io || (global.app && global.app.get('io'));
      if (io) {
        io.emit('admin_notification', {
          type: 'service_reminders',
          title: 'Daily Service Reminders Dispatched',
          message: `${sentCount} service reminders sent. ${dueSoonVehicles.length} due soon. ${openJobsCount} bay jobs active.`,
          count: sentCount,
          due_soon: dueSoonVehicles.length,
          created_at: new Date()
        });
      }

      // WhatsApp Daily Digest to Admin
      if (settings.admin_daily_digest_enabled !== '0' && adminMobile) {
        await messagingService.sendWhatsApp(
          adminMobile,
          'ADMIN_DAILY_DIGEST',
          {
            body: `🚗 *GK AutoHerb Morning Digest*\n• Reminders sent today: ${sentCount}\n• Due for service soon: ${dueSoonVehicles.length}\n• Open workshop jobs: ${openJobsCount}\nStudio portal: ${baseUrl}/admin`
          }
        ).catch(() => {});
      }
    }

    console.log(`[SERVICE REMINDERS] Completed: Sent ${sentCount} reminders, ${dueSoonVehicles.length} due soon`);

    return {
      success: true,
      reminded_count: sentCount,
      total_candidates: dueVehicles.length,
      due_soon_count: dueSoonVehicles.length,
      open_jobs_count: openJobsCount,
      interval_days: intervalDays,
      candidates
    };

  } catch (err) {
    console.error('[SERVICE REMINDERS] Error:', err);
    return { success: false, error: err.message };
  }
}

exports.runServiceReminders = runServiceReminders;

/**
 * Initializes all cron jobs for the application.
 */
exports.initCronJobs = () => {
  // 1. Daily morning task: Send reminders for customers who haven't visited recently
  // Runs at 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running daily morning task: Service Reminders');
    await runServiceReminders({ isManual: false });
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

  // 4. PACKAGE EXPIRY — Mark expired packages daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running package expiry check');
    try {
      const userPackagesCtrl = require('../controllers/userPackagesController');
      const expired = await userPackagesCtrl.expirePackages();
      if (expired > 0) {
        console.log(`[CRON] Expired ${expired} package subscription(s)`);
      }
    } catch (err) {
      if (err.code !== 'ER_BAD_FIELD_ERROR' && err.code !== 'ER_NO_SUCH_TABLE') {
        console.error('[CRON] Error in package expiry task:', err);
      }
    }
  });
  
  // 5. ADVANCE PAYMENT DUE REMINDERS — Send WhatsApp/SMS for advance payments due tomorrow
  // Runs at 10:00 AM every day
  cron.schedule('0 10 * * *', async () => {
    console.log('[CRON] Running advance payment due reminders');
    try {
      const [duePayments] = await pool.query(`
        SELECT ap.id, ap.balance_due, ap.due_date, u.name, u.mobile
        FROM advance_payments ap
        JOIN users u ON ap.customer_id = u.id
        WHERE ap.status = 'advance_paid'
          AND ap.balance_due > 0
          AND DATE(ap.due_date) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
          AND u.mobile IS NOT NULL
      `);

      for (const payment of duePayments) {
        if (payment.mobile) {
          await messagingService.sendWhatsApp(
            `91${payment.mobile}`, 
            'payment_reminder', 
            { body: `Hi ${payment.name}, gentle reminder for your pending payment of Rs.${payment.balance_due} due tomorrow (${payment.due_date}). Thank you! - GK AutoHerb` }
          ).catch(() => {});
        }
      }
      console.log(`[CRON] Sent ${duePayments.length} advance payment due reminders`);
    } catch (err) {
      if (err.code !== 'ER_BAD_FIELD_ERROR' && err.code !== 'ER_NO_SUCH_TABLE') {
        console.error('[CRON] Error in advance payment reminder task:', err);
      }
    }
  });
  
  // 6. PACKAGE RENEWAL REMINDERS — Send package renewal reminders via notify
  // Runs at 11:00 AM every day
  cron.schedule('0 11 * * *', async () => {
    console.log('[CRON] Running package renewal reminders');
    try {
      const [expiringPackages] = await pool.query(`
        SELECT up.id, up.user_id, up.end_date, p.name AS package_name, u.name, u.mobile, v.brand, v.model, v.registration_no
        FROM user_packages up
        JOIN packages p ON up.package_id = p.id
        JOIN users u ON up.user_id = u.id
        LEFT JOIN vehicles v ON up.vehicle_id = v.id
        WHERE up.package_status = 'active'
          AND (DATE(up.end_date) = DATE_ADD(CURDATE(), INTERVAL 7 DAY) OR DATE(up.end_date) = DATE_ADD(CURDATE(), INTERVAL 1 DAY))
          AND u.mobile IS NOT NULL
      `);

      for (const pkg of expiringPackages) {
        if (pkg.mobile) {
          const baseUrl = process.env.APP_BASE_URL || 'https://gkautobook.cloud';
          await messagingService.notify(
            pkg.user_id,
            'PACKAGE_EXPIRY_REMINDER',
            {
              package_name: pkg.package_name,
              expiry_date: new Date(pkg.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
              renewal_url: `${baseUrl}/packages/renew`
            },
            { type: 'package', id: pkg.id }
          ).catch(() => {});
        }
      }
      console.log(`[CRON] Sent ${expiringPackages.length} package renewal reminders`);
    } catch (err) {
      if (err.code !== 'ER_BAD_FIELD_ERROR' && err.code !== 'ER_NO_SUCH_TABLE') {
        console.error('[CRON] Error in package renewal reminder task:', err);
      }
    }
  });

  // 7. RETRY FAILED NOTIFICATIONS — Checks for failed SMS notifications to retry
  // Runs every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('[CRON] Running failed notifications retry check');
    try {
      const [failedLogs] = await pool.query(`
        SELECT * FROM v2_notification_logs 
        WHERE status = 'failed' AND attempts < 3 AND channel = 'sms'
      `);

      for (const log of failedLogs) {
        console.log(`[CRON] Retrying failed SMS notification #${log.id} (Attempt ${log.attempts + 1})`);
        
        // Mark as retry / pending during attempt
        await pool.query('UPDATE v2_notification_logs SET status = "retry", attempts = attempts + 1, last_attempt_at = NOW() WHERE id = ?', [log.id]);

        // Attempt SMS send
        const smsResult = await messagingService.sendSMS(log.mobile, process.env.MSG91_PROMO_TEMPLATE_ID || 'PROMO123', null, {
          content: log.message_body
        });

        if (smsResult.success) {
          await pool.query('UPDATE v2_notification_logs SET status = "sent", response_data = ? WHERE id = ?', [JSON.stringify(smsResult), log.id]);
        } else {
          await pool.query('UPDATE v2_notification_logs SET status = "failed", response_data = ? WHERE id = ?', [JSON.stringify(smsResult), log.id]);
        }
      }
    } catch (err) {
      console.error('[CRON] Error in failed notification retry task:', err);
    }
  });
  
  // 8. CUSTOMER AUTOMATIONS (IST): day-before reminders, birthday/anniversary wishes, warranty alerts
  const automation = require('./automationJobs');
  const IST = { timezone: 'Asia/Kolkata' };
  cron.schedule('*/30 * * * *', () => automation.runBookingReminders().catch((e) => console.error('[CRON] reminders:', e.message)), IST);
  cron.schedule('0 9 * * *', () => automation.runGreetings().catch((e) => console.error('[CRON] greetings:', e.message)), IST);
  cron.schedule('30 10 * * *', () => automation.runWarrantyJobs().catch((e) => console.error('[CRON] warranty:', e.message)), IST);
  cron.schedule('0 8 * * *', () => automation.runMorningReminders().catch((e) => console.error('[CRON] morning reminders:', e.message)), IST);
  cron.schedule('0 10 * * *', () => automation.runPackageJobs().catch((e) => console.error('[CRON] package jobs:', e.message)), IST);
  cron.schedule('*/5 * * * *', () => automation.runFestivalCampaigns().catch((e) => console.error('[CRON] festival:', e.message)), IST);

  console.log('[CRON] Jobs initialized successfully');
};

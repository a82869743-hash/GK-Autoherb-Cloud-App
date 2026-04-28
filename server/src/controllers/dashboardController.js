const pool = require('../config/db');

// ─── ADMIN STATS ────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 8) + '01';

    // Run all queries in parallel for speed
    const [
      [todayRev], [monthRev], [yesterdayRev],
      [jobCarts], [activeDeliveries], [inquiries],
      [purchases], [pendingPay], [lowStock],
      [todayBookings], [totalCustomers], [recentCompletions],
      [staffPresent]
    ] = await Promise.all([
      // Revenue
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE direction = 'in' AND transaction_date = ?`, [today]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE direction = 'in' AND transaction_date >= ? AND transaction_date <= ?`, [monthStart, today]
      ),
      // Yesterday revenue for comparison
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE direction = 'in' AND transaction_date = DATE_SUB(?, INTERVAL 1 DAY)`, [today]
      ),
      // Job carts
      pool.query(`SELECT 
        COUNT(*) as total, 
        SUM(IF(status='complete', 1, 0)) as completed, 
        SUM(IF(status='open', 1, 0)) as open,
        SUM(IF(status='draft', 1, 0)) as draft
        FROM job_carts`),
      // Deliveries
      pool.query(`SELECT COUNT(*) as active FROM deliveries WHERE status='in_transit'`),
      // Inquiries
      pool.query(`SELECT COUNT(*) as new_leads FROM inquiries WHERE status='new'`),
      // Purchases
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE direction = 'out' AND type = 'purchase'
         AND transaction_date >= ? AND transaction_date <= ?`, [monthStart, today]
      ),
      // Pending payments
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM staff_payments WHERE status = 'pending'`),
      // Low stock
      pool.query(`SELECT COUNT(*) AS total FROM inventory WHERE quantity <= low_stock_threshold AND is_deleted = 0`),
      // Today's bookings count
      pool.query(
        `SELECT COUNT(*) AS total FROM bookings b 
         JOIN slots s ON b.slot_id = s.id 
         WHERE s.slot_date = ? AND b.status = 'confirmed'`, [today]
      ),
      // Total customers
      pool.query(`SELECT COUNT(*) AS total FROM users WHERE role = 'customer' AND is_active = 1`),
      // Completed in last 7 days
      pool.query(
        `SELECT COUNT(*) AS total FROM job_carts 
         WHERE status = 'complete' AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
      ),
      // Staff present today
      pool.query(
        `SELECT COUNT(*) AS total FROM staff_attendance 
         WHERE att_date = CURDATE() AND status = 'present'`
      ),
    ]);

    const todayRevVal = parseFloat(todayRev[0].total);
    const yesterdayRevVal = parseFloat(yesterdayRev[0].total);
    const revChange = yesterdayRevVal > 0 
      ? Math.round(((todayRevVal - yesterdayRevVal) / yesterdayRevVal) * 100) 
      : todayRevVal > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        today_revenue: todayRevVal,
        month_revenue: parseFloat(monthRev[0].total),
        revenue_change: revChange,
        total_purchases_month: parseFloat(purchases[0].total),
        pending_staff_payments: parseFloat(pendingPay[0].total),
        open_job_carts: jobCarts[0].open || 0,
        draft_job_carts: jobCarts[0].draft || 0,
        low_stock_items: lowStock[0].total || 0,
        totalJobs: jobCarts[0].total || 0,
        completedJobs: jobCarts[0].completed || 0,
        completedLast7Days: recentCompletions[0].total || 0,
        activeDeliveries: activeDeliveries[0].active || 0,
        newLeads: inquiries[0].new_leads || 0,
        todayBookings: todayBookings[0].total || 0,
        totalCustomers: totalCustomers[0].total || 0,
        staffPresent: staffPresent[0].total || 0,
      }
    });
  } catch (err) {
    console.error('Dashboard Stats error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CUSTOMER DASHBOARD ─────────────────────
// TASK 7: Dashboard query with primary vehicle, active package, remaining services
exports.getCustomerDashboard = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Import the package helper for Task 7 dashboard data
    const userPkgCtrl = require('./userPackagesController');

    const [
      [vehicles], [bookings], [loyalty], [recentJobs], [totalVisits],
      packageData
    ] = await Promise.all([
      // My vehicles (ordered by primary first)
      pool.query(`SELECT id, registration_no, brand, model, is_primary FROM vehicles WHERE customer_id = ? ORDER BY is_primary DESC, created_at DESC`, [customerId]),
      // Upcoming bookings
      pool.query(`
        SELECT b.id, b.status, b.vehicle_brand, b.vehicle_model, b.vehicle_reg_no,
               s.slot_date, s.start_time, s.end_time,
               svc.name AS service_name, pkg.name AS package_name
        FROM bookings b
        JOIN slots s ON b.slot_id = s.id
        LEFT JOIN services svc ON b.service_id = svc.id
        LEFT JOIN packages pkg ON b.package_id = pkg.id
        WHERE b.customer_id = ? AND b.status = 'confirmed' AND s.slot_date >= CURDATE()
        ORDER BY s.slot_date ASC, s.start_time ASC
        LIMIT 3
      `, [customerId]),
      // Loyalty
      pool.query(`SELECT credits, free_washes, wax_count FROM loyalty WHERE customer_id = ?`, [customerId]),
      // Recent completed jobs
      pool.query(`
        SELECT jc.id, jc.visit_date, jc.visit_number, jc.status, jc.invoice_number,
               v.registration_no, v.brand, v.model,
               (SELECT GROUP_CONCAT(js.service_name SEPARATOR ', ')
                FROM job_services js WHERE js.job_cart_id = jc.id) AS services_done
        FROM job_carts jc
        JOIN vehicles v ON jc.vehicle_id = v.id
        WHERE v.customer_id = ?
        ORDER BY jc.created_at DESC
        LIMIT 5
      `, [customerId]),
      // Total visit count
      pool.query(`
        SELECT COUNT(*) AS total FROM job_carts jc
        JOIN vehicles v ON jc.vehicle_id = v.id
        WHERE v.customer_id = ? AND jc.status = 'complete'
      `, [customerId]),
      // ─── TASK 7: Primary car + active package + remaining services
      userPkgCtrl.getDashboardPackageData(customerId),
    ]);

    res.json({
      success: true,
      data: {
        vehicles: vehicles,
        upcoming_bookings: bookings,
        loyalty: loyalty[0] || { credits: 0, free_washes: 0, wax_count: 0 },
        recent_jobs: recentJobs,
        total_visits: totalVisits[0].total || 0,
        // ─── Task 7 data ────────────────────────────────────
        primary_car: packageData.primary_car,
        active_package: packageData.active_package,
      }
    });
  } catch (err) {
    console.error('Customer Dashboard error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

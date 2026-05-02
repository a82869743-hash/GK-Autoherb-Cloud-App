const pool = require('../config/db');
const reportService = require('../services/reportService');

// ─── SALES REPORT ───────────────────────────
exports.salesReport = async (req, res) => {
  try {
    const { from_date, to_date, format = 'json' } = req.query;
    if (!from_date || !to_date) {
      return res.status(400).json({ success: false, error: 'from_date and to_date are required' });
    }

    // Revenue breakdown by day
    const [dailyRevenue] = await pool.query(`
      SELECT transaction_date AS date,
             SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) AS income,
             SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) AS expenses,
             SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END) AS net
      FROM transactions
      WHERE transaction_date >= ? AND transaction_date <= ?
      GROUP BY transaction_date
      ORDER BY transaction_date ASC
    `, [from_date, to_date]);

    // Summary totals
    const [totals] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN direction = 'in' AND type = 'job_revenue' THEN amount END), 0) AS job_revenue,
        COALESCE(SUM(CASE WHEN direction = 'in' AND type = 'sale_b2b' THEN amount END), 0) AS b2b_sales,
        COALESCE(SUM(CASE WHEN direction = 'in' AND type = 'sale_b2c' THEN amount END), 0) AS b2c_sales,
        COALESCE(SUM(CASE WHEN direction = 'out' AND type = 'purchase' THEN amount END), 0) AS purchases,
        COALESCE(SUM(CASE WHEN direction = 'out' AND type = 'staff_payment' THEN amount END), 0) AS staff_payments,
        COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END), 0) AS total_expenses
      FROM transactions
      WHERE transaction_date >= ? AND transaction_date <= ?
    `, [from_date, to_date]);

    const data = {
      period: { from: from_date, to: to_date },
      summary: totals[0],
      daily: dailyRevenue,
    };

    // Export formats
    if (format === 'xlsx') {
      const buffer = await reportService.generateSalesExcel(from_date, to_date, data);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="sales_report_${from_date}_${to_date}.xlsx"`,
      });
      return res.send(buffer);
    }
    if (format === 'pdf') {
      const buffer = await reportService.generatePDFReport(from_date, to_date);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sales_report_${from_date}_${to_date}.pdf"`,
      });
      return res.send(buffer);
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Sales report error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── INVENTORY REPORT ───────────────────────
exports.inventoryReport = async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    // Current stock with low-stock flags
    const [stock] = await pool.query(`
      SELECT id, product_name, unit, quantity, low_stock_threshold,
             (quantity <= low_stock_threshold) AS is_low_stock
      FROM inventory WHERE is_deleted = 0
      ORDER BY product_name ASC
    `);

    // Usage from job products (last 30 days)
    const [usage] = await pool.query(`
      SELECT inv.product_name, SUM(jp.quantity) AS total_used
      FROM job_products jp
      JOIN inventory inv ON jp.product_id = inv.id
      JOIN job_services js ON jp.job_service_id = js.id
      JOIN job_carts jc ON js.job_cart_id = jc.id
      WHERE jc.completed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY inv.id
      ORDER BY total_used DESC
    `);

    const data = {
      total_items: stock.length,
      low_stock_count: stock.filter(s => s.is_low_stock).length,
      stock,
      usage_last_30_days: usage,
    };

    if (format === 'xlsx') {
      const buffer = await reportService.generateInventoryExcel(data);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="inventory_report.xlsx"`,
      });
      return res.send(buffer);
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Inventory report error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── JOB CARD REPORT ────────────────────────
exports.jobCardReport = async (req, res) => {
  try {
    const { from_date, to_date, status, staff_id, format = 'json' } = req.query;
    let where = '1=1';
    const params = [];

    if (from_date) { where += ' AND jc.visit_date >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND jc.visit_date <= ?'; params.push(to_date); }
    if (status && status !== 'all') { where += ' AND jc.status = ?'; params.push(status); }
    if (staff_id) { where += ' AND jc.created_by = ?'; params.push(staff_id); }

    const [rows] = await pool.query(`
      SELECT jc.id, jc.visit_date, jc.visit_number, jc.status, jc.notes, jc.invoice_number,
             jc.created_at, jc.completed_at,
             v.registration_no, v.brand, v.model,
             u.name AS customer_name, u.mobile AS customer_mobile,
             creator.name AS created_by_name,
             (SELECT COALESCE(SUM(js.service_price + js.labor_charges), 0)
              + COALESCE((SELECT SUM(jp.quantity * jp.unit_cost) FROM job_products jp 
                          JOIN job_services js2 ON jp.job_service_id = js2.id WHERE js2.job_cart_id = jc.id), 0)
              FROM job_services js WHERE js.job_cart_id = jc.id) AS total_amount,
             (SELECT GROUP_CONCAT(js3.service_name SEPARATOR ', ')
              FROM job_services js3 WHERE js3.job_cart_id = jc.id) AS services_done
      FROM job_carts jc
      JOIN vehicles v ON jc.vehicle_id = v.id
      JOIN users u ON v.customer_id = u.id
      LEFT JOIN users creator ON jc.created_by = creator.id
      WHERE ${where}
      ORDER BY jc.visit_date DESC
    `, params);

    // Summary stats
    const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
    const statusBreakdown = {};
    rows.forEach(r => { statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1; });

    const data = {
      total_jobs: rows.length,
      total_revenue: totalRevenue,
      status_breakdown: statusBreakdown,
      jobs: rows,
    };

    if (format === 'xlsx') {
      const buffer = await reportService.generateJobCardExcel(data);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="job_card_report.xlsx"`,
      });
      return res.send(buffer);
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Job card report error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

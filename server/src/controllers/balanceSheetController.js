const pool = require('../config/db');

exports.getBalanceSheet = async (req, res) => {
  try {
    const { from, to, period = 'month' } = req.query;
    const startDate = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = to || new Date().toISOString().split('T')[0];

    // Revenue from completed jobs
    const [jobRevenue] = await pool.query(`
      SELECT COALESCE(SUM(total_amount),0) as total FROM job_carts
      WHERE status='complete' AND DATE(completed_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Revenue from manual bills
    const [billRevenue] = await pool.query(`
      SELECT COALESCE(SUM(amount),0) as total FROM manual_bills
      WHERE DATE(created_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Revenue from package sales
    const [pkgRevenue] = await pool.query(`
      SELECT COALESCE(SUM(price_paid),0) as total FROM user_packages
      WHERE payment_status='paid' AND DATE(created_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Payments collected
    const [paymentsIn] = await pool.query(`
      SELECT COALESCE(SUM(amount),0) as total FROM payments
      WHERE payment_status='completed' AND payment_type != 'refund' AND DATE(paid_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Expenses
    const [expenses] = await pool.query(`
      SELECT COALESCE(SUM(amount),0) as total, COALESCE(SUM(gst_amount),0) as gst_total
      FROM expenses WHERE DATE(expense_date) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Expense breakdown by category
    const [expByCategory] = await pool.query(`
      SELECT ec.name as category, COALESCE(SUM(e.amount),0) as total
      FROM expenses e JOIN expense_categories ec ON ec.id=e.category_id
      WHERE DATE(e.expense_date) BETWEEN ? AND ?
      GROUP BY ec.id, ec.name ORDER BY total DESC
    `, [startDate, endDate]);

    // Staff payments
    const [staffPay] = await pool.query(`
      SELECT COALESCE(SUM(amount),0) as total FROM staff_payments
      WHERE status='paid' AND DATE(paid_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Purchases (buy entries)
    const [purchases] = await pool.query(`
      SELECT COALESCE(SUM(total_amount),0) as total FROM buy_sell
      WHERE type='buy' AND DATE(transaction_date) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Refunds
    const [refunds] = await pool.query(`
      SELECT COALESCE(SUM(amount),0) as total FROM refunds
      WHERE status IN ('approved','processed') AND DATE(created_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    const totalIncome = parseFloat(jobRevenue[0].total) + parseFloat(billRevenue[0].total) + parseFloat(pkgRevenue[0].total);
    const totalExpenses = parseFloat(expenses[0].total) + parseFloat(staffPay[0].total) + parseFloat(purchases[0].total);
    const netProfit = totalIncome - totalExpenses - parseFloat(refunds[0].total);

    res.json({
      success: true,
      data: {
        period: { from: startDate, to: endDate },
        income: {
          job_revenue: parseFloat(jobRevenue[0].total),
          bill_revenue: parseFloat(billRevenue[0].total),
          package_revenue: parseFloat(pkgRevenue[0].total),
          payments_collected: parseFloat(paymentsIn[0].total),
          total: totalIncome
        },
        expenses: {
          operational: parseFloat(expenses[0].total),
          staff_payments: parseFloat(staffPay[0].total),
          purchases: parseFloat(purchases[0].total),
          gst_paid: parseFloat(expenses[0].gst_total),
          total: totalExpenses,
          by_category: expByCategory
        },
        refunds: parseFloat(refunds[0].total),
        net_profit: netProfit,
        profit_margin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0
      }
    });
  } catch (err) {
    console.error('getBalanceSheet error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to generate balance sheet' });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 20, category_id, from, to } = req.query;
    const offset = (page - 1) * limit;
    let where = ['1=1']; const params = [];
    if (category_id) { where.push('e.category_id=?'); params.push(category_id); }
    if (from) { where.push('e.expense_date>=?'); params.push(from); }
    if (to) { where.push('e.expense_date<=?'); params.push(to); }
    const [cnt] = await pool.query(`SELECT COUNT(*) as total FROM expenses e WHERE ${where.join(' AND ')}`, params);
    const [rows] = await pool.query(`
      SELECT e.*, ec.name as category_name, u.name as created_by_name
      FROM expenses e LEFT JOIN expense_categories ec ON ec.id=e.category_id
      LEFT JOIN users u ON u.id=e.created_by
      WHERE ${where.join(' AND ')} ORDER BY e.expense_date DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: cnt[0].total } });
  } catch (err) { res.status(500).json({ success: false, error: 'Failed to fetch expenses' }); }
};

exports.createExpense = async (req, res) => {
  try {
    const { category_id, amount, description, expense_date, payment_method, gst_amount, gst_number } = req.body;
    if (!amount || !category_id) return res.status(400).json({ success: false, error: 'Amount and category required' });
    const [result] = await pool.query(
      `INSERT INTO expenses (category_id, amount, description, expense_date, payment_method, gst_amount, gst_number, created_by) VALUES (?,?,?,?,?,?,?,?)`,
      [category_id, amount, description, expense_date || new Date().toISOString().split('T')[0], payment_method || 'cash', gst_amount || 0, gst_number, req.user.id]
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Expense recorded' });
  } catch (err) { res.status(500).json({ success: false, error: 'Failed to create expense' }); }
};

exports.getExpenseCategories = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM expense_categories WHERE is_active=1 ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: 'Failed to fetch categories' }); }
};

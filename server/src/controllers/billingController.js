const pool = require('../config/db');

// ─── CREATE MANUAL BILL ─────────────────────
exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      customer_id, customer_name, customer_mobile,
      amount, description, services, products, payment_method = 'cash',
      discount_type, discount_value, loyalty_redeemed
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }

    // Process products inventory deduction if present
    if (products && Array.isArray(products) && products.length > 0) {
      for (const prod of products) {
        if (prod.id && prod.quantity > 0) {
          await conn.query('UPDATE inventory SET quantity = GREATEST(0, quantity - ?) WHERE id = ?', [prod.quantity, prod.id]);
        }
      }
    }

    // Deduct loyalty points if redeemed
    if (loyalty_redeemed && customer_id && discount_type === 'fixed' && discount_value > 0) {
      await conn.query('UPDATE loyalty SET credits = GREATEST(0, credits - ?) WHERE customer_id = ?', [discount_value, customer_id]);
      
      // Log the loyalty redemption transaction
      await conn.query(
        `INSERT INTO transactions (type, reference_id, amount, direction, note, transaction_date, created_by)
         VALUES ('loyalty_redeem', ?, ?, 'out', ?, CURDATE(), ?)`,
        [customer_id, discount_value, `Redeemed ₹${discount_value} for Manual Bill`, req.user.id]
      );
    }

    const [result] = await conn.query(
      `INSERT INTO manual_bills 
       (customer_id, customer_name, customer_mobile, amount, discount_type, discount_value, description, services_json, products_json, payment_method, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id || null,
        customer_name || null,
        customer_mobile || null,
        amount,
        discount_type || null,
        discount_value || null,
        description || null,
        services ? JSON.stringify(services) : null,
        products ? JSON.stringify(products) : null,
        payment_method,
        req.user.id
      ]
    );

    // Create transaction record
    await conn.query(
      `INSERT INTO transactions (type, reference_id, amount, direction, note, transaction_date, created_by)
       VALUES ('job_revenue', ?, ?, 'in', ?, CURDATE(), ?)`,
      [result.insertId, amount, `Manual Bill #${result.insertId}: ${description || 'POS Sale'}`, req.user.id]
    );

    // If customer has mobile, send SMS
    if (customer_mobile) {
      try {
        const sendSms = require('../utils/sendSms');
        const msg = `GK AutoHerb: Thank you ${customer_name || 'Customer'}! Your bill for Rs.${amount} is confirmed.`;
        sendSms(customer_mobile, msg).catch(() => {});
      } catch (e) { /* ignore */ }
    }

    await conn.commit();
    console.log(`[BILLING] Manual bill #${result.insertId} created — ₹${amount}`);
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Bill created' });
  } catch (err) {
    await conn.rollback();
    console.error('Create bill error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── LIST BILLS ─────────────────────────────
exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, from_date, to_date, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];

    if (from_date) { where += ' AND mb.created_at >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND mb.created_at <= ?'; params.push(to_date + ' 23:59:59'); }
    if (search) {
      where += ' AND (mb.customer_name LIKE ? OR mb.customer_mobile LIKE ? OR mb.description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM manual_bills mb WHERE ${where}`, params
    );

    const [rows] = await pool.query(`
      SELECT mb.*, u.name AS created_by_name,
             cu.name AS linked_customer_name
      FROM manual_bills mb
      LEFT JOIN users u ON mb.created_by = u.id
      LEFT JOIN users cu ON mb.customer_id = cu.id
      WHERE ${where}
      ORDER BY mb.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRows[0].total },
    });
  } catch (err) {
    console.error('List bills error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET ONE BILL ───────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT mb.*, u.name AS created_by_name
      FROM manual_bills mb
      LEFT JOIN users u ON mb.created_by = u.id
      WHERE mb.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Bill not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Get bill error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

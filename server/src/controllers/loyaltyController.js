const pool = require('../config/db');

// ─── GET CUSTOMER LOYALTY ───────────────────
exports.get = async (req, res) => {
  try {
    const customerId = req.params.customerId || req.user.id;
    const [rows] = await pool.query(
      `SELECT l.*, u.name AS customer_name, u.mobile AS customer_mobile
       FROM loyalty l JOIN users u ON l.customer_id = u.id
       WHERE l.customer_id = ?`, [customerId]
    );
    if (!rows.length) {
      // Auto-create loyalty row if missing
      await pool.query('INSERT IGNORE INTO loyalty (customer_id) VALUES (?)', [customerId]);
      const [fresh] = await pool.query(
        `SELECT l.*, u.name AS customer_name, u.mobile AS customer_mobile
         FROM loyalty l JOIN users u ON l.customer_id = u.id
         WHERE l.customer_id = ?`, [customerId]
      );
      return res.json({ success: true, data: fresh[0] || { credits: 0, free_washes: 0, wax_count: 0 } });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Loyalty get error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── UPDATE (DELTA-BASED) ───────────────────
exports.update = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { credits = 0, free_washes = 0, wax_count = 0, note } = req.body;

    // Ensure loyalty row exists
    await pool.query('INSERT IGNORE INTO loyalty (customer_id) VALUES (?)', [customerId]);

    await pool.query(`
      UPDATE loyalty SET
        credits = GREATEST(0, credits + ?),
        free_washes = GREATEST(0, free_washes + ?),
        wax_count = GREATEST(0, wax_count + ?)
      WHERE customer_id = ?
    `, [credits, free_washes, wax_count, customerId]);

    // Log as transaction if there's a note or positive award
    if (note || credits > 0 || free_washes > 0 || wax_count > 0) {
      try {
        await pool.query(
          `INSERT INTO transactions (reference_id, type, amount, direction, note, transaction_date, created_by) VALUES (?, 'loyalty_award', ?, 'out', ?, CURDATE(), ?)`,
          [customerId, credits, note || `Loyalty: +₹${credits} credits, +${free_washes} washes, +${wax_count} wax`, req.user.id]
        );
      } catch {} // Non-critical
    }

    const [updated] = await pool.query('SELECT * FROM loyalty WHERE customer_id = ?', [customerId]);
    res.json({ success: true, data: updated[0], message: 'Loyalty updated' });
  } catch (err) {
    console.error('Loyalty update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── SEARCH CUSTOMERS (for admin quick award) ─
exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.mobile,
        COALESCE(l.credits, 0) AS credits,
        COALESCE(l.free_washes, 0) AS free_washes,
        COALESCE(l.wax_count, 0) AS wax_count
      FROM users u
      LEFT JOIN loyalty l ON u.id = l.customer_id
      WHERE u.role = 'customer' AND (u.name LIKE ? OR u.mobile LIKE ?)
      LIMIT 10
    `, [`%${q}%`, `%${q}%`]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Loyalty search error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET LOYALTY HISTORY ────────────────────
exports.history = async (req, res) => {
  try {
    const customerId = req.params.customerId || req.user.id;
    const [rows] = await pool.query(
      `SELECT * FROM transactions WHERE reference_id = ? AND type = 'loyalty_award' ORDER BY created_at DESC LIMIT 50`,
      [customerId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Loyalty history error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

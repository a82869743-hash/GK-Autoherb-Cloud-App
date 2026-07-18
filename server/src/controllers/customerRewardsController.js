const pool = require('../config/db');

// ─── LIST CUSTOMER REWARDS ─────────────────────────────
exports.list = async (req, res) => {
  try {
    const { customer_id, redeemed } = req.query;
    let where = '1=1';
    const params = [];

    if (customer_id) { where += ' AND customer_id = ?'; params.push(customer_id); }
    if (redeemed !== undefined) { where += ' AND redeemed = ?'; params.push(redeemed === 'true' ? 1 : 0); }

    const [rows] = await pool.query(
      `SELECT cr.*, u.name as customer_name, u.mobile as customer_mobile 
       FROM customer_rewards cr 
       LEFT JOIN users u ON u.id = cr.customer_id 
       WHERE ${where.replace(/customer_id/g, 'cr.customer_id').replace(/redeemed/g, 'cr.redeemed')} 
       ORDER BY cr.created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Customer rewards list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── AWARD WELCOME REWARD INTERNAL ──────────────────────
const awardWelcomeRewardInternal = async (customerId, conn = pool) => {
  if (!customerId) throw new Error('Customer ID required');

  // Check if already awarded
  const [existing] = await conn.query('SELECT id FROM customer_rewards WHERE customer_id = ? AND reward_type = "welcome"', [customerId]);
  if (existing.length) return null;

  // Give 500 points and 10% discount expiring in 30 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const [result] = await conn.query(
    `INSERT INTO customer_rewards (customer_id, reward_type, points_awarded, discount_pct, description, expires_at)
     VALUES (?, 'welcome', 500, 10.00, 'Welcome to GK AutoHerb! Enjoy 1 Free Wash, 500 points and 10% off your first service.', ?)`,
    [customerId, expiresAt]
  );

  // Check if loyalty record exists
  const [existingLoyalty] = await conn.query('SELECT id FROM loyalty WHERE customer_id = ?', [customerId]);
  if (existingLoyalty.length > 0) {
    await conn.query('UPDATE loyalty SET credits = credits + 500, free_washes = free_washes + 1 WHERE customer_id = ?', [customerId]);
  } else {
    await conn.query('INSERT INTO loyalty (customer_id, credits, free_washes) VALUES (?, 500, 1)', [customerId]);
  }

  // Also log in loyalty points transactions (loyalty_transactions)
  await conn.query(
    `INSERT INTO loyalty_transactions (customer_id, type, points, description) VALUES (?, 'earn', 500, 'Welcome Reward points and 1 Free Wash awarded.')`,
    [customerId]
  );

  return result.insertId;
};
exports.awardWelcomeRewardInternal = awardWelcomeRewardInternal;

// ─── AWARD WELCOME REWARD ───────────────────────────────
exports.awardWelcome = async (req, res) => {
  try {
    const { customer_id } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, error: 'Customer ID required' });

    const insertId = await awardWelcomeRewardInternal(customer_id);
    if (!insertId) {
      return res.status(400).json({ success: false, error: 'Welcome reward already awarded' });
    }

    res.status(201).json({ success: true, message: 'Welcome reward awarded', data: { id: insertId } });
  } catch (err) {
    console.error('Customer rewards awardWelcome error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── REDEEM REWARD ──────────────────────────────────────
exports.redeem = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM customer_rewards WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Reward not found' });
    if (existing[0].redeemed) return res.status(400).json({ success: false, error: 'Reward already redeemed' });
    if (existing[0].expires_at && new Date(existing[0].expires_at) < new Date()) {
      return res.status(400).json({ success: false, error: 'Reward expired' });
    }

    await pool.query('UPDATE customer_rewards SET redeemed = 1, redeemed_at = NOW() WHERE id = ?', [id]);
    
    // Also add to loyalty points ledger if there are points
    if (existing[0].points_awarded > 0) {
      await pool.query(
        `INSERT INTO loyalty_transactions (customer_id, type, points, description) VALUES (?, 'earn', ?, ?)`,
        [existing[0].customer_id, existing[0].points_awarded, existing[0].description]
      );
    }

    res.json({ success: true, message: 'Reward redeemed successfully' });
  } catch (err) {
    console.error('Customer rewards redeem error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

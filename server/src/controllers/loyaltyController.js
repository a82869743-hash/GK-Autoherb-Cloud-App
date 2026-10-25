/**
 * ═══════════════════════════════════════════════════════════
 * LOYALTY CONTROLLER — Phase 2 Enhanced
 * ═══════════════════════════════════════════════════════════
 *
 * Features:
 *   - Configurable point earning ratio (from settings table)
 *   - Points earn/redeem/adjust with full transaction history
 *   - Points balance management
 *   - Backward-compatible with existing loyalty credits/free_washes
 *
 * Tables used:
 *   - loyalty (credits, free_washes, wax_count, points)
 *   - loyalty_transactions (earn/redeem/bonus/adjust/expire)
 *   - settings (loyalty_points_ratio, loyalty_point_value)
 */

const pool = require('../config/db');
const { setSetting } = require('../utils/settingsStore');

// ─── HELPERS ─────────────────────────────────

/**
 * getLoyaltySettings — Fetch loyalty config from settings table
 */
async function getLoyaltySettings(conn) {
  const db = conn || pool;
  const [settings] = await db.query(
    "SELECT key_name, value FROM settings WHERE key_name LIKE 'loyalty_%'"
  );
  const config = {
    earn_percent: 10,    // 10% of every bill comes back as points (₹2000 bill → 200 points)
    points_ratio: 100,   // legacy: ₹ spent per point (kept for old screens)
    min_redeem: 50,      // Minimum 50 points to redeem
    point_value: 1,      // 1 point = ₹1
    enabled: true,
  };
  for (const s of settings) {
    if (s.key_name === 'loyalty_earn_percent') config.earn_percent = parseFloat(s.value) || 0;
    if (s.key_name === 'loyalty_points_ratio') config.points_ratio = parseFloat(s.value) || 100;
    if (s.key_name === 'loyalty_min_redeem') config.min_redeem = parseFloat(s.value) || 50;
    if (s.key_name === 'loyalty_point_value') config.point_value = parseFloat(s.value) || 1;
    if (s.key_name === 'loyalty_enabled') config.enabled = s.value === '1';
  }
  return config;
}

/**
 * ensureLoyaltyRow — Ensures loyalty row exists for customer
 */
async function ensureLoyaltyRow(conn, customerId) {
  await conn.query(
    'INSERT IGNORE INTO loyalty (customer_id, credits, free_washes, wax_count, points) VALUES (?, 0, 0, 0, 0)',
    [customerId]
  );
}

// ═══════════════════════════════════════════════════════════
// GET LOYALTY — Customer's loyalty data
// GET /loyalty/mine or /loyalty/:customerId
// ═══════════════════════════════════════════════════════════
exports.get = async (req, res) => {
  try {
    const customerId = req.params.customerId || req.user.id;

    const [rows] = await pool.query(
      'SELECT * FROM loyalty WHERE customer_id = ?', [customerId]
    );

    if (!rows.length) {
      return res.json({
        success: true,
        data: { customer_id: customerId, credits: 0, free_washes: 0, wax_count: 0, points: 0 },
      });
    }

    // Also get loyalty settings for display
    const config = await getLoyaltySettings();

    res.json({
      success: true,
      data: { ...rows[0], loyalty_settings: config },
    });
  } catch (err) {
    console.error('Get loyalty error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch loyalty data' });
  }
};

// ═══════════════════════════════════════════════════════════
// UPDATE LOYALTY — Admin manual adjust
// PATCH /loyalty/:customerId
// ═══════════════════════════════════════════════════════════
exports.update = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { customerId } = req.params;
    const { credits, free_washes, wax_count, points, description } = req.body;

    await ensureLoyaltyRow(conn, customerId);

    // Get current values
    const [current] = await conn.query(
      'SELECT * FROM loyalty WHERE customer_id = ? FOR UPDATE', [customerId]
    );
    const cur = current[0] || { credits: 0, free_washes: 0, wax_count: 0, points: 0 };

    // Build update
    const updates = {};
    if (credits !== undefined) updates.credits = credits;
    if (free_washes !== undefined) updates.free_washes = free_washes;
    if (wax_count !== undefined) updates.wax_count = wax_count;
    if (points !== undefined) updates.points = points;

    if (Object.keys(updates).length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);

    await conn.query(
      `UPDATE loyalty SET ${setClauses} WHERE customer_id = ?`,
      [...values, customerId]
    );

    // Log point change in transactions
    if (points !== undefined && points !== cur.points) {
      const pointDiff = points - cur.points;
      await conn.query(
        `INSERT INTO loyalty_transactions
         (customer_id, type, points, balance_after, reference_type, description, created_by)
         VALUES (?, 'adjustment', ?, ?, 'manual', ?, ?)`,
        [customerId, pointDiff, points, description || 'Admin adjustment', req.user.id]
      );
    }

    await conn.commit();

    const [updated] = await pool.query('SELECT * FROM loyalty WHERE customer_id = ?', [customerId]);
    res.json({ success: true, data: updated[0], message: 'Loyalty updated' });
  } catch (err) {
    await conn.rollback();
    console.error('Update loyalty error:', err);
    res.status(500).json({ success: false, error: 'Failed to update loyalty' });
  } finally {
    conn.release();
  }
};

// ═══════════════════════════════════════════════════════════
// EARN POINTS — Called after invoice/payment
// POST /loyalty/earn (internal or admin)
// ═══════════════════════════════════════════════════════════
exports.earnPoints = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { customer_id, amount, reference_type, reference_id, description } = req.body;

    if (!customer_id || !amount || amount <= 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'customer_id and positive amount required' });
    }

    const config = await getLoyaltySettings(conn);
    if (!config.enabled) {
      await conn.rollback();
      return res.json({ success: true, data: { points_earned: 0 }, message: 'Loyalty system is disabled' });
    }

    const pointsEarned = Math.floor((Number(amount) * config.earn_percent) / 100);
    if (pointsEarned <= 0) {
      await conn.rollback();
      return res.json({ success: true, data: { points_earned: 0 }, message: 'Amount too low for points' });
    }

    await ensureLoyaltyRow(conn, customer_id);

    // Lock and update
    const [current] = await conn.query(
      'SELECT points FROM loyalty WHERE customer_id = ? FOR UPDATE', [customer_id]
    );
    const newBalance = (current[0]?.points || 0) + pointsEarned;

    await conn.query(
      'UPDATE loyalty SET points = ? WHERE customer_id = ?',
      [newBalance, customer_id]
    );

    // Log transaction
    await conn.query(
      `INSERT INTO loyalty_transactions
       (customer_id, type, points, balance_after, reference_type, reference_id, description, created_by)
       VALUES (?, 'earn', ?, ?, ?, ?, ?, ?)`,
      [customer_id, pointsEarned, newBalance, reference_type || 'invoice', reference_id || null,
       description || `Earned ${pointsEarned} points from ₹${amount} spend`, req.user?.id || null]
    );

    await conn.commit();

    res.json({
      success: true,
      data: { points_earned: pointsEarned, new_balance: newBalance },
      message: `Earned ${pointsEarned} loyalty points`,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Earn points error:', err);
    res.status(500).json({ success: false, error: 'Failed to earn points' });
  } finally {
    conn.release();
  }
};

// Callable from other controllers without req/res
exports.awardPointsInternal = async (conn, customerId, amount, referenceType, referenceId, createdBy) => {
  try {
    const config = await getLoyaltySettings(conn);
    if (!config.enabled) return 0;

    // Idempotency safeguard: check if points were already awarded for this reference
    const [existing] = await conn.query(
      "SELECT id FROM loyalty_transactions WHERE customer_id = ? AND reference_type = ? AND reference_id = ? AND type = 'earn'",
      [customerId, referenceType, referenceId]
    );
    if (existing.length > 0) {
      console.log(`[LOYALTY] Points already awarded for ${referenceType} #${referenceId}`);
      return 0;
    }

    // Admin-configurable percentage of the bill (default 10%: ₹2000 → 200 points)
    const pointsEarned = Math.floor((Number(amount) * config.earn_percent) / 100);
    if (pointsEarned <= 0) return 0;

    await ensureLoyaltyRow(conn, customerId);

    const [current] = await conn.query(
      'SELECT points FROM loyalty WHERE customer_id = ? FOR UPDATE', [customerId]
    );
    const newBalance = (current[0]?.points || 0) + pointsEarned;

    await conn.query(
      'UPDATE loyalty SET points = ? WHERE customer_id = ?',
      [newBalance, customerId]
    );

    await conn.query(
      `INSERT INTO loyalty_transactions
       (customer_id, type, points, balance_after, reference_type, reference_id, description, created_by)
       VALUES (?, 'earn', ?, ?, ?, ?, ?, ?)`,
      [customerId, pointsEarned, newBalance, referenceType, referenceId,
       `Earned ${pointsEarned} points (${config.earn_percent}% of ₹${Math.round(Number(amount))})`, createdBy || null]
    );

    console.log(`[LOYALTY] Awarded ${pointsEarned} points to customer #${customerId} for ${referenceType} #${referenceId}`);

    // Tell the customer once the surrounding transaction has had time to commit
    setTimeout(() => {
      require('../services/messagingService').notify(
        customerId,
        'LOYALTY_POINTS_EARNED',
        {
          points_earned: pointsEarned,
          earn_percent: config.earn_percent,
          amount: Math.round(Number(amount)),
          total_points: Math.round(newBalance),
          rewards_url: `${require('../services/messagingService').appBaseUrl()}/customer/loyalty`,
        },
        { type: referenceType, id: referenceId }
      ).catch(() => {});
    }, 1500);
    return pointsEarned;
  } catch (err) {
    console.error('Award points internal error:', err);
    return 0;
  }
};

// ═══════════════════════════════════════════════════════════
// REDEEM POINTS
// POST /loyalty/redeem
// ═══════════════════════════════════════════════════════════
exports.redeemPoints = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { customer_id, points, description } = req.body;
    const targetCustomer = customer_id || req.user.id;

    if (!points || points <= 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Positive points amount required' });
    }

    const config = await getLoyaltySettings(conn);
    if (!config.enabled) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Loyalty system is disabled' });
    }

    if (points < config.min_redeem) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: `Minimum ${config.min_redeem} points required to redeem`
      });
    }

    await ensureLoyaltyRow(conn, targetCustomer);

    const [current] = await conn.query(
      'SELECT points FROM loyalty WHERE customer_id = ? FOR UPDATE', [targetCustomer]
    );
    const currentBalance = current[0]?.points || 0;

    if (currentBalance < points) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: `Insufficient points. Balance: ${currentBalance}`
      });
    }

    const newBalance = currentBalance - points;
    const rupeesValue = points * config.point_value;

    await conn.query(
      'UPDATE loyalty SET points = ? WHERE customer_id = ?',
      [newBalance, targetCustomer]
    );

    await conn.query(
      `INSERT INTO loyalty_transactions
       (customer_id, type, points, balance_after, reference_type, description, created_by)
       VALUES (?, 'redeem', ?, ?, 'manual', ?, ?)`,
      [targetCustomer, -points, newBalance, description || `Redeemed ${points} points (₹${rupeesValue})`, req.user.id]
    );

    await conn.commit();

    res.json({
      success: true,
      data: { points_redeemed: points, rupees_value: rupeesValue, new_balance: newBalance },
      message: `Redeemed ${points} points (₹${rupeesValue} value)`,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Redeem points error:', err);
    res.status(500).json({ success: false, error: 'Failed to redeem points' });
  } finally {
    conn.release();
  }
};

// ═══════════════════════════════════════════════════════════
// LOYALTY HISTORY (transactions)
// ═══════════════════════════════════════════════════════════
exports.history = async (req, res) => {
  try {
    const customerId = req.params.customerId || req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM loyalty_transactions WHERE customer_id = ?',
      [customerId]
    );

    const [rows] = await pool.query(
      `SELECT lt.*, u.name AS created_by_name
       FROM loyalty_transactions lt
       LEFT JOIN users u ON lt.created_by = u.id
       WHERE lt.customer_id = ?
       ORDER BY lt.created_at DESC
       LIMIT ? OFFSET ?`,
      [customerId, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRows[0].total },
    });
  } catch (err) {
    console.error('Loyalty history error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch loyalty history' });
  }
};

// ═══════════════════════════════════════════════════════════
// SEARCH CUSTOMERS BY LOYALTY
// ═══════════════════════════════════════════════════════════
exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    const hasQuery = q && q.trim().length >= 2;
    const search = hasQuery ? `%${q.trim()}%` : null;

    const sql = `
      SELECT u.id, u.name, u.mobile,
        COALESCE(l.credits, 0) AS credits,
        COALESCE(l.free_washes, 0) AS free_washes,
        COALESCE(l.wax_count, 0) AS wax_count,
        COALESCE(l.points, 0) AS points
      FROM users u
      LEFT JOIN loyalty l ON u.id = l.customer_id
      WHERE u.role = 'customer' ${hasQuery ? 'AND (u.name LIKE ? OR u.mobile LIKE ?)' : ''}
      ORDER BY l.points DESC, u.name ASC
      LIMIT 50
    `;

    const [rows] = await pool.query(sql, hasQuery ? [search, search] : []);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Loyalty search error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

// ═══════════════════════════════════════════════════════════
// GET/UPDATE LOYALTY SETTINGS (admin)
// ═══════════════════════════════════════════════════════════
exports.getSettings = async (req, res) => {
  try {
    const config = await getLoyaltySettings();
    res.json({ success: true, data: config });
  } catch (err) {
    console.error('Get loyalty settings error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { points_ratio, min_redeem, point_value, enabled, earn_percent } = req.body;

    const updates = [];
    if (earn_percent !== undefined) {
      const pct = parseFloat(earn_percent);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        return res.status(400).json({ success: false, error: 'Earn percent must be between 0 and 100' });
      }
      updates.push(['loyalty_earn_percent', String(pct)]);
    }
    if (points_ratio !== undefined) updates.push(['loyalty_points_ratio', String(points_ratio)]);
    if (min_redeem !== undefined) updates.push(['loyalty_min_redeem', String(min_redeem)]);
    if (point_value !== undefined) updates.push(['loyalty_point_value', String(point_value)]);
    if (enabled !== undefined) updates.push(['loyalty_enabled', enabled ? '1' : '0']);

    for (const [key, val] of updates) {
      await setSetting(key, val);
    }

    const config = await getLoyaltySettings();
    res.json({ success: true, data: config, message: 'Loyalty settings updated' });
  } catch (err) {
    console.error('Update loyalty settings error:', err);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
};

// ═══════════════════════════════════════════════════════════
// REDEEM POINTS TO WASH
// POST /loyalty/redeem-wash
// ═══════════════════════════════════════════════════════════
exports.redeemPointsToWash = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const targetCustomer = req.user.id;
    const pointsNeeded = 1000;

    await ensureLoyaltyRow(conn, targetCustomer);

    const [current] = await conn.query(
      'SELECT points, free_washes FROM loyalty WHERE customer_id = ? FOR UPDATE', [targetCustomer]
    );
    const currentPoints = current[0]?.points || 0;
    const currentWashes = current[0]?.free_washes || 0;

    if (currentPoints < pointsNeeded) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: `Insufficient points. 1000 points required to redeem a free wash. You have ${currentPoints} points.`
      });
    }

    const newPoints = currentPoints - pointsNeeded;
    const newWashes = currentWashes + 1;

    await conn.query(
      'UPDATE loyalty SET points = ?, free_washes = ? WHERE customer_id = ?',
      [newPoints, newWashes, targetCustomer]
    );

    await conn.query(
      `INSERT INTO loyalty_transactions
       (customer_id, type, points, balance_after, reference_type, description, created_by)
       VALUES (?, 'redeem', ?, ?, 'manual', 'Redeemed 1000 points for 1 Free Wash', ?)`,
      [targetCustomer, -pointsNeeded, newPoints, req.user.id]
    );

    await conn.commit();

    res.json({
      success: true,
      data: {
        points_redeemed: pointsNeeded,
        new_points_balance: newPoints,
        new_washes_balance: newWashes
      },
      message: 'Successfully redeemed 1000 points for 1 Free Wash!',
    });
  } catch (err) {
    await conn.rollback();
    console.error('Redeem points to wash error:', err);
    res.status(500).json({ success: false, error: 'Failed to redeem points to wash' });
  } finally {
    conn.release();
  }
};

// ═══════════════════════════════════════════════════════════
// REWARD CATALOGUE — admin decides what points can buy
// (free wash, any free service, or a flat ₹ discount)
// ═══════════════════════════════════════════════════════════
function rewardFields(body) {
  const type = ['free_service', 'discount_amount', 'free_wash'].includes(body.reward_type) ? body.reward_type : 'free_service';
  return {
    title: String(body.title || '').trim().slice(0, 150),
    description: body.description ? String(body.description).slice(0, 500) : null,
    reward_type: type,
    service_id: type === 'free_service' && body.service_id ? Number(body.service_id) : null,
    discount_amount: type === 'discount_amount' ? Number(body.discount_amount) || 0 : null,
    points_required: Math.max(1, parseInt(body.points_required, 10) || 0),
    validity_days: Math.max(1, parseInt(body.validity_days, 10) || 90),
    image_url: body.image_url || null,
    is_active: body.is_active === undefined ? 1 : (body.is_active ? 1 : 0),
    sort_order: parseInt(body.sort_order, 10) || 0,
  };
}

exports.listRewards = async (req, res) => {
  try {
    const onlyActive = req.user.role !== 'admin';
    const [rows] = await pool.query(
      `SELECT r.*, s.name AS service_name
       FROM loyalty_rewards r LEFT JOIN services s ON s.id = r.service_id
       ${onlyActive ? 'WHERE r.is_active = 1' : ''}
       ORDER BY r.sort_order, r.points_required`
    );
    const config = await getLoyaltySettings();
    res.json({ success: true, data: rows, settings: config });
  } catch (err) {
    console.error('List rewards error:', err);
    res.status(500).json({ success: false, error: 'Failed to load rewards' });
  }
};

exports.createReward = async (req, res) => {
  try {
    const f = rewardFields(req.body);
    if (!f.title) return res.status(400).json({ success: false, error: 'Title is required' });
    if (f.reward_type === 'free_service' && !f.service_id) return res.status(400).json({ success: false, error: 'Pick the service this reward gives for free' });
    if (f.reward_type === 'discount_amount' && !(f.discount_amount > 0)) return res.status(400).json({ success: false, error: 'Discount amount is required' });
    const [r] = await pool.query('INSERT INTO loyalty_rewards SET ?', [f]);
    res.status(201).json({ success: true, data: { id: r.insertId, ...f } });
  } catch (err) {
    console.error('Create reward error:', err);
    res.status(500).json({ success: false, error: 'Failed to create reward' });
  }
};

exports.updateReward = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM loyalty_rewards WHERE id = ?', [req.params.rewardId]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Reward not found' });
    const f = rewardFields({ ...existing[0], ...req.body });
    await pool.query('UPDATE loyalty_rewards SET ? WHERE id = ?', [f, req.params.rewardId]);
    res.json({ success: true, data: { id: Number(req.params.rewardId), ...f } });
  } catch (err) {
    console.error('Update reward error:', err);
    res.status(500).json({ success: false, error: 'Failed to update reward' });
  }
};

exports.deleteReward = async (req, res) => {
  try {
    // Keep history intact — just retire it
    await pool.query('UPDATE loyalty_rewards SET is_active = 0 WHERE id = ?', [req.params.rewardId]);
    res.json({ success: true, message: 'Reward removed from the catalogue' });
  } catch (err) {
    console.error('Delete reward error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove reward' });
  }
};

function makeVoucherCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'GKR';
  for (let i = 0; i < 7; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

exports.redeemReward = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const customerId = req.user.role === 'admin' ? Number(req.body.customer_id) : req.user.id;
    if (!customerId) { await conn.rollback(); return res.status(400).json({ success: false, error: 'customer_id is required' }); }

    const config = await getLoyaltySettings(conn);
    if (!config.enabled) { await conn.rollback(); return res.status(400).json({ success: false, error: 'Rewards are paused right now' }); }

    const [rewards] = await conn.query('SELECT * FROM loyalty_rewards WHERE id = ? AND is_active = 1', [req.params.rewardId]);
    const reward = rewards[0];
    if (!reward) { await conn.rollback(); return res.status(404).json({ success: false, error: 'Reward not available' }); }

    await ensureLoyaltyRow(conn, customerId);
    const [cur] = await conn.query('SELECT points FROM loyalty WHERE customer_id = ? FOR UPDATE', [customerId]);
    const balance = Number(cur[0]?.points || 0);
    if (balance < reward.points_required) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: `You need ${reward.points_required - Math.floor(balance)} more points for this reward` });
    }

    const newBalance = balance - reward.points_required;
    await conn.query('UPDATE loyalty SET points = ? WHERE customer_id = ?', [newBalance, customerId]);

    const code = makeVoucherCode();
    const expiresAt = new Date(Date.now() + reward.validity_days * 864e5);
    const [ins] = await conn.query(
      `INSERT INTO loyalty_redemptions (customer_id, reward_id, reward_title, reward_type, service_id, discount_amount, points_spent, voucher_code, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, reward.id, reward.title, reward.reward_type, reward.service_id, reward.discount_amount, reward.points_required, code, expiresAt]
    );
    await conn.query(
      `INSERT INTO loyalty_transactions (customer_id, type, points, balance_after, reference_type, reference_id, description, created_by)
       VALUES (?, 'redeem', ?, ?, 'reward', ?, ?, ?)`,
      [customerId, -reward.points_required, newBalance, ins.insertId, `Redeemed for ${reward.title} (voucher ${code})`, req.user.id]
    );
    await conn.commit();

    require('../services/messagingService').notify(
      customerId,
      'REWARD_REDEEMED',
      {
        points_spent: reward.points_required,
        reward_title: reward.title,
        voucher_code: code,
        valid_till: expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      },
      { type: 'reward', id: ins.insertId }
    ).catch(() => {});

    res.json({
      success: true,
      message: `${reward.title} unlocked! Use voucher ${code} while booking.`,
      data: { voucher_code: code, expires_at: expiresAt, new_balance: newBalance, reward_type: reward.reward_type },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Redeem reward error:', err);
    res.status(500).json({ success: false, error: 'Failed to redeem reward' });
  } finally {
    conn.release();
  }
};

exports.myVouchers = async (req, res) => {
  try {
    await pool.query(
      "UPDATE loyalty_redemptions SET status = 'expired' WHERE customer_id = ? AND status = 'active' AND expires_at < NOW()",
      [req.user.id]
    );
    const [rows] = await pool.query(
      `SELECT lr.*, s.name AS service_name FROM loyalty_redemptions lr
       LEFT JOIN services s ON s.id = lr.service_id
       WHERE lr.customer_id = ? ORDER BY lr.status = 'active' DESC, lr.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('My vouchers error:', err);
    res.status(500).json({ success: false, error: 'Failed to load vouchers' });
  }
};

exports.listRedemptions = async (req, res) => {
  try {
    const { status } = req.query;
    const [rows] = await pool.query(
      `SELECT lr.*, u.name AS customer_name, u.mobile AS customer_mobile
       FROM loyalty_redemptions lr JOIN users u ON u.id = lr.customer_id
       ${status && status !== 'all' ? 'WHERE lr.status = ?' : ''}
       ORDER BY lr.created_at DESC LIMIT 200`,
      status && status !== 'all' ? [status] : []
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List redemptions error:', err);
    res.status(500).json({ success: false, error: 'Failed to load redemptions' });
  }
};

// Admin marks a voucher used at the counter, or cancels it (points refunded)
exports.updateRedemption = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { status } = req.body;
    if (!['used', 'cancelled', 'active'].includes(status)) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const [rows] = await conn.query('SELECT * FROM loyalty_redemptions WHERE id = ? FOR UPDATE', [req.params.redemptionId]);
    const r = rows[0];
    if (!r) { await conn.rollback(); return res.status(404).json({ success: false, error: 'Voucher not found' }); }

    if (status === 'cancelled' && r.status === 'active') {
      await ensureLoyaltyRow(conn, r.customer_id);
      const [cur] = await conn.query('SELECT points FROM loyalty WHERE customer_id = ? FOR UPDATE', [r.customer_id]);
      const newBalance = Number(cur[0]?.points || 0) + r.points_spent;
      await conn.query('UPDATE loyalty SET points = ? WHERE customer_id = ?', [newBalance, r.customer_id]);
      await conn.query(
        `INSERT INTO loyalty_transactions (customer_id, type, points, balance_after, reference_type, reference_id, description, created_by)
         VALUES (?, 'adjustment', ?, ?, 'reward', ?, ?, ?)`,
        [r.customer_id, r.points_spent, newBalance, r.id, `Voucher ${r.voucher_code} cancelled — points returned`, req.user.id]
      );
    }
    await conn.query(
      `UPDATE loyalty_redemptions SET status = ?, used_at = IF(? = 'used', NOW(), used_at) WHERE id = ?`,
      [status, status, r.id]
    );
    await conn.commit();
    res.json({ success: true, message: `Voucher marked ${status}` });
  } catch (err) {
    await conn.rollback();
    console.error('Update redemption error:', err);
    res.status(500).json({ success: false, error: 'Failed to update voucher' });
  } finally {
    conn.release();
  }
};

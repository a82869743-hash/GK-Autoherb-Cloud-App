const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { awardWelcomeRewardInternal } = require('./customerRewardsController');

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET environment variable is missing. Cannot generate tokens.');
  }
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, mobile: user.mobile },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

/**
 * POST /auth/register
 * Body: { name, mobile, password }
 */
exports.register = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    console.log("REGISTER BODY:", req.body);
    const { name, mobile, password, car_brand, car_model, car_reg_no, referral_code } = req.body;

    // Validate required fields
    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, error: 'Name, mobile, and password are required' });
    }

    // Check if mobile already exists
    const [existing] = await conn.query('SELECT id FROM users WHERE mobile = ?', [mobile]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Mobile already registered' });
    }

    await conn.beginTransaction();

    // Validate referral code if provided
    let referrerId = null;
    let referrerRewardPoints = 100;
    let refCodeRecord = null;

    if (referral_code) {
      const [codes] = await conn.query(
        'SELECT * FROM referral_codes WHERE code = ? AND is_active = 1',
        [referral_code.trim().toUpperCase()]
      );

      if (!codes.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, error: 'Invalid or inactive referral code' });
      }

      refCodeRecord = codes[0];

      // Check self-referral
      const [referrerUser] = await conn.query('SELECT mobile FROM users WHERE id = ?', [refCodeRecord.customer_id]);
      if (referrerUser.length && referrerUser[0].mobile === mobile) {
        await conn.rollback();
        return res.status(400).json({ success: false, error: 'Cannot refer yourself' });
      }

      // Check usage limits
      if (refCodeRecord.current_uses >= refCodeRecord.max_uses) {
        await conn.rollback();
        return res.status(400).json({ success: false, error: 'Referral code usage limit reached' });
      }

      referrerId = refCodeRecord.customer_id;
      referrerRewardPoints = refCodeRecord.reward_points;
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Default role
    const role = 'customer';

    // Generate unique referral code for new customer
    const userCode = 'GK' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Insert user
    const [result] = await conn.query(
      'INSERT INTO users (name, mobile, password_hash, role, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), mobile, password_hash, role, userCode, referrerId]
    );
    console.log("DB INSERT RESULT:", result);

    const userId = result.insertId;

    // Create unique referral code entry in referral_codes table
    let referralPointsSetting = 100;
    const [settingRow] = await conn.query('SELECT value FROM settings WHERE key_name = "referral_referrer_points"');
    if (settingRow.length) {
      referralPointsSetting = parseInt(settingRow[0].value) || 100;
    }

    await conn.query(
      'INSERT INTO referral_codes (customer_id, code, reward_points, max_uses, current_uses, is_active) VALUES (?, ?, ?, 10, 0, 1)',
      [userId, userCode, referralPointsSetting]
    );

    // Save referral links if provided
    if (referrerId) {
      // 1. Insert into v2_referrals (Phase 2 schema)
      await conn.query(
        `INSERT INTO v2_referrals (referrer_id, referred_id, referral_code, status, reward_given) 
         VALUES (?, ?, ?, 'pending', 0)`,
        [referrerId, userId, referral_code.trim().toUpperCase()]
      );

      // 2. Insert into referral_rewards (legacy schema)
      await conn.query(
        `INSERT INTO referral_rewards (referrer_id, referred_id, referral_code, reward_type, reward_value, status) 
         VALUES (?, ?, ?, 'points', ?, 'pending')`,
        [referrerId, userId, referral_code.trim().toUpperCase(), referrerRewardPoints]
      );

      // 3. Update uses count on referrer's code
      await conn.query(
        'UPDATE referral_codes SET current_uses = current_uses + 1 WHERE id = ?',
        [refCodeRecord.id]
      );
    }

    // ─── Save car during registration (if provided) ─────────
    if (car_brand && car_model) {
      await conn.query(
        `INSERT INTO vehicles (customer_id, brand, model, registration_no, is_primary)
         VALUES (?, ?, ?, ?, 1)`,
        [userId, car_brand.trim(), car_model.trim(), car_reg_no?.toUpperCase().trim() || null]
      );
      console.log(`Car saved for user ${userId}: ${car_brand} ${car_model}`);
    }

    // Award Welcome Reward automatically
    await awardWelcomeRewardInternal(userId, conn);

    await conn.commit();

    const user = { id: userId, name: name.trim(), mobile, role };
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: { user, token }
    });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (rollbackErr) { console.error('Rollback failed:', rollbackErr); }
    }
    console.error('Register SQL/Server error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Mobile already registered' });
    }
    res.status(500).json({ success: false, error: 'Internal server error during registration' });
  } finally {
    if (conn) conn.release();
  }
};

/**
 * POST /auth/login
 * Body: { mobile, password }
 */
exports.login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ success: false, error: 'Mobile and password are required' });
    }

    // Find user by mobile
    const [users] = await pool.query('SELECT * FROM users WHERE mobile = ?', [mobile]);

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials: User not found' });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials: Password incorrect' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
    };

    const token = generateToken(userData);

    res.json({
      success: true,
      data: { 
        user: userData,
        token
      },
    });
  } catch (err) {
    console.error('Login SQL/Server error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during login' });
  }
};

/**
 * GET /auth/me
 * Auth: Any
 */
exports.getMe = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, mobile, email, role, is_active, created_at, opt_out_promotional, custom_role_id, base_salary FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = users[0];
    let loyalty = null;

    if (user.role === 'customer') {
      const [loyaltyRows] = await pool.query(
        'SELECT credits, free_washes, wax_count, updated_at FROM loyalty WHERE customer_id = ?',
        [user.id]
      );
      if (loyaltyRows.length) loyalty = loyaltyRows[0];
    }

    // Fetch user permissions
    let permissions = [];
    if (user.role === 'admin' || user.role === 'super_admin') {
      const [allPerms] = await pool.query('SELECT permission_key FROM v2_permissions');
      permissions = allPerms.map(p => p.permission_key);
    } else if (user.custom_role_id) {
      const [rolePerms] = await pool.query(
        `SELECT p.permission_key FROM v2_role_permissions rp
         JOIN v2_permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = ?`,
        [user.custom_role_id]
      );
      permissions = rolePerms.map(p => p.permission_key);
    }

    res.json({
      success: true,
      data: { ...user, loyalty, permissions },
    });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};

/**
 * PUT /auth/profile
 * Auth: Any
 * Body: { name, email, address }
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, address, opt_out_promotional } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    // Since address is not a standard column in the DB, it may fail if we try to save it. 
    // We should ensure the query only updates existing columns, or we can omit address if it's missing from DB.
    // However, since we haven't altered the DB for address, we'll only update name, email and opt_out_promotional.
    
    await pool.query(
      'UPDATE users SET name = ?, email = ?, opt_out_promotional = ? WHERE id = ?',
      [name, email || null, opt_out_promotional ? 1 : 0, userId]
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update Profile error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

/**
 * POST /auth/change-password
 * Auth: Any
 * Body: { old_password, new_password }
 */
exports.changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ success: false, error: 'Both old and new passwords are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!users.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const valid = await bcrypt.compare(old_password, users[0].password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('ChangePassword error:', err);
    res.status(500).json({ success: false, error: 'Password change failed' });
  }
};

/**
 * POST /auth/admin/create-customer
 * Auth: Admin only
 * Body: { name, mobile, email?, password? }
 * Creates a customer account manually (admin flow)
 */
exports.adminCreateCustomer = async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, error: 'Name and mobile are required' });
    }

    // Check if mobile already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE mobile = ?', [mobile]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Mobile already registered' });
    }

    // Generate default password if not provided
    const defaultPassword = password || mobile.slice(-4) + 'GKA';
    const password_hash = await bcrypt.hash(defaultPassword, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, mobile, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), mobile, email || null, password_hash, 'customer']
    );

    const userId = result.insertId;

    // Create loyalty record
    await pool.query('INSERT INTO loyalty (customer_id) VALUES (?)', [userId]);

    // Award Welcome Reward automatically
    try {
      await awardWelcomeRewardInternal(userId);
    } catch (rewardErr) {
      console.error('Failed to award welcome reward during admin customer creation:', rewardErr.message);
    }

    console.log(`[AUTH] Admin created customer #${userId}: ${name} (${mobile})`);

    res.status(201).json({
      success: true,
      data: { id: userId, name: name.trim(), mobile, role: 'customer' },
      message: `Customer created. Default password: ${defaultPassword}`,
    });
  } catch (err) {
    console.error('adminCreateCustomer error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Mobile already registered' });
    }
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * POST /auth/refresh
 * Auth: Any (valid or recently-expired token)
 * Returns a fresh 1h token if the current token is still valid.
 * This enables soft session extension — frontend calls this periodically.
 */
exports.refreshToken = async (req, res) => {
  try {
    // req.user is set by auth middleware (token must still be valid)
    const [users] = await pool.query(
      'SELECT id, name, mobile, role FROM users WHERE id = ? AND is_active = 1',
      [req.user.id]
    );

    if (!users.length) {
      return res.status(401).json({ success: false, error: 'User not found or deactivated' });
    }

    const user = users[0];
    const newToken = generateToken(user);

    res.json({
      success: true,
      data: { token: newToken, user },
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
};

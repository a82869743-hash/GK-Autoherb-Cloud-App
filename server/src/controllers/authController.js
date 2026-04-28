const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET environment variable is missing. Cannot generate tokens.');
  }
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, mobile: user.mobile },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * POST /auth/register
 * Body: { name, mobile, password }
 */
exports.register = async (req, res) => {
  try {
    console.log("REGISTER BODY:", req.body);
    const { name, mobile, password, car_brand, car_model, car_reg_no } = req.body;

    // Validate required fields
    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, error: 'Name, mobile, and password are required' });
    }

    // Check if mobile already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE mobile = ?', [mobile]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Mobile already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Default role
    const role = 'customer';

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (name, mobile, password_hash, role) VALUES (?, ?, ?, ?)',
      [name.trim(), mobile, password_hash, role]
    );
    console.log("DB INSERT RESULT:", result);

    const userId = result.insertId;

    // ─── Save car during registration (if provided) ─────────
    if (car_brand && car_model) {
      try {
        await pool.query(
          `INSERT INTO vehicles (customer_id, brand, model, registration_no, is_primary)
           VALUES (?, ?, ?, ?, 1)`,
          [userId, car_brand.trim(), car_model.trim(), car_reg_no?.toUpperCase().trim() || null]
        );
        console.log(`Car saved for user ${userId}: ${car_brand} ${car_model}`);
      } catch (carErr) {
        // Non-fatal: log error but don't block registration
        console.error('Failed to save car during registration:', carErr.message);
      }
    }

    const user = { id: userId, name: name.trim(), mobile, role };
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: { user, token }
    });
  } catch (err) {
    console.error('Register SQL/Server error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Mobile already registered' });
    }
    res.status(500).json({ success: false, error: 'Internal server error during registration' });
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
      'SELECT id, name, mobile, email, role, is_active, created_at FROM users WHERE id = ?',
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

    res.json({
      success: true,
      data: { ...user, loyalty },
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
    const { name, email, address } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    // Since address is not a standard column in the DB, it may fail if we try to save it. 
    // We should ensure the query only updates existing columns, or we can omit address if it's missing from DB.
    // However, since we haven't altered the DB for address, we'll only update name and email.
    
    await pool.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name, email || null, userId]
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

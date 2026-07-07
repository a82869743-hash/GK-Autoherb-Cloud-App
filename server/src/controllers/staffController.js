const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// ─── LIST ALL STAFF ─────────────────────────
exports.list = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.mobile, u.email, u.is_active, u.created_at,
              u.custom_role_id, u.base_salary, r.role_name as custom_role_name,
              sp.specialisations
       FROM users u
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       LEFT JOIN v2_roles r ON u.custom_role_id = r.id
       WHERE u.role = 'staff' AND u.is_active = 1
       ORDER BY u.created_at DESC`
    );

    // Get today's attendance for each staff
    const today = new Date().toISOString().slice(0, 10);
    const [attendance] = await pool.query(
      `SELECT staff_id, status FROM staff_attendance WHERE att_date = ?`,
      [today]
    );
    const attMap = {};
    attendance.forEach(a => { attMap[a.staff_id] = a.status; });

    const data = rows.map(r => ({
      ...r,
      today_attendance: attMap[r.id] || null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('Staff list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET ONE STAFF ──────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.mobile, u.email, u.is_active, u.created_at,
              u.custom_role_id, u.base_salary, r.role_name as custom_role_name,
              sp.specialisations
       FROM users u
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       LEFT JOIN v2_roles r ON u.custom_role_id = r.id
       WHERE u.id = ? AND u.role = 'staff'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Staff not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Staff getOne error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CREATE STAFF ───────────────────────────
exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { name, mobile, password, specialisations, email, custom_role_id, base_salary } = req.body;
    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, error: 'Name, mobile, and password are required' });
    }

    // Validate mobile format (10 digits)
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ success: false, error: 'Mobile must be a 10-digit number' });
    }

    // Check duplicate mobile
    const [existing] = await conn.query('SELECT id FROM users WHERE mobile = ?', [mobile]);
    if (existing.length) return res.status(409).json({ success: false, error: 'Mobile number already in use' });

    await conn.beginTransaction();

    const password_hash = await bcrypt.hash(password, 10);
    const [userResult] = await conn.query(
      'INSERT INTO users (name, mobile, email, password_hash, role, custom_role_id, base_salary) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, mobile, email || null, password_hash, 'staff', custom_role_id || null, base_salary || 15000.00]
    );

    await conn.query(
      'INSERT INTO staff_profiles (user_id, specialisations) VALUES (?, ?)',
      [userResult.insertId, specialisations || null]
    );

    await conn.commit();
    res.status(201).json({ success: true, data: { id: userResult.insertId }, message: 'Staff created' });
  } catch (err) {
    await conn.rollback();
    console.error('Staff create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── UPDATE STAFF ───────────────────────────
exports.update = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { name, mobile, email, specialisations, custom_role_id, base_salary } = req.body;
    const [existing] = await conn.query('SELECT id FROM users WHERE id = ? AND role = ?', [req.params.id, 'staff']);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Staff not found' });

    await conn.beginTransaction();

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (mobile !== undefined) { updates.push('mobile = ?'); params.push(mobile); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (custom_role_id !== undefined) { updates.push('custom_role_id = ?'); params.push(custom_role_id || null); }
    if (base_salary !== undefined) { updates.push('base_salary = ?'); params.push(base_salary); }

    if (updates.length) {
      params.push(req.params.id);
      await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    if (specialisations !== undefined) {
      await conn.query(
        'INSERT INTO staff_profiles (user_id, specialisations) VALUES (?, ?) ON DUPLICATE KEY UPDATE specialisations = ?',
        [req.params.id, specialisations, specialisations]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Staff updated' });
  } catch (err) {
    await conn.rollback();
    console.error('Staff update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── MARK ATTENDANCE ────────────────────────
exports.markAttendance = async (req, res) => {
  try {
    const { status, note, att_date, check_in_time, check_out_time } = req.body;
    const staffId = req.params.id;
    const date = att_date || new Date().toISOString().slice(0, 10);

    if (!status || !['present', 'absent', 'half_day'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // Verify staff exists
    const [staff] = await pool.query('SELECT id FROM users WHERE id = ? AND role = ?', [staffId, 'staff']);
    if (!staff.length) return res.status(404).json({ success: false, error: 'Staff not found' });

    // Build timestamps from date + time (e.g. "2026-05-02" + "09:30" → "2026-05-02 09:30:00")
    const checkIn = check_in_time ? `${date} ${check_in_time}:00` : null;
    const checkOut = check_out_time ? `${date} ${check_out_time}:00` : null;

    // Upsert attendance with check-in/out times
    await pool.query(
      `INSERT INTO staff_attendance (staff_id, att_date, status, note, check_in_time, check_out_time)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note), check_in_time = VALUES(check_in_time), check_out_time = VALUES(check_out_time)`,
      [staffId, date, status, note || null, checkIn, checkOut]
    );

    res.json({ success: true, message: 'Attendance marked' });
  } catch (err) {
    console.error('Attendance mark error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET ATTENDANCE ─────────────────────────
exports.getAttendance = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    let where = 'staff_id = ?';
    const params = [req.params.id];

    if (from_date) { where += ' AND att_date >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND att_date <= ?'; params.push(to_date); }

    const [rows] = await pool.query(
      `SELECT * FROM staff_attendance WHERE ${where} ORDER BY att_date DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Attendance get error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADD PAYMENT ────────────────────────────
exports.addPayment = async (req, res) => {
  try {
    const { amount, purpose, payment_date } = req.body;
    const staffId = req.params.id;

    if (!amount || !purpose || !payment_date) {
      return res.status(400).json({ success: false, error: 'Amount, purpose, and payment date are required' });
    }

    // Verify staff exists
    const [staff] = await pool.query('SELECT id FROM users WHERE id = ? AND role = ?', [staffId, 'staff']);
    if (!staff.length) return res.status(404).json({ success: false, error: 'Staff not found' });

    const [result] = await pool.query(
      'INSERT INTO staff_payments (staff_id, amount, purpose, payment_date) VALUES (?, ?, ?, ?)',
      [staffId, amount, purpose, payment_date]
    );

    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Payment added' });
  } catch (err) {
    console.error('Payment add error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET PAYMENTS ───────────────────────────
exports.getPayments = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM staff_payments WHERE staff_id = ? ORDER BY payment_date DESC',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Payment get error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── COMPLETE PAYMENT (mark as paid) ────────
exports.completePayment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id: staffId, pid } = req.params;

    const [payment] = await conn.query(
      'SELECT * FROM staff_payments WHERE id = ? AND staff_id = ? AND status = ?',
      [pid, staffId, 'pending']
    );
    if (!payment.length) return res.status(404).json({ success: false, error: 'Pending payment not found' });

    await conn.beginTransaction();

    // Mark as paid
    await conn.query(
      'UPDATE staff_payments SET status = ?, paid_at = NOW() WHERE id = ?',
      ['paid', pid]
    );

    // Create transaction record
    await conn.query(
      `INSERT INTO transactions (type, reference_id, amount, direction, note, transaction_date, created_by)
       VALUES (?, ?, ?, ?, ?, CURDATE(), ?)`,
      ['staff_payment', parseInt(pid), payment[0].amount, 'out', `Staff payment: ${payment[0].purpose}`, req.user.id]
    );

    await conn.commit();
    res.json({ success: true, message: 'Payment marked as paid' });
  } catch (err) {
    await conn.rollback();
    console.error('Payment complete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── GET MY PAYMENTS (staff self-service) ───
exports.getMyPayments = async (req, res) => {
  try {
    const [payments] = await pool.query(
      'SELECT * FROM staff_payments WHERE staff_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error('getMyPayments error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
};

// ─── STAFF CHECK-IN ─────────────────────────
exports.checkIn = async (req, res) => {
  try {
    const staffId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    // Check if already checked in today
    const [existing] = await pool.query(
      'SELECT id, check_in_time FROM staff_attendance WHERE staff_id = ? AND att_date = ?',
      [staffId, today]
    );

    if (existing.length && existing[0].check_in_time) {
      return res.status(422).json({ success: false, error: 'Already checked in today' });
    }

    if (existing.length) {
      // Update existing record (e.g., absentee cron created it)
      await pool.query(
        "UPDATE staff_attendance SET status = 'present', check_in_time = NOW(), note = 'Self check-in' WHERE id = ?",
        [existing[0].id]
      );
    } else {
      // Create new record
      await pool.query(
        "INSERT INTO staff_attendance (staff_id, att_date, status, check_in_time, note) VALUES (?, ?, 'present', NOW(), 'Self check-in')",
        [staffId, today]
      );
    }

    console.log(`[STAFF] Check-in: staff ${staffId} at ${new Date().toISOString()}`);
    res.json({ success: true, message: 'Checked in successfully' });
  } catch (err) {
    console.error('Staff check-in error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── STAFF CHECK-OUT ────────────────────────
exports.checkOut = async (req, res) => {
  try {
    const staffId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const [existing] = await pool.query(
      'SELECT id, check_in_time, check_out_time FROM staff_attendance WHERE staff_id = ? AND att_date = ?',
      [staffId, today]
    );

    if (!existing.length || !existing[0].check_in_time) {
      return res.status(422).json({ success: false, error: 'Must check in before checking out' });
    }
    if (existing[0].check_out_time) {
      return res.status(422).json({ success: false, error: 'Already checked out today' });
    }

    await pool.query(
      'UPDATE staff_attendance SET check_out_time = NOW() WHERE id = ?',
      [existing[0].id]
    );

    console.log(`[STAFF] Check-out: staff ${staffId} at ${new Date().toISOString()}`);
    res.json({ success: true, message: 'Checked out successfully' });
  } catch (err) {
    console.error('Staff check-out error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET MY ATTENDANCE (staff self-service) ──
exports.getMyAttendance = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    let where = 'staff_id = ?';
    const params = [req.user.id];

    if (from_date) { where += ' AND att_date >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND att_date <= ?'; params.push(to_date); }

    const [rows] = await pool.query(
      `SELECT * FROM staff_attendance WHERE ${where} ORDER BY att_date DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getMyAttendance error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};


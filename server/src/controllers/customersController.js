const pool = require('../config/db');

// ─── LIST ALL CUSTOMERS ─────────────────────────
exports.list = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = "role = 'customer'";
    const params = [];

    if (search) {
      where += " AND (name LIKE ? OR mobile LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s);
    }

    const [rows] = await pool.query(`
      SELECT id, name, mobile, email, created_at, is_active
      FROM users
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [totalRows] = await pool.query(`SELECT COUNT(id) as total FROM users WHERE ${where}`, params);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalRows[0].total
      }
    });
  } catch (err) {
    console.error('Customer list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET CUSTOMER DETAILS & HISTORY ─────────────
exports.getDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get user details
    const [userRows] = await pool.query("SELECT id, name, mobile, email, created_at, is_active FROM users WHERE id = ? AND role = 'customer'", [id]);
    if (!userRows.length) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    const customer = userRows[0];

    // 2. Get vehicles
    const [vehicles] = await pool.query("SELECT * FROM vehicles WHERE customer_id = ?", [id]);
    
    // 3. Get history notes
    const [notes] = await pool.query("SELECT id, note, created_at FROM customer_notes WHERE customer_id = ? ORDER BY created_at DESC", [id]);

    res.json({
      success: true,
      data: {
        ...customer,
        vehicles,
        notes
      }
    });
  } catch (err) {
    console.error('Customer detail error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADD CUSTOMER NOTE (CRM HISTORY) ────────────
exports.addNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, error: 'Note content is required' });
    }

    const [result] = await pool.query(
      "INSERT INTO customer_notes (customer_id, note) VALUES (?, ?)",
      [id, note.trim()]
    );

    res.json({
      success: true,
      data: { id: result.insertId, customer_id: id, note: note.trim(), created_at: new Date() },
      message: 'Note added successfully'
    });
  } catch (err) {
    console.error('Add note error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── MANUAL REGISTRATION ─────────────────────────
exports.createManual = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { name, mobile, email, brand, model, category, registration_no, package_id, price } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, error: 'Name and mobile are required' });
    }

    // Check if user exists
    let customerId;
    const [existing] = await connection.query("SELECT id FROM users WHERE mobile = ?", [mobile]);
    if (existing.length > 0) {
      customerId = existing[0].id;
    } else {
      const [userResult] = await connection.query(
        "INSERT INTO users (name, mobile, email, role, password_hash) VALUES (?, ?, ?, 'customer', 'manual')",
        [name, mobile, email || null]
      );
      customerId = userResult.insertId;
    }

    // Add Vehicle
    let vehicleId = null;
    if (brand && model) {
      // make existing vehicles non-primary
      await connection.query("UPDATE vehicles SET is_primary = 0 WHERE customer_id = ?", [customerId]);
      
      const [vehResult] = await connection.query(
        "INSERT INTO vehicles (customer_id, registration_no, brand, model, category, is_primary) VALUES (?, ?, ?, ?, ?, ?)",
        [customerId, registration_no || null, brand, model, category || null, 1]
      );
      vehicleId = vehResult.insertId;
    }

    // Add Package
    if (package_id && vehicleId) {
      // Auto approve
      await connection.query(
        "INSERT INTO package_requests (customer_id, vehicle_id, package_id, status, price, approved_at) VALUES (?, ?, ?, 'approved', ?, NOW())",
        [customerId, vehicleId, package_id, price || 0]
      );
      
      // Also insert into user_packages so the user actually gets the package!
      await connection.query(
        "INSERT INTO user_packages (user_id, package_id, end_date) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 YEAR))",
        [customerId, package_id]
      );
      
      await connection.query(
        "INSERT INTO customer_notes (customer_id, note) VALUES (?, ?)",
        [customerId, `Walk-in customer registered with manual package assignment (Package ID: ${package_id}).`]
      );
    } else {
      await connection.query(
        "INSERT INTO customer_notes (customer_id, note) VALUES (?, ?)",
        [customerId, `Walk-in customer registered manually.`]
      );
    }

    await connection.commit();
    res.json({ success: true, data: { customer_id: customerId, vehicle_id: vehicleId } });
  } catch (err) {
    await connection.rollback();
    console.error('Manual create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
};

exports.listManual = async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT u.id as customer_id, u.name, u.mobile, v.brand, v.model, v.registration_no,
             pr.package_id, p.name as package_name, pr.status, u.created_at
      FROM users u
      LEFT JOIN vehicles v ON u.id = v.customer_id
      LEFT JOIN package_requests pr ON v.id = pr.vehicle_id
      LEFT JOIN packages p ON pr.package_id = p.id
      WHERE u.role = 'customer'
    `;
    const params = [];
    
    if (search) {
      query += " AND (u.name LIKE ? OR u.mobile LIKE ? OR v.registration_no LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    
    query += " ORDER BY u.created_at DESC LIMIT 100";
    
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Manual list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};


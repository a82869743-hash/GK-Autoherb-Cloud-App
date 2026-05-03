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
      ORDER BY name ASC
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

const pool = require('../config/db');

// ─── LIST INQUIRIES ─────────────────────────
exports.list = async (req, res) => {
  try {
    const { status, source } = req.query;
    let where = '1=1';
    let params = [];
    
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (source) { where += ' AND source = ?'; params.push(source); }

    const [rows] = await pool.query(`
      SELECT i.*, u.name as submitted_by_name 
      FROM inquiries i 
      LEFT JOIN users u ON i.submitted_by = u.id 
      WHERE ${where} 
      ORDER BY i.created_at DESC
    `, params);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Inquiries list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET ONE ────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inquiries WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Inquiry not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Inquiry getOne error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CREATE INQUIRY (Staff or Website) ──────
exports.create = async (req, res) => {
  try {
    const { source, name, mobile, email, vehicle_brand, vehicle_model, services_interested } = req.body;
    let submitted_by = null;

    // If a staff is submitting it, record them
    if (req.user && req.user.role === 'staff') {
      submitted_by = req.user.id;
    }

    if (!name || !mobile) {
      return res.status(400).json({ success: false, error: 'Name and mobile are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO inquiries (source, name, mobile, email, vehicle_brand, vehicle_model, services_interested, submitted_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [source || 'website', name, mobile, email || null, vehicle_brand || null, vehicle_model || null, services_interested || null, submitted_by]
    );

    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Inquiry submitted' });
  } catch (err) {
    console.error('Inquiry create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── UPDATE STATUS ──────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'followed_up', 'converted'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const [rows] = await pool.query('SELECT id FROM inquiries WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Inquiry not found' });

    await pool.query('UPDATE inquiries SET status = ? WHERE id = ?', [status, req.params.id]);
    
    res.json({ success: true, message: 'Inquiry status updated' });
  } catch (err) {
    console.error('Inquiry update status error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── DELETE ─────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM inquiries WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Inquiry not found' });

    await pool.query('DELETE FROM inquiries WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Inquiry deleted' });
  } catch (err) {
    console.error('Inquiry delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CONVERT TO JOB CART PRE-FILL ───────────
exports.convert = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inquiries WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Inquiry not found' });

    const inquiry = rows[0];

    if (inquiry.status === 'converted') {
      return res.status(400).json({ success: false, error: 'Inquiry already converted' });
    }

    // Auto-update status to converted
    await pool.query('UPDATE inquiries SET status = "converted" WHERE id = ?', [req.params.id]);

    // Return structured payload matching Job Cart POST body
    res.json({
      success: true,
      data: {
        customer_name: inquiry.name,
        customer_mobile: inquiry.mobile,
        customer_email: inquiry.email,
        car_brand: inquiry.vehicle_brand,
        car_model: inquiry.vehicle_model,
        notes: `Converted from inquiry #${inquiry.id}. Interested in: ${inquiry.services_interested || 'General Service'}`
      },
      message: 'Inquiry ready to convert'
    });
  } catch (err) {
    console.error('Inquiry convert error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

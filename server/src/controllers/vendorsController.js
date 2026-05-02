const pool = require('../config/db');

// ─── LIST VENDORS ───────────────────────────
exports.list = async (req, res) => {
  try {
    const { search, active_only } = req.query;
    let where = '1=1';
    const params = [];

    if (search) {
      where += ' AND (name LIKE ? OR phone LIKE ? OR service_type LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (active_only === 'true') {
      where += ' AND is_active = 1';
    }

    const [rows] = await pool.query(
      `SELECT * FROM vendors WHERE ${where} ORDER BY name ASC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Vendor list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET ONE VENDOR ─────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Vendor not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Vendor getOne error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CREATE VENDOR ──────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, phone, email, service_type, address } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Vendor name is required' });

    const [result] = await pool.query(
      'INSERT INTO vendors (name, phone, email, service_type, address) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), phone || null, email || null, service_type || null, address || null]
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Vendor created' });
  } catch (err) {
    console.error('Vendor create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── UPDATE VENDOR ──────────────────────────
exports.update = async (req, res) => {
  try {
    const { name, phone, email, service_type, address, is_active } = req.body;
    const [existing] = await pool.query('SELECT id FROM vendors WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Vendor not found' });

    const updates = []; const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (service_type !== undefined) { updates.push('service_type = ?'); params.push(service_type); }
    if (address !== undefined) { updates.push('address = ?'); params.push(address); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Vendor updated' });
  } catch (err) {
    console.error('Vendor update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── DELETE VENDOR ──────────────────────────
exports.delete = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM vendors WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Vendor not found' });
    await pool.query('DELETE FROM vendors WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Vendor deleted' });
  } catch (err) {
    console.error('Vendor delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const pool = require('../config/db');

// ─── LIST ───────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { search, active_only } = req.query;
    let where = '1=1';
    const params = [];
    if (search) { where += ' AND name LIKE ?'; params.push(`%${search}%`); }
    if (active_only === 'true') { where += ' AND is_active = 1'; }

    const [rows] = await pool.query(`SELECT * FROM services WHERE ${where} ORDER BY name ASC`, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Services list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET ONE ────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Service not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Service getOne error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CREATE ─────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, description, price_hatchback = 0, price_medium_hatchback = 0, price_sedan = 0, price_premium_sedan = 0, price_suv = 0, is_active = true } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Service name is required' });

    const [result] = await pool.query(
      'INSERT INTO services (name, description, price_hatchback, price_medium_hatchback, price_sedan, price_premium_sedan, price_suv, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || null, price_hatchback, price_medium_hatchback, price_sedan, price_premium_sedan, price_suv, is_active ? 1 : 0]
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Service created' });
  } catch (err) {
    console.error('Service create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── UPDATE ─────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { name, description, price_hatchback, price_medium_hatchback, price_sedan, price_premium_sedan, price_suv, is_active } = req.body;
    const [existing] = await pool.query('SELECT id FROM services WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Service not found' });

    const updates = []; const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (price_hatchback !== undefined) { updates.push('price_hatchback = ?'); params.push(price_hatchback); }
    if (price_medium_hatchback !== undefined) { updates.push('price_medium_hatchback = ?'); params.push(price_medium_hatchback); }
    if (price_sedan !== undefined) { updates.push('price_sedan = ?'); params.push(price_sedan); }
    if (price_premium_sedan !== undefined) { updates.push('price_premium_sedan = ?'); params.push(price_premium_sedan); }
    if (price_suv !== undefined) { updates.push('price_suv = ?'); params.push(price_suv); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Service updated' });
  } catch (err) {
    console.error('Service update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── TOGGLE ACTIVE ──────────────────────────
exports.toggleActive = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT is_active FROM services WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Service not found' });
    await pool.query('UPDATE services SET is_active = ? WHERE id = ?', [rows[0].is_active ? 0 : 1, req.params.id]);
    res.json({ success: true, message: rows[0].is_active ? 'Service deactivated' : 'Service activated' });
  } catch (err) {
    console.error('Service toggle error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── DELETE ─────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM services WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Service not found' });
    await pool.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) {
    console.error('Service delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

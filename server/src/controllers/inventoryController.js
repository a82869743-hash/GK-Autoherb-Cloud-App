const pool = require('../config/db');

// ─── LIST ───────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { search, low_stock, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'is_deleted = 0';
    const params = [];

    if (search) {
      where += ' AND product_name LIKE ?';
      params.push(`%${search}%`);
    }

    if (low_stock === 'true' || low_stock === '1') {
      where += ' AND quantity <= low_stock_threshold';
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM inventory WHERE ${where}`, params);

    const [rows] = await pool.query(
      `SELECT *, (quantity <= low_stock_threshold) AS is_low_stock
       FROM inventory WHERE ${where}
       ORDER BY product_name ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: rows.map(r => ({ ...r, is_low_stock: !!r.is_low_stock })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRows[0].total },
    });
  } catch (err) {
    console.error('Inventory list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET ONE ────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT *, (quantity <= low_stock_threshold) AS is_low_stock FROM inventory WHERE id = ? AND is_deleted = 0',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: { ...rows[0], is_low_stock: !!rows[0].is_low_stock } });
  } catch (err) {
    console.error('Inventory getOne error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CREATE ─────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { product_name, unit = 'pcs', quantity = 0, low_stock_threshold = 5 } = req.body;
    if (!product_name) return res.status(400).json({ success: false, error: 'Product name is required' });

    const [result] = await pool.query(
      'INSERT INTO inventory (product_name, unit, quantity, low_stock_threshold) VALUES (?, ?, ?, ?)',
      [product_name, unit, quantity, low_stock_threshold]
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Product created' });
  } catch (err) {
    console.error('Inventory create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── UPDATE ─────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { product_name, unit, low_stock_threshold } = req.body;
    const [existing] = await pool.query('SELECT id FROM inventory WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Product not found' });

    const updates = [];
    const params = [];
    if (product_name !== undefined) { updates.push('product_name = ?'); params.push(product_name); }
    if (unit !== undefined) { updates.push('unit = ?'); params.push(unit); }
    if (low_stock_threshold !== undefined) { updates.push('low_stock_threshold = ?'); params.push(low_stock_threshold); }

    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields to update' });

    params.push(req.params.id);
    await pool.query(`UPDATE inventory SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Product updated' });
  } catch (err) {
    console.error('Inventory update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADJUST QUANTITY (delta) ────────────────
exports.adjustQuantity = async (req, res) => {
  try {
    const { delta } = req.body;
    if (delta === undefined || delta === null) return res.status(400).json({ success: false, error: 'Delta is required' });

    const [existing] = await pool.query('SELECT id, quantity FROM inventory WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Product not found' });

    await pool.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [parseFloat(delta), req.params.id]);

    const [updated] = await pool.query(
      'SELECT *, (quantity <= low_stock_threshold) AS is_low_stock FROM inventory WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true, data: { ...updated[0], is_low_stock: !!updated[0].is_low_stock }, message: 'Quantity adjusted' });
  } catch (err) {
    console.error('Inventory adjust error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── SOFT DELETE ────────────────────────────
exports.softDelete = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM inventory WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Product not found' });

    await pool.query('UPDATE inventory SET is_deleted = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('Inventory delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

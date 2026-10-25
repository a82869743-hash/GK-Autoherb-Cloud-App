const pool = require('../config/db');

const KINDS = ['ppf', 'ceramic', 'both'];

// Public: brands shown to customers (optionally only those for ppf / ceramic)
exports.list = async (req, res) => {
  try {
    const { kind, all } = req.query;
    const where = [];
    const params = [];
    if (!(all && req.user?.role === 'admin')) where.push('is_active = 1');
    if (kind === 'ppf' || kind === 'ceramic') {
      where.push("(applies_to = ? OR applies_to = 'both')");
      params.push(kind);
    }
    const [rows] = await pool.query(
      `SELECT * FROM product_brands ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY sort_order ASC, name ASC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List product brands error:', err);
    res.status(500).json({ success: false, error: 'Failed to load brands' });
  }
};

function pickFields(body, file) {
  const out = {};
  if (body.name !== undefined) out.name = String(body.name).trim().slice(0, 80);
  if (body.tagline !== undefined) out.tagline = String(body.tagline || '').trim().slice(0, 160) || null;
  if (body.warranty_note !== undefined) out.warranty_note = String(body.warranty_note || '').trim().slice(0, 120) || null;
  if (body.applies_to !== undefined && KINDS.includes(body.applies_to)) out.applies_to = body.applies_to;
  if (body.sort_order !== undefined) out.sort_order = parseInt(body.sort_order) || 0;
  if (body.is_active !== undefined) out.is_active = body.is_active === true || body.is_active === 'true' || body.is_active === 1 || body.is_active === '1' ? 1 : 0;
  if (file) out.logo_url = file.path || file.secure_url;
  else if (body.logo_url !== undefined) out.logo_url = String(body.logo_url || '').trim() || null;
  return out;
}

exports.create = async (req, res) => {
  try {
    const f = pickFields(req.body, req.file);
    if (!f.name) return res.status(400).json({ success: false, error: 'Brand name is required' });
    const [r] = await pool.query('INSERT INTO product_brands SET ?', [f]);
    res.status(201).json({ success: true, data: { id: r.insertId, ...f } });
  } catch (err) {
    console.error('Create product brand error:', err);
    res.status(500).json({ success: false, error: 'Failed to add brand' });
  }
};

exports.update = async (req, res) => {
  try {
    const f = pickFields(req.body, req.file);
    if (f.name === '') return res.status(400).json({ success: false, error: 'Brand name is required' });
    if (!Object.keys(f).length) return res.status(400).json({ success: false, error: 'Nothing to update' });
    const [r] = await pool.query('UPDATE product_brands SET ? WHERE id = ?', [f, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ success: false, error: 'Brand not found' });
    res.json({ success: true, message: 'Brand updated' });
  } catch (err) {
    console.error('Update product brand error:', err);
    res.status(500).json({ success: false, error: 'Failed to update brand' });
  }
};

exports.remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM product_brands WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Brand removed' });
  } catch (err) {
    console.error('Delete product brand error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove brand' });
  }
};

const pool = require('../config/db');

// Helper: fetch related services & products for a package
async function enrichPackage(pkg) {
  const [services] = await pool.query(
    `SELECT s.id, s.name, s.price_hatchback, s.price_medium_hatchback, s.price_sedan, s.price_premium_sedan, s.price_suv
     FROM package_services ps JOIN services s ON ps.service_id = s.id
     WHERE ps.package_id = ?`, [pkg.id]
  );
  const [products] = await pool.query(
    `SELECT pp.id, pp.product_id, pp.quantity, i.product_name, i.unit
     FROM package_products pp JOIN inventory i ON pp.product_id = i.id
     WHERE pp.package_id = ?`, [pkg.id]
  );
  return { ...pkg, services, products };
}

// ─── LIST ───────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { published_only } = req.query;
    let where = '1=1';
    if (published_only === 'true') where += ' AND is_published = 1';

    const [rows] = await pool.query(`SELECT * FROM packages WHERE ${where} ORDER BY name ASC`);
    const enriched = await Promise.all(rows.map(enrichPackage));
    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Packages list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET ONE ────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM packages WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Package not found' });
    const enriched = await enrichPackage(rows[0]);
    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Package getOne error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CREATE ─────────────────────────────────
exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      name, description, price_hatchback = 0, price_medium_hatchback = 0, price_sedan = 0, price_premium_sedan = 0, price_suv = 0,
      wash_count = 0, wax_count = 0, is_published = false,
      service_ids = [], products = []
    } = req.body;

    if (!name) { await conn.rollback(); return res.status(400).json({ success: false, error: 'Package name is required' }); }

    const [result] = await conn.query(
      'INSERT INTO packages (name, description, price_hatchback, price_medium_hatchback, price_sedan, price_premium_sedan, price_suv, wash_count, wax_count, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || null, price_hatchback, price_medium_hatchback, price_sedan, price_premium_sedan, price_suv, wash_count, wax_count, is_published ? 1 : 0]
    );
    const pkgId = result.insertId;

    // Insert service links
    for (const sid of service_ids) {
      await conn.query('INSERT INTO package_services (package_id, service_id) VALUES (?, ?)', [pkgId, sid]);
    }

    // Insert product links
    for (const p of products) {
      await conn.query('INSERT INTO package_products (package_id, product_id, quantity) VALUES (?, ?, ?)', [pkgId, p.product_id, p.quantity || 1]);
    }

    await conn.commit();
    res.status(201).json({ success: true, data: { id: pkgId }, message: 'Package created' });
  } catch (err) {
    await conn.rollback();
    console.error('Package create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally { conn.release(); }
};

// ─── UPDATE ─────────────────────────────────
exports.update = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const {
      name, description, price_hatchback, price_medium_hatchback, price_sedan, price_premium_sedan, price_suv,
      wash_count, wax_count, is_published,
      service_ids, products
    } = req.body;

    const [existing] = await conn.query('SELECT id FROM packages WHERE id = ?', [id]);
    if (!existing.length) { await conn.rollback(); return res.status(404).json({ success: false, error: 'Package not found' }); }

    const updates = []; const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (price_hatchback !== undefined) { updates.push('price_hatchback = ?'); params.push(price_hatchback); }
    if (price_medium_hatchback !== undefined) { updates.push('price_medium_hatchback = ?'); params.push(price_medium_hatchback); }
    if (price_sedan !== undefined) { updates.push('price_sedan = ?'); params.push(price_sedan); }
    if (price_premium_sedan !== undefined) { updates.push('price_premium_sedan = ?'); params.push(price_premium_sedan); }
    if (price_suv !== undefined) { updates.push('price_suv = ?'); params.push(price_suv); }
    if (wash_count !== undefined) { updates.push('wash_count = ?'); params.push(wash_count); }
    if (wax_count !== undefined) { updates.push('wax_count = ?'); params.push(wax_count); }
    if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published ? 1 : 0); }

    if (updates.length) {
      params.push(id);
      await conn.query(`UPDATE packages SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Replace service links
    if (service_ids !== undefined) {
      await conn.query('DELETE FROM package_services WHERE package_id = ?', [id]);
      for (const sid of service_ids) {
        await conn.query('INSERT INTO package_services (package_id, service_id) VALUES (?, ?)', [id, sid]);
      }
    }

    // Replace product links
    if (products !== undefined) {
      await conn.query('DELETE FROM package_products WHERE package_id = ?', [id]);
      for (const p of products) {
        await conn.query('INSERT INTO package_products (package_id, product_id, quantity) VALUES (?, ?, ?)', [id, p.product_id, p.quantity || 1]);
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Package updated' });
  } catch (err) {
    await conn.rollback();
    console.error('Package update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally { conn.release(); }
};

// ─── TOGGLE PUBLISH ─────────────────────────
exports.togglePublish = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT is_published FROM packages WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Package not found' });
    await pool.query('UPDATE packages SET is_published = ? WHERE id = ?', [rows[0].is_published ? 0 : 1, req.params.id]);
    res.json({ success: true, message: rows[0].is_published ? 'Package unpublished' : 'Package published' });
  } catch (err) {
    console.error('Package toggle error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── DELETE ─────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM packages WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Package not found' });
    await pool.query('DELETE FROM packages WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Package deleted' });
  } catch (err) {
    console.error('Package delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

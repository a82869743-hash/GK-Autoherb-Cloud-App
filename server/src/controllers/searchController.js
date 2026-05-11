/**
 * ═══════════════════════════════════════════════════════════
 * SEARCH CONTROLLER — Live Autocomplete APIs
 * ═══════════════════════════════════════════════════════════
 * Provides debounced, optimized search across:
 * - Customers
 * - Vehicles
 * - Inventory
 * - Vendors
 */

const pool = require('../config/db');

// ─── SEARCH CUSTOMERS ────────────────────────
exports.customers = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const search = `%${q}%`;
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.mobile, u.email,
        (SELECT COUNT(*) FROM vehicles WHERE customer_id = u.id) AS vehicle_count,
        (SELECT COUNT(*) FROM job_carts jc JOIN vehicles v ON jc.vehicle_id = v.id WHERE v.customer_id = u.id) AS job_count
      FROM users u
      WHERE u.role = 'customer' AND u.is_active = 1
        AND (u.name LIKE ? OR u.mobile LIKE ? OR u.email LIKE ?)
      ORDER BY
        CASE WHEN u.name LIKE ? THEN 0
             WHEN u.mobile LIKE ? THEN 1
             ELSE 2 END,
        u.name ASC
      LIMIT ?
    `, [search, search, search, `${q}%`, `${q}%`, parseInt(limit)]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Search customers error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

// ─── SEARCH VEHICLES ─────────────────────────
exports.vehicles = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const search = `%${q}%`;
    const [rows] = await pool.query(`
      SELECT v.id, v.registration_no, v.brand, v.model, v.customer_id,
        u.name AS customer_name, u.mobile AS customer_mobile
      FROM vehicles v
      JOIN users u ON v.customer_id = u.id
      WHERE v.registration_no LIKE ? OR v.brand LIKE ? OR v.model LIKE ?
        OR u.name LIKE ? OR u.mobile LIKE ?
      ORDER BY
        CASE WHEN v.registration_no LIKE ? THEN 0 ELSE 1 END,
        v.registration_no ASC
      LIMIT ?
    `, [search, search, search, search, search, `${q}%`, parseInt(limit)]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Search vehicles error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

// ─── SEARCH INVENTORY ────────────────────────
exports.inventory = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const search = `%${q}%`;
    const [rows] = await pool.query(`
      SELECT id, product_name, unit, quantity, low_stock_threshold,
        (quantity <= low_stock_threshold) AS is_low_stock
      FROM inventory
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
        AND (product_name LIKE ? OR unit LIKE ?)
      ORDER BY
        CASE WHEN product_name LIKE ? THEN 0 ELSE 1 END,
        product_name ASC
      LIMIT ?
    `, [search, search, `${q}%`, parseInt(limit)]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Search inventory error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

// ─── SEARCH VENDORS ──────────────────────────
exports.vendors = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const search = `%${q}%`;
    const [rows] = await pool.query(`
      SELECT id, name, phone, email, service_type, address
      FROM vendors
      WHERE is_active = 1
        AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR service_type LIKE ?)
      ORDER BY
        CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
        name ASC
      LIMIT ?
    `, [search, search, search, search, `${q}%`, parseInt(limit)]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Search vendors error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

// ─── GLOBAL SEARCH (across all entities) ─────
exports.global = async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: { customers: [], vehicles: [], inventory: [], vendors: [] } });

    const search = `%${q}%`;
    const lim = parseInt(limit);

    const [customers] = await pool.query(
      `SELECT id, name, mobile FROM users WHERE role = 'customer' AND is_active = 1 AND (name LIKE ? OR mobile LIKE ?) LIMIT ?`,
      [search, search, lim]
    );
    const [vehicles] = await pool.query(
      `SELECT v.id, v.registration_no, v.brand, v.model, u.name AS customer_name FROM vehicles v JOIN users u ON v.customer_id = u.id WHERE v.registration_no LIKE ? OR v.brand LIKE ? LIMIT ?`,
      [search, search, lim]
    );
    const [inventory] = await pool.query(
      `SELECT id, product_name, quantity FROM inventory WHERE (is_deleted = 0 OR is_deleted IS NULL) AND product_name LIKE ? LIMIT ?`,
      [search, lim]
    );
    const [vendors] = await pool.query(
      `SELECT id, name, phone FROM vendors WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ?) LIMIT ?`,
      [search, search, lim]
    );

    res.json({ success: true, data: { customers, vehicles, inventory, vendors } });
  } catch (err) {
    console.error('Global search error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

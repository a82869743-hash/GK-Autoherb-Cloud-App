const pool = require('../config/db');

// Helper: fetch related services & products for a package
async function enrichPackage(pkg) {
  const [services] = await pool.query(
    `SELECT ps.id AS ps_id, ps.total_count, s.id, s.name, s.price_hatchback, s.price_medium_hatchback, s.price_sedan, s.price_premium_sedan, s.price_suv
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
// Role-based filtering: Admin sees all, Customer/public sees only active + visible
exports.list = async (req, res) => {
  try {
    const { published_only } = req.query;
    const userRole = req.user?.role || null;

    let where = '1=1';

    // Customer or unauthenticated: only show active + visible packages
    if (userRole !== 'admin') {
      where += ' AND is_active = 1 AND visible_to_customer = 1';
    }

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
// Supports both old format (service_ids) and new custom builder format (services with total_count)
exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      name, description,
      price_hatchback = 0, price_medium_hatchback = 0, price_sedan = 0, price_premium_sedan = 0, price_suv = 0,
      wash_count = 0, wax_count = 0, is_published = false,
      visible_to_customer = true,
      service_ids = [],       // Legacy format: array of service IDs (no count)
      services = [],          // New format: array of { service_id, total_count }
      products = []
    } = req.body;

    // ── Validation ──────────────────────────────────
    if (!name || !name.trim()) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Package name is required' });
    }

    // Check name uniqueness
    const [existing] = await conn.query('SELECT id FROM packages WHERE name = ?', [name.trim()]);
    if (existing.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'A package with this name already exists' });
    }

    // Validate services from custom builder
    if (services.length > 0) {
      for (const svc of services) {
        if (!svc.service_id) {
          await conn.rollback();
          return res.status(400).json({ success: false, error: 'Each service must have a service_id' });
        }
        if (!svc.total_count || svc.total_count <= 0) {
          await conn.rollback();
          return res.status(400).json({ success: false, error: 'Each service must have a count greater than 0' });
        }
      }
    }

    // ── Insert package ──────────────────────────────
    const [result] = await conn.query(
      `INSERT INTO packages (name, description, price_hatchback, price_medium_hatchback, price_sedan, price_premium_sedan, price_suv, wash_count, wax_count, is_published, visible_to_customer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description || null, price_hatchback, price_medium_hatchback, price_sedan, price_premium_sedan, price_suv, wash_count, wax_count, is_published ? 1 : 0, visible_to_customer ? 1 : 0]
    );
    const pkgId = result.insertId;

    // ── Insert service links (new format with total_count) ──
    if (services.length > 0) {
      for (const svc of services) {
        await conn.query(
          'INSERT INTO package_services (package_id, service_id, total_count) VALUES (?, ?, ?)',
          [pkgId, svc.service_id, svc.total_count]
        );
      }
    }
    // ── Legacy format (just service IDs, total_count defaults to 1) ──
    else if (service_ids.length > 0) {
      for (const sid of service_ids) {
        await conn.query(
          'INSERT INTO package_services (package_id, service_id) VALUES (?, ?)',
          [pkgId, sid]
        );
      }
    }

    // ── Insert product links ────────────────────────
    for (const p of products) {
      await conn.query(
        'INSERT INTO package_products (package_id, product_id, quantity) VALUES (?, ?, ?)',
        [pkgId, p.product_id, p.quantity || 1]
      );
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
      wash_count, wax_count, is_published, visible_to_customer,
      service_ids, services, products
    } = req.body;

    const [existing] = await conn.query('SELECT id FROM packages WHERE id = ?', [id]);
    if (!existing.length) { await conn.rollback(); return res.status(404).json({ success: false, error: 'Package not found' }); }

    // Check name uniqueness (if changing name)
    if (name !== undefined) {
      const [dupe] = await conn.query('SELECT id FROM packages WHERE name = ? AND id != ?', [name.trim(), id]);
      if (dupe.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, error: 'A package with this name already exists' });
      }
    }

    const updates = []; const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (price_hatchback !== undefined) { updates.push('price_hatchback = ?'); params.push(price_hatchback); }
    if (price_medium_hatchback !== undefined) { updates.push('price_medium_hatchback = ?'); params.push(price_medium_hatchback); }
    if (price_sedan !== undefined) { updates.push('price_sedan = ?'); params.push(price_sedan); }
    if (price_premium_sedan !== undefined) { updates.push('price_premium_sedan = ?'); params.push(price_premium_sedan); }
    if (price_suv !== undefined) { updates.push('price_suv = ?'); params.push(price_suv); }
    if (wash_count !== undefined) { updates.push('wash_count = ?'); params.push(wash_count); }
    if (wax_count !== undefined) { updates.push('wax_count = ?'); params.push(wax_count); }
    if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published ? 1 : 0); }
    if (visible_to_customer !== undefined) { updates.push('visible_to_customer = ?'); params.push(visible_to_customer ? 1 : 0); }

    if (updates.length) {
      params.push(id);
      await conn.query(`UPDATE packages SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Replace service links — new format with total_count
    if (services !== undefined) {
      await conn.query('DELETE FROM package_services WHERE package_id = ?', [id]);
      for (const svc of services) {
        await conn.query(
          'INSERT INTO package_services (package_id, service_id, total_count) VALUES (?, ?, ?)',
          [id, svc.service_id, svc.total_count || 1]
        );
      }
    }
    // Legacy format
    else if (service_ids !== undefined) {
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

// ─── TOGGLE CUSTOMER VISIBILITY ─────────────
exports.toggleVisibility = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT visible_to_customer FROM packages WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Package not found' });
    const newVal = rows[0].visible_to_customer ? 0 : 1;
    await pool.query('UPDATE packages SET visible_to_customer = ? WHERE id = ?', [newVal, req.params.id]);
    res.json({ success: true, message: newVal ? 'Package now visible to customers' : 'Package hidden from customers' });
  } catch (err) {
    console.error('Package visibility toggle error:', err);
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

// ─── CUSTOMER: SUBMIT PACKAGE REQUEST ───────
exports.createRequest = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { vehicle_id, package_id, price } = req.body;

    if (!vehicle_id || !package_id || price === undefined) {
      return res.status(400).json({ success: false, error: 'vehicle_id, package_id, and price are required' });
    }

    const [result] = await pool.query(
      "INSERT INTO package_requests (customer_id, vehicle_id, package_id, price, status) VALUES (?, ?, ?, ?, 'pending')",
      [customerId, vehicle_id, package_id, price]
    );

    res.status(201).json({ success: true, message: 'Package request submitted to admin for approval' });
  } catch (err) {
    console.error('Package request create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADMIN: LIST PACKAGE REQUESTS ───────────
exports.listRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT pr.*, u.name as customer_name, u.mobile as customer_mobile,
             v.registration_no, v.brand, v.model,
             p.name as package_name
      FROM package_requests pr
      JOIN users u ON pr.customer_id = u.id
      JOIN vehicles v ON pr.vehicle_id = v.id
      JOIN packages p ON pr.package_id = p.id
      ORDER BY pr.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Package list requests error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADMIN: APPROVE PACKAGE REQUEST ─────────
exports.approveRequest = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    // 1. Get request details
    const [rows] = await conn.query("SELECT * FROM package_requests WHERE id = ? AND status = 'pending'", [id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Pending request not found' });
    }
    const reqData = rows[0];

    // 2. Mark approved
    await conn.query("UPDATE package_requests SET status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);

    // 3. Add to user_packages
    await conn.query(
      "INSERT INTO user_packages (user_id, package_id) VALUES (?, ?)",
      [reqData.customer_id, reqData.package_id]
    );

    await conn.commit();
    res.json({ success: true, message: 'Package request approved successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('Package approve error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── DOWNLOAD INVOICE ───────────────────────
exports.downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { generatePackageInvoicePDF } = require('../services/invoiceService');
    const { pdfBuffer, invoiceNumber } = await generatePackageInvoicePDF(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
      'Content-Disposition': \`attachment; filename="\${invoiceNumber}.pdf"\`
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Download package invoice error:', err);
    res.status(500).json({ success: false, error: err.message || 'Error generating invoice' });
  }
};


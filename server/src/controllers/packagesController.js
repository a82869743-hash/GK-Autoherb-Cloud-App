const pool = require('../config/db');

// Helper: fetch related services, products & pricing for a package
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
  // Fetch v2 pricing matrix (car_type × pricing_type)
  let pricing = [];
  try {
    const [pricingRows] = await pool.query(
      `SELECT id, car_type, pricing_type, price FROM package_pricing WHERE package_id = ? ORDER BY car_type, pricing_type`, [pkg.id]
    );
    pricing = pricingRows;
  } catch { /* table may not exist yet */ }
  return { ...pkg, services, products, pricing };
}

// ─── LIST ───────────────────────────────────
// Role-based filtering: Admin sees all, Customer/public sees only active + visible
exports.list = async (req, res) => {
  try {
    const { published_only } = req.query;
    const userRole = req.user?.role || null;

    let where = 'is_custom = 0';

    // Customer or unauthenticated: only show active + visible packages
    if (userRole !== 'admin') {
      where += ' AND is_active = 1 AND visible_to_customer = 1';
    }

    if (published_only === 'true') where += ' AND is_published = 1';

    const [rows] = await pool.query(`SELECT * FROM packages WHERE ${where} ORDER BY sort_order ASC, created_at DESC`);
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
      visible_to_customer = true, is_custom = false,
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
      `INSERT INTO packages (name, description, price_hatchback, price_medium_hatchback, price_sedan, price_premium_sedan, price_suv, wash_count, wax_count, is_published, visible_to_customer, is_custom)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description || null, price_hatchback, price_medium_hatchback, price_sedan, price_premium_sedan, price_suv, wash_count, wax_count, is_published ? 1 : 0, visible_to_customer ? 1 : 0, is_custom ? 1 : 0]
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
      wash_count, wax_count, is_published, visible_to_customer, is_custom,
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
    if (is_custom !== undefined) { updates.push('is_custom = ?'); params.push(is_custom ? 1 : 0); }

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
    const { vehicle_id, package_id, price, pricing_type = 'basic', car_type } = req.body;

    if (!vehicle_id || !package_id || price === undefined) {
      return res.status(400).json({ success: false, error: 'vehicle_id, package_id, and price are required' });
    }

    const [result] = await pool.query(
      "INSERT INTO package_requests (customer_id, vehicle_id, package_id, price, pricing_type, car_type, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
      [customerId, vehicle_id, package_id, price, pricing_type, car_type || null]
    );

    res.status(201).json({ success: true, requestId: result.insertId, message: 'Package request submitted to admin for approval' });
  } catch (err) {
    console.error('Package request create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CUSTOMER: LIST OWN PACKAGE REQUESTS ────
exports.getMyRequests = async (req, res) => {
  try {
    const customerId = req.user.id;
    const [rows] = await pool.query(`
      SELECT pr.id, pr.status, pr.price, pr.rejection_reason, pr.created_at,
             p.name as package_name, p.wash_count,
             v.registration_no, v.brand, v.model
      FROM package_requests pr
      JOIN packages p ON pr.package_id = p.id
      JOIN vehicles v ON pr.vehicle_id = v.id
      WHERE pr.customer_id = ?
      ORDER BY pr.created_at DESC
    `, [customerId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('My package requests error:', err);
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

// Helper function for request approval (can be called by verify payment or webhook)
exports._approveRequestInternal = async (conn, id, paymentId = null) => {
  // 1. Get request details
  const [rows] = await conn.query("SELECT * FROM package_requests WHERE id = ? AND status = 'pending'", [id]);
  if (!rows.length) {
    return { success: false, error: 'Pending request not found' };
  }
  const reqData = rows[0];

  // 2. Mark approved
  await conn.query("UPDATE package_requests SET status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);

  // 3. Add to user_packages with pricing_type, car_type, price_paid, vehicle_id
  const [result] = await conn.query(
    `INSERT INTO user_packages 
     (user_id, package_id, start_date, end_date, payment_status, package_status, price_paid, vehicle_segment, vehicle_id, pricing_type, car_type) 
     VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'paid', 'active', ?, ?, ?, ?, ?)`,
    [
      reqData.customer_id, reqData.package_id,
      reqData.price || 0, reqData.car_type || null, reqData.vehicle_id,
      reqData.pricing_type || 'basic', reqData.car_type || null
    ]
  );
  const userPackageId = result.insertId;

  // Create package_usage rows
  const [packages] = await conn.query('SELECT name FROM packages WHERE id = ?', [reqData.package_id]);
  const packageName = packages.length ? packages[0].name : '';

  // Get service breakdown based on tier or DB fallback
  let serviceBreakdown = [];
  let baseTier = '';
  const lowerName = (packageName || '').toLowerCase();
  if (lowerName.includes('bronze')) baseTier = 'Bronze Package';
  else if (lowerName.includes('silver')) baseTier = 'Silver Package';
  else if (lowerName.includes('gold')) baseTier = 'Gold Package';
  else if (lowerName.includes('diamond')) baseTier = 'Diamond Package';
  else if (lowerName.includes('platinum')) baseTier = 'Platinum Package';

  const PACKAGE_SERVICE_MAP = {
    'Bronze Package':   [{ service_name: 'Car Foam Wash', total_count: 3 }, { service_name: 'Body Wax Coat', total_count: 1 }],
    'Silver Package':   [{ service_name: 'Car Foam Wash', total_count: 5 }, { service_name: 'Body Wax Coat', total_count: 2 }, { service_name: 'Two Wheeler Wash', total_count: 1 }],
    'Gold Package':     [{ service_name: 'Car Foam Wash', total_count: 8 }, { service_name: 'Body Wax Coat', total_count: 3 }, { service_name: 'Two Wheeler Wash', total_count: 1 }, { service_name: 'Two Wheeler Wax Coat', total_count: 1 }],
    'Diamond Package':  [{ service_name: 'Car Foam Wash', total_count: 10 }, { service_name: 'Body Wax Coat', total_count: 2 }, { service_name: 'Two Wheeler Wash', total_count: 2 }, { service_name: 'Two Wheeler Wax Coat', total_count: 1 }, { service_name: 'Body Hybrid Ceramic Wax Coat', total_count: 1 }],
    'Platinum Package': [{ service_name: 'Car Foam Wash', total_count: 12 }, { service_name: 'Body Wax Coat', total_count: 3 }, { service_name: 'Two Wheeler Wash', total_count: 2 }, { service_name: 'Two Wheeler Wax Coat', total_count: 1 }, { service_name: 'Body Hybrid Ceramic Wax Coat', total_count: 1 }, { service_name: 'Deep Cleaning', total_count: 1 }],
  };

  if (baseTier && PACKAGE_SERVICE_MAP[baseTier]) {
    serviceBreakdown = PACKAGE_SERVICE_MAP[baseTier];
  } else if (PACKAGE_SERVICE_MAP[packageName]) {
    serviceBreakdown = PACKAGE_SERVICE_MAP[packageName];
  } else {
    // Fallback to database
    const [dbServices] = await conn.query(
      `SELECT s.name AS service_name, ps.total_count
       FROM package_services ps
       JOIN services s ON ps.service_id = s.id
       WHERE ps.package_id = ?`,
      [reqData.package_id]
    );
    if (dbServices.length > 0) {
      serviceBreakdown = dbServices.map(s => ({ service_name: s.service_name, total_count: s.total_count }));
    } else {
      const [pkgDetails] = await conn.query(
        'SELECT wash_count, wax_count FROM packages WHERE id = ?',
        [reqData.package_id]
      );
      if (pkgDetails.length) {
        if (pkgDetails[0].wash_count > 0) {
          serviceBreakdown.push({ service_name: 'Foam Wash', total_count: pkgDetails[0].wash_count });
        }
        if (pkgDetails[0].wax_count > 0) {
          serviceBreakdown.push({ service_name: 'Wax Coat', total_count: pkgDetails[0].wax_count });
        }
      }
    }
  }

  for (const svc of serviceBreakdown) {
    await conn.query(
      'INSERT INTO package_usage (user_package_id, service_name, used_count, usage_status) VALUES (?, ?, 0, ?)',
      [userPackageId, svc.service_name, 'available']
    );
  }

  // Log to v2_package_renewals as initial purchase
  try {
    await conn.query(
      `INSERT INTO v2_package_renewals
       (customer_id, package_id, customer_package_id, renewal_date, amount_paid, payment_id, renewed_by, notes)
       VALUES (?, ?, ?, CURDATE(), ?, ?, 'customer', 'Initial package purchase')`,
      [reqData.customer_id, reqData.package_id, userPackageId, reqData.price || 0, paymentId]
    );
  } catch (dbErr) {
    console.warn('Failed to write initial purchase log:', dbErr.message);
  }

  // Fire-and-forget approval SMS & WhatsApp
  try {
    const messagingService = require('../services/messagingService');
    const [custRows] = await conn.query('SELECT name, mobile FROM users WHERE id = ?', [reqData.customer_id]);
    if (custRows.length && custRows[0].mobile) {
      const msg = `GK AutoHerb: Hi ${custRows[0].name}, your package request has been approved. You can now use your package services.`;
      messagingService.sendSMS(custRows[0].mobile, null, null, { content: msg }).catch(() => {});
      
      const vehicleStr = reqData.car_type ? ` for vehicle segment ${reqData.car_type.replace(/_/g, ' ')}` : '';
      const body = `🎉 *Package Approved!*\n\nHi ${custRows[0].name},\nYour request for the *${packageName}* package${vehicleStr} has been approved and activated!\n\nThank you for choosing GK AutoHerb! 💎`;
      messagingService.sendWhatsApp(`91${custRows[0].mobile}`, null, { body }).catch(() => {});
    }
  } catch (err) {
    console.warn('SMS/WhatsApp error:', err.message);
  }

  return { success: true, userPackageId };
};

// ─── ADMIN: APPROVE PACKAGE REQUEST ─────────
exports.approveRequest = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    const result = await exports._approveRequestInternal(conn, id, null);
    if (!result.success) {
      await conn.rollback();
      return res.status(404).json(result);
    }

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

// ─── ADMIN: REJECT PACKAGE REQUEST ──────────
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    // 1. Get request details
    const [rows] = await pool.query("SELECT * FROM package_requests WHERE id = ? AND status = 'pending'", [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Pending request not found' });
    }
    const reqData = rows[0];

    // 2. Mark rejected with reason
    await pool.query(
      "UPDATE package_requests SET status = 'rejected', rejection_reason = ? WHERE id = ?",
      [rejection_reason || 'Rejected by admin', id]
    );

    // 3. Fire-and-forget rejection SMS
    try {
      const messagingService = require('../services/messagingService');
      const [custRows] = await pool.query('SELECT name, mobile FROM users WHERE id = ?', [reqData.customer_id]);
      if (custRows.length && custRows[0].mobile) {
        const msg = `GK AutoHerb: Hi ${custRows[0].name}, your package request has been rejected. Reason: ${rejection_reason || 'Not specified'}. Contact us for details.`;
        messagingService.sendSMS(custRows[0].mobile, null, null, { content: msg }).catch(() => {});
      }
    } catch { /* non-blocking */ }

    console.log(`[PACKAGE] Request #${id} rejected by admin ${req.user.id} — reason: ${rejection_reason || 'N/A'}`);
    res.json({ success: true, message: 'Package request rejected' });
  } catch (err) {
    console.error('Package reject error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
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
      'Content-Disposition': 'attachment; filename="' + invoiceNumber + '.pdf"'
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Download package invoice error:', err);
    res.status(500).json({ success: false, error: err.message || 'Error generating invoice' });
  }
};

// ─── GET SERVICES IN A PACKAGE ──────────────
// Returns only services included in a specific package (for filtered booking)
exports.getPackageServices = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT ps.id AS ps_id, ps.total_count, s.id, s.name, s.description,
              s.price_hatchback, s.price_medium_hatchback, s.price_sedan, s.price_premium_sedan, s.price_suv,
              s.duration_minutes, s.is_active
       FROM package_services ps
       JOIN services s ON ps.service_id = s.id
       WHERE ps.package_id = ?
       ORDER BY s.name ASC`,
      [id]
    );
    if (rows.length > 0) {
      return res.json({ success: true, data: rows });
    }

    // Fallback to legacy wash_count, wax_count
    const [pkgDetails] = await pool.query(
      'SELECT wash_count, wax_count FROM packages WHERE id = ?',
      [id]
    );
    const fallback = [];
    if (pkgDetails.length > 0) {
      if (pkgDetails[0].wash_count > 0) {
        fallback.push({
          ps_id: -1,
          total_count: pkgDetails[0].wash_count,
          id: -1,
          name: 'Foam Wash',
          description: 'Standard Foam Wash',
          price_hatchback: 0,
          price_medium_hatchback: 0,
          price_sedan: 0,
          price_premium_sedan: 0,
          price_suv: 0,
          duration_minutes: 30,
          is_active: 1
        });
      }
      if (pkgDetails[0].wax_count > 0) {
        fallback.push({
          ps_id: -2,
          total_count: pkgDetails[0].wax_count,
          id: -2,
          name: 'Wax Coat',
          description: 'Standard Wax Coat',
          price_hatchback: 0,
          price_medium_hatchback: 0,
          price_sedan: 0,
          price_premium_sedan: 0,
          price_suv: 0,
          duration_minutes: 30,
          is_active: 1
        });
      }
    }
    res.json({ success: true, data: fallback });
  } catch (err) {
    console.error('Package services list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.customAssign = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { user_id, vehicle_id, name, price_paid, duration_months = 12, services = [] } = req.body;

    if (!user_id || !name || !services.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'user_id, name, and services are required' });
    }

    // 1. Resolve vehicle segment
    let vehicleSegment = 'sedan';
    if (vehicle_id) {
      const [vRows] = await conn.query('SELECT category FROM vehicles WHERE id = ?', [vehicle_id]);
      if (vRows.length && vRows[0].category) {
        vehicleSegment = vRows[0].category;
      }
    }

    // 2. Create the custom package catalog record
    const [pkgResult] = await conn.query(
      `INSERT INTO packages (name, description, is_custom, is_active, visible_to_customer, is_published, price_sedan)
       VALUES (?, 'Custom Package for Customer', 1, 1, 0, 0, 0)`,
      [name.trim()]
    );
    const packageId = pkgResult.insertId;

    // 3. Insert service linkages
    for (const svc of services) {
      await conn.query(
        'INSERT INTO package_services (package_id, service_id, total_count) VALUES (?, ?, ?)',
        [packageId, svc.service_id, svc.total_count]
      );
    }

    // 4. Check for existing active package (prevent duplicates)
    const [activeExisting] = await conn.query(
      `SELECT id FROM user_packages
       WHERE user_id = ? AND package_status = 'active'
       AND (end_date IS NULL OR end_date > NOW())`,
      [user_id]
    );
    if (activeExisting.length) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        error: 'User already has an active package. Renew/cancel instead.',
      });
    }

    // 5. Assign user_package
    const [upResult] = await conn.query(
      `INSERT INTO user_packages
       (user_id, package_id, end_date, payment_status, package_status, price_paid, vehicle_segment, vehicle_id)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MONTH), 'paid', 'active', ?, ?, ?)`,
      [user_id, packageId, duration_months, price_paid || null, vehicleSegment, vehicle_id || null]
    );
    const userPackageId = upResult.insertId;

    // 6. Create package_usage rows
    for (const svc of services) {
      const [svcRows] = await conn.query('SELECT name FROM services WHERE id = ?', [svc.service_id]);
      const sName = svcRows.length ? svcRows[0].name : `Service #${svc.service_id}`;
      await conn.query(
        'INSERT INTO package_usage (user_package_id, service_name, used_count, usage_status) VALUES (?, ?, 0, ?)',
        [userPackageId, sName, 'available']
      );
    }

    await conn.commit();
    res.status(201).json({
      success: true,
      data: { user_package_id: userPackageId, package_id: packageId },
      message: `Custom package '${name}' created and assigned successfully`
    });
  } catch (err) {
    await conn.rollback();
    console.error('Custom assign error:', err);
    res.status(500).json({ success: false, error: 'Failed to create and assign custom package' });
  } finally {
    conn.release();
  }
};


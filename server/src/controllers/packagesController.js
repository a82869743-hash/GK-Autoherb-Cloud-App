const pool = require('../config/db');
const emi = require('../services/packageEmi');

// Helper: fetch related services, products & pricing for a package
async function enrichPackage(pkg) {
  const [services] = await pool.query(
    `SELECT ps.id AS ps_id, ps.total_count, COALESCE(ps.complimentary, 0) AS complimentary, s.id, s.name, s.price_hatchback, s.price_medium_hatchback, s.price_sedan, s.price_premium_sedan, s.price_suv
     FROM package_services ps JOIN services s ON ps.service_id = s.id
     WHERE ps.package_id = ?`, [pkg.id]
  );
  let products = [];
  try {
    [products] = await pool.query(
      `SELECT pp.id, pp.product_id, pp.quantity, i.product_name, i.unit
       FROM package_products pp JOIN inventory i ON pp.product_id = i.id
       WHERE pp.package_id = ?`, [pkg.id]
    );
  } catch (prodErr) {
    // package_products or inventory may not exist on some DB schemas
    console.warn('Failed to fetch package products (safe to ignore):', prodErr.message);
  }
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
    const { published_only, include_custom, custom_only } = req.query;
    const userRole = req.user?.role || null;

    let where = '1=1';
    if (custom_only === 'true') {
      where += ' AND is_custom = 1';
    } else if (include_custom === 'false') {
      where += ' AND is_custom = 0';
    } else if (userRole !== 'admin' && include_custom !== 'true') {
      where += ' AND is_custom = 0';
    }

    // Customer or unauthenticated: only show active + visible + published packages
    if (userRole !== 'admin') {
      where += ' AND is_active = 1 AND is_published = 1 AND visible_to_customer = 1';
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
      products = [],
      emi_enabled, emi_months, emi_min_amount
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
    if (emi_enabled !== undefined) await saveEmiSettings(conn, pkgId, { emi_enabled, emi_months, emi_min_amount });

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
      service_ids, services, products,
      emi_enabled, emi_months, emi_min_amount
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
    if (emi_enabled !== undefined) await saveEmiSettings(conn, id, { emi_enabled, emi_months, emi_min_amount });

    // Sync v2 pricing matrix table
    if (req.body.pricing && Array.isArray(req.body.pricing) && req.body.pricing.length > 0) {
      for (const p of req.body.pricing) {
        if (p.car_type && p.pricing_type && p.price !== undefined) {
          await conn.query(
            `INSERT INTO package_pricing (package_id, car_type, pricing_type, price)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE price = VALUES(price)`,
            [id, p.car_type, p.pricing_type, Number(p.price) || 0]
          );
        }
      }
    } else if (
      price_hatchback !== undefined || price_medium_hatchback !== undefined ||
      price_sedan !== undefined || price_premium_sedan !== undefined || price_suv !== undefined
    ) {
      const categoryPriceMap = {
        SMALL_HATCHBACK: price_hatchback,
        MEDIUM_HATCHBACK: price_medium_hatchback,
        SEDAN_SUV: price_sedan,
        PREMIUM_SEDAN: price_premium_sedan,
        LARGE_CAR: price_suv,
      };
      for (const [carType, priceVal] of Object.entries(categoryPriceMap)) {
        if (priceVal !== undefined) {
          await conn.query(
            `INSERT INTO package_pricing (package_id, car_type, pricing_type, price)
             VALUES (?, ?, 'basic', ?)
             ON DUPLICATE KEY UPDATE price = VALUES(price)`,
            [id, carType, Number(priceVal) || 0]
          );
        }
      }
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
      await syncPackageServicesToUserPackages(conn, id);
    }
    // Legacy format
    else if (service_ids !== undefined) {
      await conn.query('DELETE FROM package_services WHERE package_id = ?', [id]);
      for (const sid of service_ids) {
        await conn.query('INSERT INTO package_services (package_id, service_id) VALUES (?, ?)', [id, sid]);
      }
      await syncPackageServicesToUserPackages(conn, id);
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

// Helper: EMI settings (migration 090). Months are kept as "3,6".
async function saveEmiSettings(conn, packageId, { emi_enabled, emi_months, emi_min_amount }) {
  const months = emi.parseMonths(Array.isArray(emi_months) ? emi_months.join(',') : emi_months);
  const enabled = emi_enabled && months.length ? 1 : 0;
  await conn.query(
    'UPDATE packages SET emi_enabled = ?, emi_months = ?, emi_min_amount = ? WHERE id = ?',
    [enabled, months.join(',') || null, Math.max(0, Number(emi_min_amount) || 0), packageId]
  );
}

// Helper: Syncs updated package services to all active customer subscriptions for this package_id
async function syncPackageServicesToUserPackages(conn, packageId) {
  // Nothing to copy: customers' package credits are read live from package_services
  // (see userPackagesController.getServiceBreakdown), so editing a package already reaches
  // everyone who bought it. The old copy step wrote to user_package_usage, a table that no
  // longer exists, and only produced errors.
  return { packageId, synced: 0 };
}

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
    const pkgId = req.params.id;
    const [existing] = await pool.query('SELECT id, name FROM packages WHERE id = ?', [pkgId]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Package not found' });

    // Safeguard: Check if any customer subscriptions exist (active or historical)
    const [subscriptions] = await pool.query(
      'SELECT COUNT(*) AS count FROM user_packages WHERE package_id = ?',
      [pkgId]
    );
    const subscriberCount = subscriptions[0]?.count || 0;

    if (subscriberCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete package "${existing[0].name}": ${subscriberCount} customer subscription(s) reference this package. Unpublish or hide the package to prevent new purchases while preserving existing customer balances.`
      });
    }

    // Safe to hard delete if 0 customer subscriptions exist
    await pool.query('DELETE FROM packages WHERE id = ?', [pkgId]);
    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (err) {
    console.error('Package delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CUSTOMER: SUBMIT PACKAGE REQUEST ───────
// ─── CUSTOMER: SUBMIT PACKAGE REQUEST ───────
exports.createRequest = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { vehicle_id, package_id, price, pricing_type = 'basic', car_type, coupon_id, discount_amount, emi_months } = req.body;

    if (!vehicle_id || !package_id || price === undefined) {
      return res.status(400).json({ success: false, error: 'vehicle_id, package_id, and price are required' });
    }

    // Price always follows the customer's own car — never a segment picked in the browser
    const [vehRows] = await pool.query('SELECT id, brand, model, category FROM vehicles WHERE id = ? AND customer_id = ?', [vehicle_id, customerId]);
    if (!vehRows.length) {
      return res.status(403).json({ success: false, error: 'This vehicle is not in your garage' });
    }
    const { detectVehicleCategory } = require('../utils/vehicleCategory');
    const segment = vehRows[0].category || detectVehicleCategory(vehRows[0].brand, vehRows[0].model);
    const CAR_TYPE = { hatchback: 'SMALL_HATCHBACK', medium_hatchback: 'MEDIUM_HATCHBACK', sedan: 'SEDAN_SUV', premium_sedan: 'PREMIUM_SEDAN', suv: 'SEDAN_SUV', luxury: 'LARGE_CAR' };
    const effectiveCarType = CAR_TYPE[segment] || car_type || 'SEDAN_SUV';

    let listPrice = parseFloat(price);
    const [matrix] = await pool.query(
      'SELECT price FROM package_pricing WHERE package_id = ? AND car_type = ? AND pricing_type = ? LIMIT 1',
      [package_id, effectiveCarType, pricing_type]
    );
    if (matrix.length && Number(matrix[0].price) > 0) {
      listPrice = Number(matrix[0].price);
    } else {
      const [pkgRows] = await pool.query('SELECT * FROM packages WHERE id = ?', [package_id]);
      const col = { hatchback: 'price_hatchback', medium_hatchback: 'price_medium_hatchback', sedan: 'price_sedan', premium_sedan: 'price_premium_sedan', suv: 'price_suv', luxury: 'price_suv' }[segment];
      if (pkgRows.length && col && Number(pkgRows[0][col]) > 0) listPrice = Number(pkgRows[0][col]);
    }

    const discount = parseFloat(discount_amount || 0);
    const finalPrice = Math.max(0, listPrice - discount);

    // EMI: only the month options the admin allowed for this package
    const emiMonths = Number(emi_months) || null;
    if (emiMonths) {
      const [pkgRows] = await pool.query('SELECT * FROM packages WHERE id = ?', [package_id]);
      const emiError = emi.validateChoice(pkgRows[0], emiMonths, finalPrice);
      if (emiError) return res.status(400).json({ success: false, error: emiError });
    }

    const [result] = await pool.query(
      "INSERT INTO package_requests (customer_id, vehicle_id, package_id, price, pricing_type, car_type, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
      [customerId, vehicle_id, package_id, finalPrice, pricing_type, effectiveCarType]
    );

    const requestId = result.insertId;
    let emiPlan = null;
    if (emiMonths) {
      await pool.query('UPDATE package_requests SET emi_months = ? WHERE id = ?', [emiMonths, requestId]);
      const amounts = emi.splitAmount(finalPrice, emiMonths);
      emiPlan = { months: emiMonths, first_amount: amounts[0], installment_amount: amounts[emiMonths - 1] };
    }

    if (coupon_id && discount > 0) {
      await pool.query(
        `INSERT INTO coupon_redemptions (coupon_id, customer_id, package_request_id, discount_amount)
         VALUES (?, ?, ?, ?)`,
        [coupon_id, customerId, requestId, discount]
      ).catch(e => console.warn('Coupon redemption log error:', e.message));
    }

    res.status(201).json({ success: true, requestId, price: finalPrice, pay_now: emiPlan ? emiPlan.first_amount : finalPrice, emi: emiPlan, car_type: effectiveCarType, message: 'Package request submitted to admin for approval' });
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
      SELECT pr.*, pr.id, pr.status, pr.price, pr.rejection_reason, pr.created_at,
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

exports.listRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT pr.*, u.name as customer_name, u.mobile as customer_mobile,
             v.registration_no, v.brand, v.model,
             p.name as package_name,
             pay.status AS payment_status, pay.payment_method
      FROM package_requests pr
      LEFT JOIN users u ON pr.customer_id = u.id
      LEFT JOIN vehicles v ON pr.vehicle_id = v.id
      LEFT JOIN packages p ON pr.package_id = p.id
      LEFT JOIN v2_payments pay ON (
        pay.booking_id IS NULL AND
        pay.notes IS NOT NULL AND
        JSON_VALID(pay.notes) AND
        JSON_UNQUOTE(JSON_EXTRACT(pay.notes, '$.package_request_id')) = CAST(pr.id AS CHAR)
      )
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

  // 3. Add to user_packages — use core columns only (safe for any DB schema)
  const [result] = await conn.query(
    `INSERT INTO user_packages 
     (user_id, package_id, start_date, end_date, payment_status, package_status, price_paid, vehicle_segment, vehicle_id) 
     VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'paid', 'active', ?, ?, ?)`,
    [
      reqData.customer_id, reqData.package_id,
      reqData.price || 0, reqData.car_type || null, reqData.vehicle_id
    ]
  );
  const userPackageId = result.insertId;
  const emiPlan = await emi.createPlanForRequest(conn, reqData, userPackageId, paymentId);

  // Create package_usage rows
  const [packages] = await conn.query('SELECT name FROM packages WHERE id = ?', [reqData.package_id]);
  const packageName = packages.length ? packages[0].name : '';

  // Get service breakdown based on tier or DB fallback
  const { getServiceBreakdown } = require('./userPackagesController');
  const serviceBreakdown = await getServiceBreakdown(conn, reqData.package_id, packageName);
  for (const svc of serviceBreakdown) {
    await conn.query(
      'INSERT INTO package_usage (user_package_id, service_name, used_count, usage_status) VALUES (?, ?, 0, ?)',
      [userPackageId, svc.service_name, 'available']
    );
  }

  // Log to v2_package_renewals as initial purchase (non-blocking)
  try {
    await conn.query(
      `INSERT INTO v2_package_renewals
       (customer_id, package_id, customer_package_id, renewal_date, amount_paid, payment_id, renewed_by, notes)
       VALUES (?, ?, ?, CURDATE(), ?, ?, 'customer', 'Initial package purchase')`,
      [reqData.customer_id, reqData.package_id, userPackageId, emiPlan ? emiPlan.firstAmount : reqData.price || 0, paymentId]
    );
  } catch (dbErr) {
    console.warn('Failed to write initial purchase log:', dbErr.message);
  }

  // Fire-and-forget "package is active" message (editable template PACKAGE_APPROVED; WhatsApp + SMS fallback)
  if (emiPlan) {
    emi.notifyStarted(reqData.customer_id, packageName, emiPlan);
  } else try {
    const messagingService = require('../services/messagingService');
    const [upRows] = await conn.query('SELECT start_date, end_date FROM user_packages WHERE id = ?', [userPackageId]);
    const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');
    messagingService
      .notify(
        reqData.customer_id,
        'PACKAGE_APPROVED',
        { package_name: packageName, valid_from: fmt(upRows[0]?.start_date), valid_till: fmt(upRows[0]?.end_date) },
        { type: 'package', id: userPackageId }
      )
      .catch(() => {});
  } catch (err) {
    console.warn('Package activation message error:', err.message);
  }

  return { success: true, userPackageId, emiPlanId: emiPlan?.planId || null };
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
// Returns services included in a specific package (DB-first single source of truth)
exports.getPackageServices = async (req, res) => {
  try {
    const { id } = req.params;

    const [pkgRows] = await pool.query('SELECT id FROM packages WHERE id = ?', [id]);
    if (!pkgRows.length) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    const [rows] = await pool.query(
      `SELECT ps.id AS ps_id, ps.total_count, COALESCE(ps.complimentary, 0) AS complimentary, s.id, s.name, s.description,
              s.price_hatchback, s.price_medium_hatchback, s.price_sedan, s.price_premium_sedan, s.price_suv,
              s.duration_minutes, s.is_active
       FROM package_services ps
       JOIN services s ON ps.service_id = s.id
       WHERE ps.package_id = ?
       ORDER BY ps.id ASC`,
      [id]
    );

    res.json({ success: true, data: rows });
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


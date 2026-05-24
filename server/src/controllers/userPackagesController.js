/**
 * ═══════════════════════════════════════════════════════════
 * USER PACKAGES CONTROLLER — Phase 2 Enhanced
 * ═══════════════════════════════════════════════════════════
 *
 * Features:
 *   - Package assignment
 *   - Package renewal
 *   - Expiry management
 *   - Usage tracking (reserved/consumed/cancelled)
 *   - Dashboard data
 *   - Package history with renewal chain
 *
 * Tables used:
 *   - user_packages (with renewal/expiry/payment fields)
 *   - package_usage (with usage_status, booking_id, job_card_id)
 *   - package_services (package_id, service_id, total_count)
 *   - packages (wash_count, wax_count, etc.)
 */

const pool = require('../config/db');

// ─── AutoHerb Annual Car Care V2 — TOTAL service entitlements (paid + complimentary) ──────────────
// Each package includes PAID washes + COMPLIMENTARY services.
// The total_count here is the COMBINED entitlement that customers can use.
//
// BRONZE:    3 paid + 1 comp = 4 Car Foam Wash, 1 Body Wax Coat
// SILVER:    5 paid + 2 comp = 7 Car Foam Wash, 2 Body Wax Coat, 1 Two Wheeler Wash
// GOLD:      8 paid + 4 comp = 12 Car Foam Wash, 3 Body Wax Coat, 1 Two Wheeler Wash, 1 Two Wheeler Wax Coat
// DIAMOND:  10 paid + 6 comp = 16 Car Foam Wash, 2 Body Wax Coat, 2 Two Wheeler Wash, 1 Two Wheeler Wax Coat, 1 Body Hybrid Ceramic Wax Coat
// PLATINUM: 12 paid + 8 comp = 20 Car Foam Wash, 3 Body Wax Coat, 2 Two Wheeler Wash, 1 Two Wheeler Wax Coat, 1 Body Hybrid Ceramic Wax Coat, 1 Deep Cleaning

const PACKAGE_SERVICE_MAP = {
  'Bronze Package': [
    { service_name: 'Car Foam Wash', total_count: 4 },
    { service_name: 'Body Wax Coat', total_count: 1 },
  ],
  'Silver Package': [
    { service_name: 'Car Foam Wash', total_count: 7 },
    { service_name: 'Body Wax Coat', total_count: 2 },
    { service_name: 'Two Wheeler Wash', total_count: 1 },
  ],
  'Gold Package': [
    { service_name: 'Car Foam Wash', total_count: 12 },
    { service_name: 'Body Wax Coat', total_count: 3 },
    { service_name: 'Two Wheeler Wash', total_count: 1 },
    { service_name: 'Two Wheeler Wax Coat', total_count: 1 },
  ],
  'Diamond Package': [
    { service_name: 'Car Foam Wash', total_count: 16 },
    { service_name: 'Body Wax Coat', total_count: 4 },
    { service_name: 'Two Wheeler Wash', total_count: 2 },
    { service_name: 'Two Wheeler Wax Coat', total_count: 1 },
    { service_name: 'Interior Dry Clean', total_count: 1 },
  ],
  'Platinum Package': [
    { service_name: 'Car Foam Wash', total_count: 19 },
    { service_name: 'Body Wax Coat', total_count: 5 },
    { service_name: 'Two Wheeler Wash', total_count: 2 },
    { service_name: 'Two Wheeler Wax Coat', total_count: 1 },
    { service_name: 'Interior Dry Clean', total_count: 1 },
    { service_name: 'Exterior Rubbing / Polishing', total_count: 1 },
  ],
  // Legacy aliases for backward compatibility
  'Bronze': [
    { service_name: 'Car Foam Wash', total_count: 4 },
    { service_name: 'Body Wax Coat', total_count: 1 },
  ],
  'Silver': [
    { service_name: 'Car Foam Wash', total_count: 7 },
    { service_name: 'Body Wax Coat', total_count: 2 },
    { service_name: 'Two Wheeler Wash', total_count: 1 },
  ],
  'Gold': [
    { service_name: 'Car Foam Wash', total_count: 12 },
    { service_name: 'Body Wax Coat', total_count: 3 },
    { service_name: 'Two Wheeler Wash', total_count: 1 },
    { service_name: 'Two Wheeler Wax Coat', total_count: 1 },
  ],
  'Diamond': [
    { service_name: 'Car Foam Wash', total_count: 16 },
    { service_name: 'Body Wax Coat', total_count: 4 },
    { service_name: 'Two Wheeler Wash', total_count: 2 },
    { service_name: 'Two Wheeler Wax Coat', total_count: 1 },
    { service_name: 'Interior Dry Clean', total_count: 1 },
  ],
  'Platinum': [
    { service_name: 'Car Foam Wash', total_count: 19 },
    { service_name: 'Body Wax Coat', total_count: 5 },
    { service_name: 'Two Wheeler Wash', total_count: 2 },
    { service_name: 'Two Wheeler Wax Coat', total_count: 1 },
    { service_name: 'Interior Dry Clean', total_count: 1 },
    { service_name: 'Exterior Rubbing / Polishing', total_count: 1 },
  ],
};

// ─── Package breakdown for display purposes (paid vs complimentary) ──────────────
// Used by the API to send structured info to the frontend for card rendering
const PACKAGE_BREAKDOWN = {
  'Bronze Package':   { paid_washes: 3, complimentary: [{ service_name: 'Car Foam Wash', count: 1 }, { service_name: 'Body Wax Coat', count: 1 }] },
  'Silver Package':   { paid_washes: 5, complimentary: [{ service_name: 'Car Foam Wash', count: 2 }, { service_name: 'Body Wax Coat', count: 2 }, { service_name: 'Two Wheeler Wash', count: 1 }] },
  'Gold Package':     { paid_washes: 8, complimentary: [{ service_name: 'Car Foam Wash', count: 4 }, { service_name: 'Body Wax Coat', count: 3 }, { service_name: 'Two Wheeler Wash', count: 1 }, { service_name: 'Two Wheeler Wax Coat', count: 1 }] },
  'Diamond Package':  { paid_washes: 10, complimentary: [{ service_name: 'Car Foam Wash', count: 6 }, { service_name: 'Body Wax Coat', count: 4 }, { service_name: 'Two Wheeler Wash', count: 2 }, { service_name: 'Two Wheeler Wax Coat', count: 1 }, { service_name: 'Interior Dry Clean', count: 1 }] },
  'Platinum Package': { paid_washes: 12, complimentary: [{ service_name: 'Car Foam Wash', count: 7 }, { service_name: 'Body Wax Coat', count: 5 }, { service_name: 'Two Wheeler Wash', count: 2 }, { service_name: 'Two Wheeler Wax Coat', count: 1 }, { service_name: 'Interior Dry Clean', count: 1 }, { service_name: 'Exterior Rubbing / Polishing', count: 1 }] },
};

exports.PACKAGE_BREAKDOWN = PACKAGE_BREAKDOWN;

/**
 * getServiceBreakdown — DB-first with legacy fallback
 */
async function getServiceBreakdown(conn, packageId, packageName) {
  // 1. Try to match base tier for new packages (e.g. "Bronze Package - Basic Wash")
  let baseTier = '';
  const lowerName = (packageName || '').toLowerCase();
  if (lowerName.includes('bronze')) baseTier = 'Bronze Package';
  else if (lowerName.includes('silver')) baseTier = 'Silver Package';
  else if (lowerName.includes('gold')) baseTier = 'Gold Package';
  else if (lowerName.includes('diamond')) baseTier = 'Diamond Package';
  else if (lowerName.includes('platinum')) baseTier = 'Platinum Package';

  if (baseTier && PACKAGE_SERVICE_MAP[baseTier]) {
    return PACKAGE_SERVICE_MAP[baseTier];
  }

  // 2. Exact match on package name
  if (PACKAGE_SERVICE_MAP[packageName]) return PACKAGE_SERVICE_MAP[packageName];

  // 3. Fallback to database
  const [dbServices] = await conn.query(
    `SELECT s.name AS service_name, ps.total_count
     FROM package_services ps
     JOIN services s ON ps.service_id = s.id
     WHERE ps.package_id = ?`,
    [packageId]
  );

  if (dbServices.length > 0) return dbServices;


  const [pkgDetails] = await conn.query(
    'SELECT wash_count, wax_count FROM packages WHERE id = ?',
    [packageId]
  );
  const fallback = [];
  if (pkgDetails.length) {
    if (pkgDetails[0].wash_count > 0) {
      fallback.push({ service_name: 'Foam Wash', total_count: pkgDetails[0].wash_count });
    }
    if (pkgDetails[0].wax_count > 0) {
      fallback.push({ service_name: 'Wax Coat', total_count: pkgDetails[0].wax_count });
    }
  }
  return fallback;
}

// ═══════════════════════════════════════════════════════════
// ASSIGN PACKAGE TO USER
// POST /packages/assign
// ═══════════════════════════════════════════════════════════
exports.assignPackage = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { user_id, package_id, vehicle_id, vehicle_segment, price_paid, duration_months = 12 } = req.body;

    if (!user_id || !package_id) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'user_id and package_id are required' });
    }

    // Verify user exists
    const [users] = await conn.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (!users.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify package exists
    const [packages] = await conn.query('SELECT id, name FROM packages WHERE id = ?', [package_id]);
    if (!packages.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    // Check for existing active package (prevent duplicates)
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
        error: 'User already has an active package. Renew instead.',
        existing_package_id: activeExisting[0].id
      });
    }

    // Insert into user_packages with new Phase 2 fields
    const [result] = await conn.query(
      `INSERT INTO user_packages
       (user_id, package_id, end_date, payment_status, package_status, price_paid, vehicle_segment, vehicle_id)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MONTH), 'paid', 'active', ?, ?, ?)`,
      [user_id, package_id, duration_months, price_paid || null, vehicle_segment || null, vehicle_id || null]
    );
    const userPackageId = result.insertId;

    // Create package_usage rows
    const packageName = packages[0].name;
    const serviceBreakdown = await getServiceBreakdown(conn, package_id, packageName);

    for (const svc of serviceBreakdown) {
      await conn.query(
        'INSERT INTO package_usage (user_package_id, service_name, used_count, usage_status) VALUES (?, ?, 0, ?)',
        [userPackageId, svc.service_name, 'available']
      );
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      data: { id: userPackageId },
      message: `${packageName} package assigned to user ${user_id}`,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Assign package error:', err);
    res.status(500).json({ success: false, error: 'Failed to assign package' });
  } finally {
    conn.release();
  }
};

// ═══════════════════════════════════════════════════════════
// RENEW PACKAGE
// POST /user-packages/:id/renew
// ═══════════════════════════════════════════════════════════
exports.renewPackage = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { duration_months = 12, price_paid, vehicle_segment } = req.body;

    // Get current package
    const [existing] = await conn.query(
      'SELECT * FROM user_packages WHERE id = ?', [id]
    );
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Package subscription not found' });
    }

    const currentPkg = existing[0];

    // Mark current as renewed
    await conn.query(
      `UPDATE user_packages SET package_status = 'renewed', renewed_at = NOW() WHERE id = ?`,
      [id]
    );

    // Calculate new end_date: extend from current end_date if still active, else from NOW
    const baseDate = currentPkg.end_date && new Date(currentPkg.end_date) > new Date()
      ? currentPkg.end_date
      : new Date();

    const [newResult] = await conn.query(
      `INSERT INTO user_packages
       (user_id, package_id, start_date, end_date, renewed_from_id, payment_status, package_status, price_paid, vehicle_segment, vehicle_id)
       VALUES (?, ?, NOW(), DATE_ADD(?, INTERVAL ? MONTH), ?, 'paid', 'active', ?, ?, ?)`,
      [
        currentPkg.user_id, currentPkg.package_id,
        baseDate, duration_months, id,
        price_paid || currentPkg.price_paid, vehicle_segment || currentPkg.vehicle_segment,
        currentPkg.vehicle_id
      ]
    );
    const newUserPackageId = newResult.insertId;

    // Create fresh usage rows for the renewed package
    const [pkgInfo] = await conn.query('SELECT name FROM packages WHERE id = ?', [currentPkg.package_id]);
    const packageName = pkgInfo.length ? pkgInfo[0].name : '';
    const serviceBreakdown = await getServiceBreakdown(conn, currentPkg.package_id, packageName);

    for (const svc of serviceBreakdown) {
      await conn.query(
        'INSERT INTO package_usage (user_package_id, service_name, used_count, usage_status) VALUES (?, ?, 0, ?)',
        [newUserPackageId, svc.service_name, 'available']
      );
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      data: { id: newUserPackageId, renewed_from: id },
      message: 'Package renewed successfully',
    });
  } catch (err) {
    await conn.rollback();
    console.error('Renew package error:', err);
    res.status(500).json({ success: false, error: 'Failed to renew package' });
  } finally {
    conn.release();
  }
};

// ═══════════════════════════════════════════════════════════
// CHECK SERVICE AVAILABILITY (read-only — for deferred deduction)
// Does NOT reserve or deduct. Just checks if customer can use a service.
// ═══════════════════════════════════════════════════════════
exports.checkServiceAvailability = async (conn, userId, serviceName) => {
  // Find active package
  const [activePackages] = await conn.query(
    `SELECT up.id, up.package_id, p.name AS package_name
     FROM user_packages up
     JOIN packages p ON p.id = up.package_id
     WHERE up.user_id = ? AND up.package_status = 'active'
       AND (up.end_date IS NULL OR up.end_date > NOW())
     ORDER BY up.start_date DESC LIMIT 1`,
    [userId]
  );

  if (!activePackages.length) {
    return { has_package: false, can_use: false, remaining: 0, reason: 'No active package found' };
  }

  const userPackageId = activePackages[0].id;
  const packageId = activePackages[0].package_id;
  const packageName = activePackages[0].package_name;

  // Get total_count for this service
  const serviceBreakdown = await getServiceBreakdown(conn, packageId, packageName);
  let serviceEntry = serviceBreakdown.find(s => s.service_name.toLowerCase().trim() === serviceName?.toLowerCase().trim());

  if (!serviceEntry) {
    serviceEntry = serviceBreakdown.find(s => {
      const dbName = s.service_name.toLowerCase();
      const reqName = serviceName?.toLowerCase() || '';
      return dbName.includes(reqName) || reqName.includes(dbName) || 
             (reqName.includes("wash") && dbName.includes("wash"));
    });
  }

  if (!serviceEntry) {
    console.log('--- checkServiceAvailability FAILED ---');
    console.log('serviceName requested:', serviceName);
    console.log('serviceBreakdown:', serviceBreakdown);
    return { has_package: true, can_use: false, remaining: 0, reason: `Service not included in your package: ${serviceName}` };
  }

  const canonicalServiceName = serviceEntry.service_name;

  const totalCount = serviceEntry.total_count;

  // Get used_count (read-only — no FOR UPDATE)
  const [usage] = await conn.query(
    'SELECT used_count FROM package_usage WHERE user_package_id = ? AND service_name = ?',
    [userPackageId, canonicalServiceName]
  );

  const usedCount = usage.length ? usage[0].used_count : 0;
  const remaining = totalCount - usedCount;

  if (remaining <= 0) {
    return { has_package: true, can_use: false, remaining: 0, reason: 'No remaining credits for this service' };
  }

  return {
    has_package: true,
    can_use: true,
    remaining: remaining,
    package_name: packageName,
    user_package_id: userPackageId,
    canonical_service_name: canonicalServiceName,
  };
};

// ═══════════════════════════════════════════════════════════
// CHECK & RESERVE SERVICE (booking-time)
// Does NOT consume — only reserves. Consumed after job completion.
// ═══════════════════════════════════════════════════════════
exports.checkAndUseService = async (conn, userId, serviceName) => {
  // Find active package
  const [activePackages] = await conn.query(
    `SELECT up.id, up.package_id, p.name AS package_name
     FROM user_packages up
     JOIN packages p ON p.id = up.package_id
     WHERE up.user_id = ? AND up.package_status = 'active'
       AND (up.end_date IS NULL OR up.end_date > NOW())
     ORDER BY up.start_date DESC LIMIT 1`,
    [userId]
  );

  if (!activePackages.length) {
    return { has_package: false, can_use: false, remaining: 0 };
  }

  const userPackageId = activePackages[0].id;
  const packageId = activePackages[0].package_id;
  const packageName = activePackages[0].package_name;

  // Get total_count for this service
  const serviceBreakdown = await getServiceBreakdown(conn, packageId, packageName);
  let serviceEntry = serviceBreakdown.find(s => s.service_name.toLowerCase().trim() === serviceName?.toLowerCase().trim());

  if (!serviceEntry) {
    serviceEntry = serviceBreakdown.find(s => {
      const dbName = s.service_name.toLowerCase();
      const reqName = serviceName?.toLowerCase() || '';
      return dbName.includes(reqName) || reqName.includes(dbName) || 
             (reqName.includes("wash") && dbName.includes("wash"));
    });
  }

  if (!serviceEntry) {
    return { has_package: true, can_use: false, remaining: 0, reason: 'Service not in package' };
  }

  const canonicalServiceName = serviceEntry.service_name;

  const totalCount = serviceEntry.total_count;

  // Get used_count (lock row)
  const [usage] = await conn.query(
    'SELECT id, used_count FROM package_usage WHERE user_package_id = ? AND service_name = ? FOR UPDATE',
    [userPackageId, canonicalServiceName]
  );

  const usedCount = usage.length ? usage[0].used_count : 0;
  const remaining = totalCount - usedCount;

  if (remaining <= 0) {
    return { has_package: true, can_use: false, remaining: 0, reason: 'No remaining credits' };
  }

  if (usage.length) {
    await conn.query(
      'UPDATE package_usage SET used_count = used_count + 1 WHERE id = ?',
      [usage[0].id]
    );
  } else {
    await conn.query(
      'INSERT INTO package_usage (user_package_id, service_name, used_count) VALUES (?, ?, 1)',
      [userPackageId, canonicalServiceName]
    );
  }

  return {
    has_package: true,
    can_use: true,
    remaining: remaining - 1,
    package_name: packageName,
    user_package_id: userPackageId,
    canonical_service_name: canonicalServiceName,
  };
};

// ═══════════════════════════════════════════════════════════
// CONSUME SERVICE (after job card completion)
// ═══════════════════════════════════════════════════════════
exports.consumeService = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { user_package_id, service_name, booking_id, job_card_id } = req.body;

    if (!user_package_id || !service_name) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'user_package_id and service_name required' });
    }

    const [usage] = await conn.query(
      "SELECT id FROM package_usage WHERE user_package_id = ? AND service_name = ? AND usage_status = 'reserved' FOR UPDATE",
      [user_package_id, service_name]
    );

    if (!usage.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'No reserved usage found' });
    }

    await conn.query(
      `UPDATE package_usage SET usage_status = 'consumed', consumed_at = NOW(),
       booking_id = ?, job_card_id = ? WHERE id = ?`,
      [booking_id || null, job_card_id || null, usage[0].id]
    );

    await conn.commit();
    res.json({ success: true, message: 'Service usage consumed' });
  } catch (err) {
    await conn.rollback();
    console.error('Consume service error:', err);
    res.status(500).json({ success: false, error: 'Failed to consume service' });
  } finally {
    conn.release();
  }
};

// ═══════════════════════════════════════════════════════════
// CANCEL RESERVATION (release usage on booking cancel)
// ═══════════════════════════════════════════════════════════
exports.cancelReservation = async (conn, userPackageId, serviceName) => {
  try {
    await conn.query(
      `UPDATE package_usage
       SET used_count = GREATEST(0, used_count - 1)
       WHERE user_package_id = ? AND service_name = ?
       LIMIT 1`,
      [userPackageId, serviceName]
    );
    return true;
  } catch (err) {
    console.error('Cancel reservation error:', err);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════
// GET ACTIVE PACKAGE
// ═══════════════════════════════════════════════════════════
exports.getActivePackage = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id
      ? req.query.user_id
      : req.user.id;

    const [packages] = await pool.query(`
      SELECT up.id, up.package_id, up.start_date, up.end_date,
             up.package_status, up.payment_status, up.price_paid,
             up.vehicle_segment, up.renewed_from_id,
             p.name AS package_name, p.description, p.wash_count, p.wax_count
      FROM user_packages up
      JOIN packages p ON up.package_id = p.id
      WHERE up.user_id = ? AND up.package_status = 'active'
        AND (up.end_date IS NULL OR up.end_date > NOW())
      ORDER BY up.start_date DESC LIMIT 1
    `, [userId]);

    if (!packages.length) {
      return res.json({ success: true, data: null, message: 'No active package' });
    }

    const activePackage = packages[0];

    // Build usage data
    const serviceMap = await getServiceBreakdown(pool, activePackage.package_id, activePackage.package_name);
    const [usageRows] = await pool.query(
      'SELECT service_name, used_count FROM package_usage WHERE user_package_id = ?',
      [activePackage.id]
    );

    const usage = serviceMap.map(svc => {
      const row = usageRows.find(u => u.service_name === svc.service_name);
      const usedCount = row ? row.used_count : 0;
      return {
        service_name: svc.service_name,
        total_count: svc.total_count,
        used_count: usedCount,
        remaining: svc.total_count - usedCount,
      };
    });

    // Calculate days remaining
    const daysRemaining = activePackage.end_date
      ? Math.max(0, Math.ceil((new Date(activePackage.end_date) - new Date()) / (1000 * 60 * 60 * 24)))
      : null;

    res.json({
      success: true,
      data: { ...activePackage, usage, days_remaining: daysRemaining },
    });
  } catch (err) {
    console.error('Get active package error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch active package' });
  }
};

// ═══════════════════════════════════════════════════════════
// PACKAGE HISTORY (all packages for a user)
// ═══════════════════════════════════════════════════════════
exports.listUserPackages = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id
      ? req.query.user_id
      : req.user.id;

    const [packages] = await pool.query(`
      SELECT up.id, up.package_id, up.start_date, up.end_date, up.created_at,
             up.package_status, up.payment_status, up.price_paid,
             up.vehicle_segment, up.renewed_from_id, up.renewed_at,
             p.name AS package_name, p.description
      FROM user_packages up
      JOIN packages p ON up.package_id = p.id
      WHERE up.user_id = ?
      ORDER BY up.created_at DESC
    `, [userId]);

    for (const pkg of packages) {
      const serviceMap = await getServiceBreakdown(pool, pkg.package_id, pkg.package_name);
      const [usageRows] = await pool.query(
        'SELECT service_name, used_count FROM package_usage WHERE user_package_id = ?',
        [pkg.id]
      );
      pkg.usage = serviceMap.map(svc => {
        const row = usageRows.find(u => u.service_name === svc.service_name);
        const usedCount = row ? row.used_count : 0;
        return {
          service_name: svc.service_name,
          total_count: svc.total_count,
          used_count: usedCount,
          remaining: svc.total_count - usedCount,
        };
      });

      // Calculate days remaining
      pkg.days_remaining = pkg.end_date
        ? Math.max(0, Math.ceil((new Date(pkg.end_date) - new Date()) / (1000 * 60 * 60 * 24)))
        : null;
    }

    res.json({ success: true, data: packages });
  } catch (err) {
    console.error('List user packages error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch package history' });
  }
};

// ═══════════════════════════════════════════════════════════
// DASHBOARD PACKAGE DATA
// ═══════════════════════════════════════════════════════════
exports.getDashboardPackageData = async (userId) => {
  let primaryCar = [];
  try {
    [primaryCar] = await pool.query(
      'SELECT id, brand, model, registration_no FROM vehicles WHERE customer_id = ? AND is_primary = 1 LIMIT 1',
      [userId]
    );
  } catch (e) {
    // is_primary column may not exist — fallback below
  }
  // Fallback: if no primary car found, get the first car for this customer
  if (!primaryCar.length) {
    try {
      [primaryCar] = await pool.query(
        'SELECT id, brand, model, registration_no FROM vehicles WHERE customer_id = ? ORDER BY created_at ASC LIMIT 1',
        [userId]
      );
    } catch (e) { /* ignore */ }
  }

  const [activePackages] = await pool.query(`
    SELECT up.id, up.package_id, up.start_date, up.end_date,
           up.package_status, up.price_paid,
           p.name AS package_name, p.description
    FROM user_packages up
    JOIN packages p ON up.package_id = p.id
    WHERE up.user_id = ? AND up.package_status = 'active'
      AND (up.end_date IS NULL OR up.end_date > NOW())
    ORDER BY up.start_date DESC LIMIT 1
  `, [userId]);

  let activePackage = null;
  if (activePackages.length) {
    const pkg = activePackages[0];
    const serviceMap = await getServiceBreakdown(pool, pkg.package_id, pkg.package_name);
    const [usageRows] = await pool.query(
      'SELECT service_name, used_count FROM package_usage WHERE user_package_id = ?',
      [pkg.id]
    );

    activePackage = {
      ...pkg,
      usage: serviceMap.map(svc => {
        const row = usageRows.find(u => u.service_name === svc.service_name);
        const usedCount = row ? row.used_count : 0;
        return {
          service_name: svc.service_name,
          total_count: svc.total_count,
          used_count: usedCount,
          remaining: svc.total_count - usedCount,
        };
      }),
      days_remaining: pkg.end_date
        ? Math.max(0, Math.ceil((new Date(pkg.end_date) - new Date()) / (1000 * 60 * 60 * 24)))
        : null,
    };
  }

  return {
    primary_car: primaryCar[0] || null,
    active_package: activePackage,
  };
};

// ═══════════════════════════════════════════════════════════
// EXPIRE CHECK (called by cron)
// ═══════════════════════════════════════════════════════════
exports.expirePackages = async () => {
  try {
    const [result] = await pool.query(
      `UPDATE user_packages SET package_status = 'expired'
       WHERE package_status = 'active' AND end_date IS NOT NULL AND end_date <= NOW()`
    );
    if (result.affectedRows > 0) {
      console.log(`[CRON] Expired ${result.affectedRows} package(s)`);
    }
    return result.affectedRows;
  } catch (err) {
    console.error('Expire packages error:', err);
    return 0;
  }
};

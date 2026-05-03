/**
 * ═══════════════════════════════════════════════════════════
 * USER PACKAGES CONTROLLER — Production-Safe
 * ═══════════════════════════════════════════════════════════
 *
 * TASK 4: Package assignment API
 * TASK 5: Package usage logic
 * TASK 6: Safe transaction handling
 * TASK 7: Dashboard query
 *
 * Tables used:
 *   - user_packages (user_id, package_id, start_date, end_date)
 *   - package_usage (user_package_id, service_name, used_count)
 *   - package_services (package_id, service_id, total_count)
 *   - packages (wash_count, wax_count, etc.)
 *   - vehicles (is_primary)
 *
 * ⚠️  This file is ADDITIVE — does NOT modify any existing controller.
 *
 * SERVICE BREAKDOWN PRIORITY:
 *   1. DB: package_services JOIN services → { service_name, total_count }
 *   2. Fallback: PACKAGE_SERVICE_MAP (hardcoded legacy tiers)
 *   3. Fallback: wash_count / wax_count from packages table
 */

const pool = require('../config/db');

// ─── Legacy service breakdown per package tier ──────────────
// Used as fallback for old packages that don't have package_services rows.
const PACKAGE_SERVICE_MAP = {
  'Bronze': [
    { service_name: 'Foam Wash', total_count: 1 },
    { service_name: 'Wax Coat', total_count: 1 },
  ],
  'Silver': [
    { service_name: 'Foam Wash', total_count: 2 },
    { service_name: 'Wax Coat', total_count: 2 },
  ],
  'Gold': [
    { service_name: 'Foam Wash', total_count: 4 },
    { service_name: 'Wax Coat', total_count: 3 },
  ],
  'Diamond': [
    { service_name: 'Foam Wash', total_count: 6 },
    { service_name: 'Wax Coat', total_count: 2 },
    { service_name: 'Two Wheeler Wash', total_count: 2 },
  ],
  'Platinum': [
    { service_name: 'Foam Wash', total_count: 8 },
    { service_name: 'Wax Coat', total_count: 3 },
    { service_name: 'Deep Cleaning', total_count: 1 },
  ],
};

/**
 * getServiceBreakdown — DB-first with legacy fallback
 * Returns array of { service_name, total_count }
 */
async function getServiceBreakdown(conn, packageId, packageName) {
  // Priority 1: Check database (package_services with total_count)
  const [dbServices] = await conn.query(
    `SELECT s.name AS service_name, ps.total_count
     FROM package_services ps
     JOIN services s ON ps.service_id = s.id
     WHERE ps.package_id = ?`,
    [packageId]
  );

  if (dbServices.length > 0) {
    return dbServices;
  }

  // Priority 2: Legacy hardcoded map
  if (PACKAGE_SERVICE_MAP[packageName]) {
    return PACKAGE_SERVICE_MAP[packageName];
  }

  // Priority 3: Generic fallback from wash_count/wax_count
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
// TASK 4 — ASSIGN PACKAGE TO USER
// POST /packages/assign
// Body: { user_id, package_id }
// Logic: Insert into user_packages, create package_usage rows
// ═══════════════════════════════════════════════════════════
exports.assignPackage = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction(); // TASK 6: Safe transaction

    const { user_id, package_id } = req.body;

    // Step 1: Validate input
    if (!user_id || !package_id) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: 'user_id and package_id are required',
      });
    }

    // Step 2: Verify user exists
    const [users] = await conn.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (!users.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Step 3: Verify package exists and get its name
    const [packages] = await conn.query('SELECT id, name FROM packages WHERE id = ?', [package_id]);
    if (!packages.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    // Step 4: Insert into user_packages (start_date = NOW, end_date = 1 year from now)
    const [result] = await conn.query(
      'INSERT INTO user_packages (user_id, package_id, end_date) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 YEAR))',
      [user_id, package_id]
    );
    const userPackageId = result.insertId;

    // Step 5: Create package_usage rows — DB-first with fallback
    const packageName = packages[0].name;
    const serviceBreakdown = await getServiceBreakdown(conn, package_id, packageName);

    for (const svc of serviceBreakdown) {
      await conn.query(
        'INSERT INTO package_usage (user_package_id, service_name, used_count) VALUES (?, ?, 0)',
        [userPackageId, svc.service_name]
      );
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      data: { id: userPackageId },
      message: `${packageName} package assigned to user ${user_id}`,
    });
  } catch (err) {
    await conn.rollback(); // TASK 6: Rollback on error
    console.error('Assign package error:', err);
    res.status(500).json({ success: false, error: 'Failed to assign package' });
  } finally {
    conn.release();
  }
};

// ═══════════════════════════════════════════════════════════
// TASK 5 — CHECK & USE PACKAGE SERVICE
// Called during booking to check if service can be deducted.
// Returns: { has_package, can_use, remaining }
// ═══════════════════════════════════════════════════════════
exports.checkAndUseService = async (conn, userId, serviceName) => {
  // Step 1: Check if user has an active package
  const [activePackages] = await conn.query(
    `SELECT up.id, up.package_id, p.name AS package_name
     FROM user_packages up
     JOIN packages p ON p.id = up.package_id
     WHERE up.user_id = ? AND (up.end_date IS NULL OR up.end_date > NOW())
     ORDER BY up.start_date DESC LIMIT 1`,
    [userId]
  );

  if (!activePackages.length) {
    return { has_package: false, can_use: false, remaining: 0 };
  }

  const userPackageId = activePackages[0].id;
  const packageId = activePackages[0].package_id;
  const packageName = activePackages[0].package_name;

  // Step 2: Get total_count for this service — DB-first with fallback
  const serviceBreakdown = await getServiceBreakdown(conn, packageId, packageName);
  const serviceEntry = serviceBreakdown.find(s => s.service_name === serviceName);

  if (!serviceEntry) {
    return { has_package: true, can_use: false, remaining: 0, reason: 'Service not in package' };
  }

  const totalCount = serviceEntry.total_count;

  // Step 3: Get used_count from package_usage (or 0 if no row exists)
  const [usage] = await conn.query(
    'SELECT id, used_count FROM package_usage WHERE user_package_id = ? AND service_name = ? FOR UPDATE',
    [userPackageId, serviceName]
  );

  const usedCount = usage.length ? usage[0].used_count : 0;

  // Step 4: Compute remaining
  const remaining = totalCount - usedCount;

  if (remaining <= 0) {
    return { has_package: true, can_use: false, remaining: 0, reason: 'No remaining credits' };
  }

  // Step 5: Increment used_count (TASK 6: already inside a transaction)
  if (usage.length) {
    await conn.query(
      'UPDATE package_usage SET used_count = used_count + 1 WHERE id = ?',
      [usage[0].id]
    );
  } else {
    // Create usage row if it doesn't exist yet
    await conn.query(
      'INSERT INTO package_usage (user_package_id, service_name, used_count) VALUES (?, ?, 1)',
      [userPackageId, serviceName]
    );
  }

  return {
    has_package: true,
    can_use: true,
    remaining: remaining - 1,
    package_name: packageName,
  };
};

// ═══════════════════════════════════════════════════════════
// GET ACTIVE PACKAGE (for dashboard / API)
// ═══════════════════════════════════════════════════════════
exports.getActivePackage = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id
      ? req.query.user_id
      : req.user.id;

    // Step 1: Find active package
    const [packages] = await pool.query(`
      SELECT up.id, up.package_id, up.start_date, up.end_date,
             p.name AS package_name, p.description, p.wash_count, p.wax_count
      FROM user_packages up
      JOIN packages p ON up.package_id = p.id
      WHERE up.user_id = ? AND (up.end_date IS NULL OR up.end_date > NOW())
      ORDER BY up.start_date DESC LIMIT 1
    `, [userId]);

    if (!packages.length) {
      return res.json({ success: true, data: null, message: 'No active package' });
    }

    const activePackage = packages[0];

    // Step 2: Get usage + compute remaining — DB-first with fallback
    const serviceMap = await getServiceBreakdown(pool, activePackage.package_id, activePackage.package_name);
    const [usageRows] = await pool.query(
      'SELECT service_name, used_count FROM package_usage WHERE user_package_id = ?',
      [activePackage.id]
    );

    // Build usage summary with remaining counts
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

    res.json({
      success: true,
      data: { ...activePackage, usage },
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
             p.name AS package_name, p.description
      FROM user_packages up
      JOIN packages p ON up.package_id = p.id
      WHERE up.user_id = ?
      ORDER BY up.created_at DESC
    `, [userId]);

    // Enrich each package with usage data — DB-first with fallback
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
    }

    res.json({ success: true, data: packages });
  } catch (err) {
    console.error('List user packages error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch package history' });
  }
};

// ═══════════════════════════════════════════════════════════
// TASK 7 — DASHBOARD QUERY (exported for dashboardController)
// Returns primary vehicle + active package + remaining services
// ═══════════════════════════════════════════════════════════
exports.getDashboardPackageData = async (userId) => {
  // Primary vehicle
  const [primaryCar] = await pool.query(
    'SELECT id, brand, model, registration_no FROM vehicles WHERE customer_id = ? AND is_primary = 1 LIMIT 1',
    [userId]
  );

  // Active package with usage
  const [activePackages] = await pool.query(`
    SELECT up.id, up.package_id, up.start_date, up.end_date,
           p.name AS package_name, p.description
    FROM user_packages up
    JOIN packages p ON up.package_id = p.id
    WHERE up.user_id = ? AND (up.end_date IS NULL OR up.end_date > NOW())
    ORDER BY up.start_date DESC LIMIT 1
  `, [userId]);

  let activePackage = null;
  if (activePackages.length) {
    const pkg = activePackages[0];
    // DB-first service breakdown with legacy fallback
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
    };
  }

  return {
    primary_car: primaryCar[0] || null,
    active_package: activePackage,
  };
};

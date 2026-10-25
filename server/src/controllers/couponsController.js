const pool = require('../config/db');
const messagingService = require('../services/messagingService');

/**
 * ─── COUPONS CONTROLLER ───────────────────────────────────────
 * Full lifecycle management, validation engine, redemption tracking,
 * and WhatsApp sharing campaigns.
 */

// ─── 1. VALIDATE COUPON (Customer & Admin) ────────────────────
exports.validateCoupon = async (req, res) => {
  try {
    const { code, order_amount = 0, service_ids = [], package_ids = [], customer_id } = req.body;
    const targetCustomerId = customer_id || (req.user ? req.user.id : null);

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Coupon code is required' });
    }

    const cleanCode = code.trim().toUpperCase();

    // Fetch active coupon
    const [coupons] = await pool.query(
      'SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1',
      [cleanCode]
    );

    if (!coupons.length) {
      return res.status(404).json({ success: false, error: 'Invalid or inactive coupon code' });
    }

    const coupon = coupons[0];
    const now = new Date();

    // Check date validity
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return res.status(400).json({ success: false, error: 'This coupon offer is not active yet' });
    }
    if (coupon.valid_to && new Date(coupon.valid_to) < now) {
      return res.status(400).json({ success: false, error: 'This coupon offer has expired' });
    }

    const orderTotal = parseFloat(order_amount) || 0;

    // Check minimum order amount
    if (orderTotal < parseFloat(coupon.min_order_amount || 0)) {
      return res.status(400).json({
        success: false,
        error: `Minimum bill amount of ₹${coupon.min_order_amount} required to use this coupon`
      });
    }

    // Check total usage limit
    if (coupon.total_usage_limit !== null && coupon.total_usage_limit > 0) {
      const [usageRows] = await pool.query(
        'SELECT COUNT(*) as total_used FROM coupon_redemptions WHERE coupon_id = ?',
        [coupon.id]
      );
      if (usageRows[0].total_used >= coupon.total_usage_limit) {
        return res.status(400).json({ success: false, error: 'This coupon has reached its maximum usage limit' });
      }
    }

    // If customer is identified, check customer-specific limits
    if (targetCustomerId) {
      // 1. Per customer limit
      if (coupon.per_customer_limit !== null && coupon.per_customer_limit > 0) {
        const [custUsageRows] = await pool.query(
          'SELECT COUNT(*) as cust_used FROM coupon_redemptions WHERE coupon_id = ? AND customer_id = ?',
          [coupon.id, targetCustomerId]
        );
        if (custUsageRows[0].cust_used >= coupon.per_customer_limit) {
          return res.status(400).json({
            success: false,
            error: `You have already redeemed this coupon ${coupon.per_customer_limit} time(s)`
          });
        }
      }

      // 2. First-time only check
      if (coupon.first_time_only === 1) {
        const [priorCarts] = await pool.query(
          `SELECT COUNT(*) as completed_count FROM job_carts jc
           JOIN vehicles v ON jc.vehicle_id = v.id
           WHERE v.customer_id = ? AND jc.status = 'complete'`,
          [targetCustomerId]
        );
        if (priorCarts[0].completed_count > 0) {
          return res.status(400).json({
            success: false,
            error: 'This welcome offer is only valid for first-time customers'
          });
        }
      }
    }

    // Check applicable services / packages restriction if defined
    if (coupon.applicable_services) {
      let allowedServices = [];
      try {
        allowedServices = typeof coupon.applicable_services === 'string'
          ? JSON.parse(coupon.applicable_services)
          : coupon.applicable_services;
      } catch (e) {}

      if (Array.isArray(allowedServices) && allowedServices.length > 0 && Array.isArray(service_ids) && service_ids.length > 0) {
        const hasApplicableService = service_ids.some(sId => allowedServices.includes(Number(sId)));
        if (!hasApplicableService) {
          return res.status(400).json({
            success: false,
            error: 'This coupon is not applicable to the selected service(s)'
          });
        }
      }
    }

    // Calculate discount amount
    let discount = 0;
    const couponVal = parseFloat(coupon.value);
    if (coupon.type === 'percentage') {
      discount = orderTotal * (couponVal / 100);
      if (coupon.max_discount !== null && parseFloat(coupon.max_discount) > 0) {
        discount = Math.min(discount, parseFloat(coupon.max_discount));
      }
    } else {
      discount = Math.min(couponVal, orderTotal);
    }

    discount = Math.round(discount * 100) / 100;
    const finalTotal = Math.max(0, orderTotal - discount);

    res.json({
      success: true,
      data: {
        coupon_id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        type: coupon.type,
        value: couponVal,
        discount_amount: discount,
        final_amount: finalTotal,
        message: `Coupon applied: Saved ₹${discount}!`
      }
    });

  } catch (err) {
    console.error('Validate coupon error:', err);
    res.status(500).json({ success: false, error: 'Server error validating coupon' });
  }
};

// ─── 2. LIST ALL COUPONS (Admin) ──────────────────────────────
exports.listCoupons = async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let whereClause = '1=1';
    const params = [];

    if (search.trim()) {
      whereClause += ' AND (code LIKE ? OR title LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (status === 'active') {
      whereClause += ' AND is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = 0';
    }

    const [rows] = await pool.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.coupon_id = c.id) as redemption_count,
        (SELECT COALESCE(SUM(cr.discount_amount), 0) FROM coupon_redemptions cr WHERE cr.coupon_id = c.id) as total_savings_granted
       FROM coupons c
       WHERE ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM coupons WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: countRows[0].total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('List coupons error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch coupons' });
  }
};

// ─── 3. PUBLIC / ACTIVE OFFERS (Customer) ────────────────────
exports.listActiveOffers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, code, title, type, value, max_discount, min_order_amount, valid_to, first_time_only
      FROM coupons
      WHERE is_active = 1
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_to IS NULL OR valid_to >= NOW())
      ORDER BY value DESC
      LIMIT 10
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List active offers error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch offers' });
  }
};

// ─── 4. CREATE COUPON (Admin) ─────────────────────────────────
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      title,
      type = 'percentage',
      value,
      max_discount,
      min_order_amount = 0,
      applicable_services,
      applicable_packages,
      valid_from,
      valid_to,
      total_usage_limit,
      per_customer_limit = 1,
      first_time_only = 0,
      is_active = 1
    } = req.body;

    if (!code || !title || value === undefined) {
      return res.status(400).json({ success: false, error: 'Code, title, and discount value are required' });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check duplicate code
    const [existing] = await pool.query('SELECT id FROM coupons WHERE UPPER(code) = ?', [cleanCode]);
    if (existing.length) {
      return res.status(409).json({ success: false, error: 'A coupon with this code already exists' });
    }

    const [result] = await pool.query(
      `INSERT INTO coupons (
        code, title, type, value, max_discount, min_order_amount,
        applicable_services, applicable_packages, valid_from, valid_to,
        total_usage_limit, per_customer_limit, first_time_only, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanCode,
        title.trim(),
        type,
        parseFloat(value),
        max_discount ? parseFloat(max_discount) : null,
        parseFloat(min_order_amount || 0),
        applicable_services ? JSON.stringify(applicable_services) : null,
        applicable_packages ? JSON.stringify(applicable_packages) : null,
        valid_from || null,
        valid_to || null,
        total_usage_limit ? parseInt(total_usage_limit) : null,
        parseInt(per_customer_limit || 1),
        first_time_only ? 1 : 0,
        is_active ? 1 : 0,
        req.user ? req.user.id : null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: { id: result.insertId, code: cleanCode }
    });
  } catch (err) {
    console.error('Create coupon error:', err);
    res.status(500).json({ success: false, error: 'Failed to create coupon' });
  }
};

// ─── 5. UPDATE COUPON (Admin) ─────────────────────────────────
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      type,
      value,
      max_discount,
      min_order_amount,
      applicable_services,
      applicable_packages,
      valid_from,
      valid_to,
      total_usage_limit,
      per_customer_limit,
      first_time_only,
      is_active
    } = req.body;

    const [existing] = await pool.query('SELECT id FROM coupons WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    await pool.query(
      `UPDATE coupons SET
        title = COALESCE(?, title),
        type = COALESCE(?, type),
        value = COALESCE(?, value),
        max_discount = ?,
        min_order_amount = COALESCE(?, min_order_amount),
        applicable_services = ?,
        applicable_packages = ?,
        valid_from = ?,
        valid_to = ?,
        total_usage_limit = ?,
        per_customer_limit = COALESCE(?, per_customer_limit),
        first_time_only = COALESCE(?, first_time_only),
        is_active = COALESCE(?, is_active)
      WHERE id = ?`,
      [
        title ? title.trim() : null,
        type || null,
        value !== undefined ? parseFloat(value) : null,
        max_discount !== undefined ? (max_discount ? parseFloat(max_discount) : null) : undefined,
        min_order_amount !== undefined ? parseFloat(min_order_amount) : null,
        applicable_services !== undefined ? (applicable_services ? JSON.stringify(applicable_services) : null) : undefined,
        applicable_packages !== undefined ? (applicable_packages ? JSON.stringify(applicable_packages) : null) : undefined,
        valid_from !== undefined ? (valid_from || null) : undefined,
        valid_to !== undefined ? (valid_to || null) : undefined,
        total_usage_limit !== undefined ? (total_usage_limit ? parseInt(total_usage_limit) : null) : undefined,
        per_customer_limit !== undefined ? parseInt(per_customer_limit) : null,
        first_time_only !== undefined ? (first_time_only ? 1 : 0) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      ]
    );

    res.json({ success: true, message: 'Coupon updated successfully' });
  } catch (err) {
    console.error('Update coupon error:', err);
    res.status(500).json({ success: false, error: 'Failed to update coupon' });
  }
};

// ─── 6. TOGGLE COUPON STATUS (Admin) ──────────────────────────
exports.toggleCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT is_active FROM coupons WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Coupon not found' });

    const newStatus = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE coupons SET is_active = ? WHERE id = ?', [newStatus, id]);

    res.json({ success: true, is_active: newStatus, message: `Coupon ${newStatus ? 'activated' : 'disabled'}` });
  } catch (err) {
    console.error('Toggle coupon error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── 7. DELETE COUPON (Admin) ─────────────────────────────────
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM coupons WHERE id = ?', [id]);
    res.json({ success: true, message: 'Coupon removed' });
  } catch (err) {
    console.error('Delete coupon error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete coupon' });
  }
};

// ─── 8. GET REDEMPTIONS (Admin) ───────────────────────────────
exports.getCouponRedemptions = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT cr.*, u.name as customer_name, u.mobile as customer_mobile, jc.invoice_number
       FROM coupon_redemptions cr
       LEFT JOIN users u ON cr.customer_id = u.id
       LEFT JOIN job_carts jc ON cr.job_cart_id = jc.id
       WHERE cr.coupon_id = ?
       ORDER BY cr.created_at DESC
       LIMIT 100`,
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get coupon redemptions error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch redemptions' });
  }
};

// ─── 9. SHARE COUPON VIA WHATSAPP (Admin) ─────────────────────
exports.shareCoupon = async (req, res) => {
  try {
    const { coupon_id, customer_ids = [], send_to_all = false } = req.body;

    const [coupons] = await pool.query('SELECT * FROM coupons WHERE id = ?', [coupon_id]);
    if (!coupons.length) return res.status(404).json({ success: false, error: 'Coupon not found' });
    const coupon = coupons[0];

    let targetCustomers = [];
    if (send_to_all) {
      const [allCusts] = await pool.query(
        "SELECT id, name, mobile FROM users WHERE role = 'customer' AND is_active = 1 AND opt_out_promotional = 0"
      );
      targetCustomers = allCusts;
    } else if (Array.isArray(customer_ids) && customer_ids.length > 0) {
      const [selCusts] = await pool.query(
        'SELECT id, name, mobile FROM users WHERE id IN (?) AND is_active = 1',
        [customer_ids]
      );
      targetCustomers = selCusts;
    }

    if (!targetCustomers.length) {
      return res.status(400).json({ success: false, error: 'No eligible customer recipients found' });
    }

    const discountText = coupon.type === 'percentage'
      ? `${coupon.value}% OFF (up to ₹${coupon.max_discount || 'Unlimited'})`
      : `Flat ₹${coupon.value} OFF`;

    const validTill = coupon.valid_to
      ? new Date(coupon.valid_to).toLocaleDateString('en-IN')
      : 'Limited Time';

    const clientUrl = process.env.CLIENT_URL || 'https://gkautobook.cloud';
    const bookingUrl = `${clientUrl}/customer/booking`;

    let sentCount = 0;
    for (const cust of targetCustomers) {
      if (!cust.mobile) continue;
      // Send asynchronously without blocking
      messagingService.notify(
        cust.id,
        'COUPON_ISSUED',
        {
          customer_name: cust.name,
          coupon_code: coupon.code,
          discount_text: discountText,
          valid_till: validTill,
          booking_url: bookingUrl
        },
        { type: 'coupon', id: coupon.id }
      ).catch(e => console.warn(`Coupon share error for cust ${cust.id}:`, e.message));
      sentCount++;
    }

    res.json({
      success: true,
      message: `Coupon broadcast dispatched to ${sentCount} customer(s)`,
      dispatched_count: sentCount
    });

  } catch (err) {
    console.error('Share coupon error:', err);
    res.status(500).json({ success: false, error: 'Failed to share coupon' });
  }
};

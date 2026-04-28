const pool = require('../config/db');

// ─── LIST BOOKINGS ──────────────────────────
exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];

    if (req.user.role === 'customer') {
      where += ' AND b.customer_id = ?';
      params.push(req.user.id);
    }
    
    if (req.query.slot_id) {
      where += ' AND b.slot_id = ?';
      params.push(req.query.slot_id);
    }

    if (status && status !== 'all') {
      where += ' AND b.status = ?';
      params.push(status);
    }

    if (search) {
      where += ' AND (u.name LIKE ? OR u.mobile LIKE ? OR b.vehicle_brand LIKE ? OR b.vehicle_model LIKE ? OR b.vehicle_reg_no LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM bookings b JOIN users u ON b.customer_id = u.id WHERE ${where}`, params
    );

    const [rows] = await pool.query(`
      SELECT b.*,
        s.slot_date, s.start_time, s.end_time,
        u.name AS customer_name, u.mobile AS customer_mobile, u.email AS customer_email,
        svc.name AS service_name,
        pkg.name AS package_name,
        jc.id AS job_cart_id,
        jc.status AS job_cart_status
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      JOIN users u ON b.customer_id = u.id
      LEFT JOIN services svc ON b.service_id = svc.id
      LEFT JOIN packages pkg ON b.package_id = pkg.id
      LEFT JOIN job_carts jc ON jc.booking_id = b.id
      WHERE ${where}
      ORDER BY s.slot_date DESC, s.start_time DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRows[0].total },
    });
  } catch (err) {
    console.error('Bookings list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET ONE BOOKING ────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*,
        s.slot_date, s.start_time, s.end_time,
        u.name AS customer_name, u.mobile AS customer_mobile, u.email AS customer_email,
        svc.name AS service_name,
        pkg.name AS package_name,
        jc.id AS job_cart_id,
        jc.status AS job_cart_status
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      JOIN users u ON b.customer_id = u.id
      LEFT JOIN services svc ON b.service_id = svc.id
      LEFT JOIN packages pkg ON b.package_id = pkg.id
      LEFT JOIN job_carts jc ON jc.booking_id = b.id
      WHERE b.id = ?
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (req.user.role === 'customer' && rows[0].customer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Booking getOne error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── VEHICLE HISTORY ────────────────────────
exports.vehicleHistory = async (req, res) => {
  try {
    const { regNo } = req.params;
    const cleanReg = (regNo || '').toUpperCase().replace(/\s/g, '');

    // Find vehicle
    const [vehicles] = await pool.query(
      `SELECT v.*, u.name AS customer_name, u.mobile AS customer_mobile
       FROM vehicles v JOIN users u ON v.customer_id = u.id
       WHERE v.registration_no = ?`,
      [cleanReg]
    );

    if (!vehicles.length) {
      return res.json({ success: true, data: { found: false, history: [] } });
    }

    const vehicle = vehicles[0];

    // Fetch all job carts for this vehicle
    const [jobCarts] = await pool.query(`
      SELECT jc.id, jc.visit_date, jc.visit_number, jc.status, jc.notes, jc.invoice_number,
             jc.created_at, jc.completed_at,
             (SELECT GROUP_CONCAT(js.service_name SEPARATOR ', ')
              FROM job_services js WHERE js.job_cart_id = jc.id) AS services_done,
             (SELECT COALESCE(SUM(js.service_price + js.labor_charges), 0)
              + COALESCE((SELECT SUM(jp.quantity * jp.unit_cost) FROM job_products jp JOIN job_services js2 ON jp.job_service_id = js2.id WHERE js2.job_cart_id = jc.id), 0)
              FROM job_services js WHERE js.job_cart_id = jc.id) AS total_amount
      FROM job_carts jc
      WHERE jc.vehicle_id = ?
      ORDER BY jc.visit_date DESC
    `, [vehicle.id]);

    res.json({
      success: true,
      data: {
        found: true,
        vehicle: {
          id: vehicle.id,
          registration_no: vehicle.registration_no,
          brand: vehicle.brand,
          model: vehicle.model,
        },
        customer: {
          name: vehicle.customer_name,
          mobile: vehicle.customer_mobile,
        },
        history: jobCarts,
      },
    });
  } catch (err) {
    console.error('Vehicle history error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CREATE BOOKING (ATOMIC) ────────────────
// UPDATED: Integrates package usage deduction (Task 5 + Task 6)
exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      slot_id, service_id, package_id,
      vehicle_brand, vehicle_model, vehicle_reg_no, vehicle_category,
      is_free_wash = false, use_package = false, notes
    } = req.body;

    const customerId = req.user.role === 'admin' ? (req.body.customer_id || req.user.id) : req.user.id;

    if (!slot_id) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Slot is required' });
    }

    // 1. Lock slot row
    const [slots] = await conn.query(
      'SELECT booked_count, max_capacity, is_blocked FROM slots WHERE id = ? FOR UPDATE',
      [slot_id]
    );
    if (!slots.length) { await conn.rollback(); return res.status(404).json({ success: false, error: 'Slot not found' }); }

    const slot = slots[0];
    if (slot.is_blocked) { await conn.rollback(); return res.status(409).json({ success: false, error: 'Slot is blocked' }); }
    if (slot.booked_count >= slot.max_capacity) { await conn.rollback(); return res.status(409).json({ success: false, error: 'Slot is fully booked' }); }

    // 2. Free wash validation
    if (is_free_wash) {
      const [loyalty] = await conn.query('SELECT free_washes FROM loyalty WHERE customer_id = ?', [customerId]);
      if (!loyalty.length || loyalty[0].free_washes <= 0) {
        await conn.rollback();
        return res.status(422).json({ success: false, error: 'No free washes available' });
      }
      await conn.query(
        'UPDATE loyalty SET free_washes = GREATEST(0, free_washes - 1) WHERE customer_id = ?',
        [customerId]
      );
    }

    // ─── TASK 5: Package Usage Deduction ─────────────────────
    // Check if user wants to use package credits for this booking
    let packageUsed = false;
    let packageInfo = null;

    if (use_package && service_id && !is_free_wash) {
      // Look up the service name from service_id
      const [svcRows] = await conn.query('SELECT name FROM services WHERE id = ?', [service_id]);
      if (svcRows.length) {
        const serviceName = svcRows[0].name;

        // Use the package controller's check-and-use logic
        const userPkgCtrl = require('./userPackagesController');
        const result = await userPkgCtrl.checkAndUseService(conn, customerId, serviceName);

        if (result.can_use) {
          packageUsed = true;
          packageInfo = {
            package_name: result.package_name,
            service_name: serviceName,
            remaining: result.remaining,
          };
        }
        // If can't use package, fall through to normal booking
      }
    }

    // 3. Increment booked_count
    await conn.query('UPDATE slots SET booked_count = booked_count + 1 WHERE id = ?', [slot_id]);

    // 4. Insert booking
    const [result] = await conn.query(
      `INSERT INTO bookings (customer_id, slot_id, service_id, package_id, vehicle_brand, vehicle_model, vehicle_reg_no, vehicle_category, status, is_free_wash, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
      [customerId, slot_id, service_id || null, package_id || null, vehicle_brand || null, vehicle_model || null, vehicle_reg_no || null, vehicle_category || null, is_free_wash ? 1 : 0, notes || null]
    );

    await conn.commit();

    const bookingId = result.insertId;

    // ── Fire-and-forget SMS: Booking confirmation (TASK 7) ──
    try {
      const sendSms = require('../utils/sendSms');
      const [custRows] = await pool.query('SELECT name, mobile FROM users WHERE id = ?', [customerId]);
      const [slotRows] = await pool.query('SELECT slot_date, start_time FROM slots WHERE id = ?', [slot_id]);
      if (custRows.length && custRows[0].mobile && slotRows.length) {
        const date = new Date(slotRows[0].slot_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const time = slotRows[0].start_time ? slotRows[0].start_time.substring(0, 5) : '';
        const msg = `GK AutoHerb: Hi ${custRows[0].name}, your booking #${bookingId} is confirmed for ${date} at ${time}. Thank you!`;
        sendSms(custRows[0].mobile, msg).catch(err => {
          console.error('[SMS] Booking confirmation failed (non-blocking):', err.message);
        });
      }
    } catch (smsErr) {
      console.error('[SMS] Booking SMS setup failed (non-blocking):', smsErr.message);
    }

    res.status(201).json({
      success: true,
      data: {
        id: bookingId,
        package_used: packageUsed,
        ...(packageInfo && { package_info: packageInfo }),
      },
      message: packageUsed
        ? `Booking confirmed — used ${packageInfo.package_name} package credit (${packageInfo.remaining} remaining)`
        : 'Booking confirmed',
    });
  } catch (err) {
    await conn.rollback();
    console.error('Booking create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── CANCEL BOOKING ─────────────────────────
exports.cancel = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    const [bookings] = await conn.query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!bookings.length) { await conn.rollback(); return res.status(404).json({ success: false, error: 'Booking not found' }); }

    const booking = bookings[0];
    if (booking.status !== 'confirmed') { await conn.rollback(); return res.status(422).json({ success: false, error: 'Only confirmed bookings can be cancelled' }); }

    // Customer can only cancel own
    if (req.user.role === 'customer' && booking.customer_id !== req.user.id) {
      await conn.rollback();
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // 1. Cancel booking
    await conn.query("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);

    // 2. Restore slot count
    await conn.query('UPDATE slots SET booked_count = GREATEST(0, booked_count - 1) WHERE id = ?', [booking.slot_id]);

    // 3. Restore free wash if applicable
    if (booking.is_free_wash) {
      await conn.query(
        'UPDATE loyalty SET free_washes = free_washes + 1 WHERE customer_id = ?',
        [booking.customer_id]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (err) {
    await conn.rollback();
    console.error('Cancel booking error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

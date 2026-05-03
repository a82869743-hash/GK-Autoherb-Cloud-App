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
        jc.status AS job_cart_status,
        v.brand AS linked_vehicle_brand, v.model AS linked_vehicle_model,
        v.registration_no AS linked_vehicle_reg_no,
        approver.name AS approved_by_name
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      JOIN users u ON b.customer_id = u.id
      LEFT JOIN services svc ON b.service_id = svc.id
      LEFT JOIN packages pkg ON b.package_id = pkg.id
      LEFT JOIN job_carts jc ON jc.booking_id = b.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users approver ON b.approved_by = approver.id
      WHERE ${where}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Enrich with vehicle data — prefer linked vehicle, fall back to text fields
    const enriched = rows.map(r => ({
      ...r,
      vehicle_brand: r.linked_vehicle_brand || r.vehicle_brand,
      vehicle_model: r.linked_vehicle_model || r.vehicle_model,
      vehicle_reg_no: r.linked_vehicle_reg_no || r.vehicle_reg_no,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRows[0].total },
    });
  } catch (err) {
    console.error('Bookings list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── LIST PENDING BOOKINGS (Admin) ──────────
exports.listPending = async (req, res) => {
  req.query.status = 'pending_approval';
  return exports.list(req, res);
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
        jc.status AS job_cart_status,
        v.brand AS linked_vehicle_brand, v.model AS linked_vehicle_model,
        v.registration_no AS linked_vehicle_reg_no,
        approver.name AS approved_by_name
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      JOIN users u ON b.customer_id = u.id
      LEFT JOIN services svc ON b.service_id = svc.id
      LEFT JOIN packages pkg ON b.package_id = pkg.id
      LEFT JOIN job_carts jc ON jc.booking_id = b.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users approver ON b.approved_by = approver.id
      WHERE b.id = ?
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (req.user.role === 'customer' && rows[0].customer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const row = rows[0];
    row.vehicle_brand = row.linked_vehicle_brand || row.vehicle_brand;
    row.vehicle_model = row.linked_vehicle_model || row.vehicle_model;
    row.vehicle_reg_no = row.linked_vehicle_reg_no || row.vehicle_reg_no;

    // Fetch linked services for multi-service bookings
    const [linkedServices] = await pool.query(`
      SELECT bs.service_id, s.name, s.duration_minutes
      FROM booking_services bs
      JOIN services s ON bs.service_id = s.id
      WHERE bs.booking_id = ?
    `, [req.params.id]);
    row.linked_services = linkedServices;

    res.json({ success: true, data: row });
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

// ─── CREATE BOOKING (ATOMIC — with approval workflow) ────
// UPDATED: status = pending_approval, expires in 5 min, vehicle linking, multi-service
exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      slot_id, service_id, service_ids, package_id,
      vehicle_id, vehicle_brand, vehicle_model, vehicle_reg_no, vehicle_category,
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

    // 2. Resolve vehicle data — prefer vehicle_id lookup, fallback to text fields
    let resolvedBrand = vehicle_brand || null;
    let resolvedModel = vehicle_model || null;
    let resolvedRegNo = vehicle_reg_no || null;
    let resolvedVehicleId = vehicle_id || null;

    if (vehicle_id) {
      const [vRows] = await conn.query(
        'SELECT id, brand, model, registration_no FROM vehicles WHERE id = ?', [vehicle_id]
      );
      if (vRows.length) {
        resolvedBrand = vRows[0].brand;
        resolvedModel = vRows[0].model;
        resolvedRegNo = vRows[0].registration_no;
        resolvedVehicleId = vRows[0].id;
      }
    }

    // 3. Calculate total duration for multi-service bookings
    let totalDuration = null;
    const allServiceIds = service_ids && service_ids.length > 0 ? service_ids : (service_id ? [service_id] : []);
    
    if (allServiceIds.length > 0) {
      const [durations] = await conn.query(
        `SELECT SUM(duration_minutes) AS total FROM services WHERE id IN (?)`,
        [allServiceIds]
      );
      totalDuration = durations[0]?.total || null;
    }

    // 4. Free wash validation
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

    // 5. Package Usage Deduction
    let packageUsed = false;
    let packageInfo = null;
    const primaryServiceId = service_id || (allServiceIds.length > 0 ? allServiceIds[0] : null);

    if (use_package && primaryServiceId && !is_free_wash) {
      const [svcRows] = await conn.query('SELECT name FROM services WHERE id = ?', [primaryServiceId]);
      if (svcRows.length) {
        const serviceName = svcRows[0].name;
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
      }
    }

    // 6. Increment booked_count
    await conn.query('UPDATE slots SET booked_count = booked_count + 1 WHERE id = ?', [slot_id]);

    // 7. Insert booking — status = pending_approval, expires in 5 minutes
    const [result] = await conn.query(
      `INSERT INTO bookings 
       (customer_id, vehicle_id, slot_id, service_id, package_id, 
        vehicle_brand, vehicle_model, vehicle_reg_no, vehicle_category, total_duration,
        status, is_free_wash, notes, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      [
        customerId, resolvedVehicleId, slot_id,
        primaryServiceId || null, package_id || null,
        resolvedBrand, resolvedModel, resolvedRegNo, vehicle_category || null, totalDuration,
        is_free_wash ? 1 : 0, notes || null
      ]
    );

    const bookingId = result.insertId;

    // 8. Insert booking_services for multi-service
    if (allServiceIds.length > 0) {
      for (const sid of allServiceIds) {
        await conn.query(
          'INSERT INTO booking_services (booking_id, service_id) VALUES (?, ?)',
          [bookingId, sid]
        );
      }
    }

    await conn.commit();

    // 9. Fire-and-forget SMS (non-blocking)
    try {
      const sendSms = require('../utils/sendSms');
      const [custRows] = await pool.query('SELECT name, mobile FROM users WHERE id = ?', [customerId]);
      const [slotRows] = await pool.query('SELECT slot_date, start_time FROM slots WHERE id = ?', [slot_id]);
      if (custRows.length && custRows[0].mobile && slotRows.length) {
        const date = new Date(slotRows[0].slot_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const time = slotRows[0].start_time ? slotRows[0].start_time.substring(0, 5) : '';
        const msg = `GK AutoHerb: Hi ${custRows[0].name}, your booking #${bookingId} is pending approval for ${date} at ${time}. We'll confirm shortly!`;
        sendSms(custRows[0].mobile, msg).catch(err => {
          console.error('[SMS] Booking notification failed (non-blocking):', err.message);
        });
      }
    } catch (smsErr) {
      console.error('[SMS] Booking SMS setup failed (non-blocking):', smsErr.message);
    }

    console.log(`[BOOKING] #${bookingId} created — pending_approval, customer=${customerId}, slot=${slot_id}`);

    const io = req.app.get('io');
    if (io) {
      io.emit('new_booking', { bookingId, status: 'pending_approval' });
    }

    res.status(201).json({
      success: true,
      data: {
        id: bookingId,
        status: 'pending_approval',
        package_used: packageUsed,
        ...(packageInfo && { package_info: packageInfo }),
      },
      message: packageUsed
        ? `Booking submitted — used ${packageInfo.package_name} credit (${packageInfo.remaining} left). Awaiting admin approval.`
        : 'Booking submitted — awaiting admin approval',
    });
  } catch (err) {
    await conn.rollback();
    console.error('Booking create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── APPROVE BOOKING (Admin) ────────────────
exports.approve = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { booking_notes } = req.body;

    const [bookings] = await conn.query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!bookings.length) { await conn.rollback(); return res.status(404).json({ success: false, error: 'Booking not found' }); }

    const booking = bookings[0];
    if (booking.status !== 'pending_approval') {
      await conn.rollback();
      return res.status(422).json({ success: false, error: `Cannot approve a ${booking.status} booking` });
    }

    await conn.query(
      `UPDATE bookings SET status = 'confirmed', booking_notes = ?, approved_by = ?, approved_at = NOW(), expires_at = NULL WHERE id = ?`,
      [booking_notes || null, req.user.id, id]
    );

    await conn.commit();

    // Fire-and-forget confirmation SMS
    try {
      const sendSms = require('../utils/sendSms');
      const [custRows] = await pool.query('SELECT name, mobile FROM users WHERE id = ?', [booking.customer_id]);
      const [slotRows] = await pool.query('SELECT slot_date, start_time FROM slots WHERE id = ?', [booking.slot_id]);
      if (custRows.length && custRows[0].mobile && slotRows.length) {
        const date = new Date(slotRows[0].slot_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const time = slotRows[0].start_time ? slotRows[0].start_time.substring(0, 5) : '';
        const msg = `GK AutoHerb: Hi ${custRows[0].name}, your booking #${id} for ${date} at ${time} is CONFIRMED! See you soon.`;
        sendSms(custRows[0].mobile, msg).catch(() => {});
      }
    } catch { /* non-blocking */ }

    console.log(`[BOOKING] #${id} approved by admin ${req.user.id}`);
    res.json({ success: true, message: 'Booking approved' });
  } catch (err) {
    await conn.rollback();
    console.error('Booking approve error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── REJECT BOOKING (Admin) ────────────────
exports.reject = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { booking_notes } = req.body;

    const [bookings] = await conn.query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!bookings.length) { await conn.rollback(); return res.status(404).json({ success: false, error: 'Booking not found' }); }

    const booking = bookings[0];
    if (booking.status !== 'pending_approval' && booking.status !== 'confirmed') {
      await conn.rollback();
      return res.status(422).json({ success: false, error: `Cannot reject a ${booking.status} booking` });
    }

    // Reject booking
    await conn.query(
      `UPDATE bookings SET status = 'rejected', booking_notes = ?, approved_by = ?, approved_at = NOW(), expires_at = NULL WHERE id = ?`,
      [booking_notes || 'Rejected by admin', req.user.id, id]
    );

    // Restore slot count
    await conn.query('UPDATE slots SET booked_count = GREATEST(0, booked_count - 1) WHERE id = ?', [booking.slot_id]);

    // Restore free wash if applicable
    if (booking.is_free_wash) {
      await conn.query(
        'UPDATE loyalty SET free_washes = free_washes + 1 WHERE customer_id = ?',
        [booking.customer_id]
      );
    }

    await conn.commit();
    console.log(`[BOOKING] #${id} rejected by admin ${req.user.id}`);
    res.json({ success: true, message: 'Booking rejected' });
  } catch (err) {
    await conn.rollback();
    console.error('Booking reject error:', err);
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
    if (!['confirmed', 'pending_approval'].includes(booking.status)) {
      await conn.rollback();
      return res.status(422).json({ success: false, error: 'Only confirmed or pending bookings can be cancelled' });
    }

    // Customer can only cancel own
    if (req.user.role === 'customer' && booking.customer_id !== req.user.id) {
      await conn.rollback();
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // 1. Cancel booking
    await conn.query("UPDATE bookings SET status = 'cancelled', expires_at = NULL WHERE id = ?", [id]);

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

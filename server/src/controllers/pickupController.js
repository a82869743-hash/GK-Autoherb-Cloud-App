const pool = require('../config/db');
const messagingService = require('../services/messagingService');

// ─── CREATE PICKUP REQUEST ────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { booking_id, address, scheduled_time, notes } = req.body;

    if (!booking_id || !address) {
      return res.status(400).json({ success: false, error: 'Booking ID and address are required' });
    }

    // Verify booking and get customer_id
    const [bookings] = await pool.query('SELECT customer_id FROM bookings WHERE id = ?', [booking_id]);
    if (!bookings.length) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    const customerId = bookings[0].customer_id;

    // Check permissions: only customer who owns the booking or admin can create pickup
    if (req.user.role === 'customer' && customerId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to request pickup for this booking' });
    }

    // Get pickup charge from settings
    const [settings] = await pool.query("SELECT value FROM settings WHERE key_name = 'pickup_charge_amount'");
    const pickupCharges = settings.length ? parseFloat(settings[0].value) || 0 : 0;

    const [result] = await pool.query(
      `INSERT INTO v2_pickup_requests (booking_id, customer_id, address, scheduled_time, notes, pickup_charges, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [booking_id, customerId, address, scheduled_time || null, notes || null, pickupCharges]
    );

    res.status(201).json({
      success: true,
      message: 'Pickup request created successfully',
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error('Create pickup request error:', err);
    res.status(500).json({ success: false, error: 'Failed to create pickup request' });
  }
};

// ─── LIST PICKUP REQUESTS ──────────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    let query = `
      SELECT pr.*, 
             u.name AS customer_name, u.mobile AS customer_mobile,
             s.name AS staff_name, s.mobile AS staff_mobile,
             b.status AS booking_status
      FROM v2_pickup_requests pr
      JOIN users u ON pr.customer_id = u.id
      JOIN bookings b ON pr.booking_id = b.id
      LEFT JOIN users s ON pr.assigned_staff_id = s.id
    `;
    const params = [];

    if (req.user.role === 'customer') {
      query += ' WHERE pr.customer_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'staff') {
      query += ' WHERE pr.assigned_staff_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY pr.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List pickup requests error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch pickup requests' });
  }
};

// ─── ASSIGN STAFF TO PICKUP ───────────────────────────────────────────────
exports.assign = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_staff_id } = req.body;

    if (!assigned_staff_id) {
      return res.status(400).json({ success: false, error: 'Staff ID is required' });
    }

    // Verify pickup request exists
    const [pickups] = await pool.query('SELECT * FROM v2_pickup_requests WHERE id = ?', [id]);
    if (!pickups.length) {
      return res.status(404).json({ success: false, error: 'Pickup request not found' });
    }
    const pickup = pickups[0];

    // Verify staff exists and is indeed staff
    const [staffUsers] = await pool.query("SELECT id, name, mobile FROM users WHERE id = ? AND role = 'staff'", [assigned_staff_id]);
    if (!staffUsers.length) {
      return res.status(400).json({ success: false, error: 'Invalid staff ID' });
    }
    const staff = staffUsers[0];

    // Update pickup status
    await pool.query(
      "UPDATE v2_pickup_requests SET assigned_staff_id = ?, status = 'assigned' WHERE id = ?",
      [assigned_staff_id, id]
    );

    // Get customer info for notification
    const [custUsers] = await pool.query('SELECT name, mobile FROM users WHERE id = ?', [pickup.customer_id]);
    if (custUsers.length && staff.mobile) {
      const customer = custUsers[0];
      const timeStr = pickup.scheduled_time 
        ? new Date(pickup.scheduled_time).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
        : 'scheduled time';
      
      const driverMsg = `GK AutoHerb: Hi ${staff.name}, you have been assigned to pick up vehicle for booking #${pickup.booking_id} from ${customer.name}. Address: ${pickup.address}. Scheduled Time: ${timeStr}.`;
      messagingService.sendWhatsApp(staff.mobile, null, { body: driverMsg }).catch(() => {});
    }

    res.json({ success: true, message: 'Driver assigned successfully' });
  } catch (err) {
    console.error('Assign pickup staff error:', err);
    res.status(500).json({ success: false, error: 'Failed to assign staff' });
  }
};

// ─── MARK VEHICLE AS PICKED UP ────────────────────────────────────────────
exports.markPickedUp = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify pickup request exists
    const [pickups] = await pool.query('SELECT * FROM v2_pickup_requests WHERE id = ?', [id]);
    if (!pickups.length) {
      return res.status(404).json({ success: false, error: 'Pickup request not found' });
    }
    const pickup = pickups[0];

    // Authorize: Only admin or assigned staff
    if (req.user.role === 'staff' && pickup.assigned_staff_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized. You are not assigned to this pickup' });
    }

    // Update status to picked_up
    await pool.query("UPDATE v2_pickup_requests SET status = 'picked_up' WHERE id = ?", [id]);

    // Send WhatsApp notification to customer
    const [custUsers] = await pool.query('SELECT name, mobile FROM users WHERE id = ?', [pickup.customer_id]);
    if (custUsers.length && custUsers[0].mobile) {
      const customer = custUsers[0];
      
      // Get driver info
      let driverName = 'our executive';
      if (pickup.assigned_staff_id) {
        const [driverRows] = await pool.query('SELECT name FROM users WHERE id = ?', [pickup.assigned_staff_id]);
        if (driverRows.length) driverName = driverRows[0].name;
      }

      const custMsg = `🚙 *Vehicle Picked Up*\n\nHi ${customer.name},\nYour vehicle has been successfully picked up by ${driverName} for Booking #${pickup.booking_id} and is on the way to the studio.\n\nThank you, GK AutoHerb!`;
      messagingService.sendWhatsApp(customer.mobile, null, { body: custMsg }).catch(() => {});
    }

    res.json({ success: true, message: 'Pickup status updated to picked_up' });
  } catch (err) {
    console.error('Mark picked up error:', err);
    res.status(500).json({ success: false, error: 'Failed to update pickup status' });
  }
};

// ─── GET SINGLE PICKUP BY ID OR BOOKING ID ─────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const { id } = req.params; // Can be pickup id or booking id (using query param or standard identifier)
    
    // We search by pickup ID or booking ID depending on routing
    const [pickups] = await pool.query(
      `SELECT pr.*, 
              u.name AS customer_name, u.mobile AS customer_mobile,
              s.name AS staff_name, s.mobile AS staff_mobile,
              b.status AS booking_status
       FROM v2_pickup_requests pr
       JOIN users u ON pr.customer_id = u.id
       JOIN bookings b ON pr.booking_id = b.id
       LEFT JOIN users s ON pr.assigned_staff_id = s.id
       WHERE pr.id = ? OR pr.booking_id = ?`,
      [id, id]
    );

    if (!pickups.length) {
      return res.status(404).json({ success: false, error: 'Pickup request not found' });
    }
    const pickup = pickups[0];

    // Check ownership
    if (req.user.role === 'customer' && pickup.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    res.json({ success: true, data: pickup });
  } catch (err) {
    console.error('Get pickup details error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch pickup details' });
  }
};

/**
 * Booking cancel / reschedule / confirm — shared by the customer app, the admin panel,
 * the WhatsApp auto-bot and cron jobs so every path behaves the same way.
 */
const pool = require('../config/db');
const { getSettings } = require('../utils/settingsStore');

const POLICY_DEFAULTS = {
  booking_cancel_cutoff_hours: '2',
  booking_reschedule_cutoff_hours: '2',
  booking_max_reschedules: '3',
};

async function getBookingPolicy(db = pool) {
  const s = await getSettings(Object.keys(POLICY_DEFAULTS), db);
  return {
    cancelCutoffHours: parseFloat(s.booking_cancel_cutoff_hours ?? POLICY_DEFAULTS.booking_cancel_cutoff_hours),
    rescheduleCutoffHours: parseFloat(s.booking_reschedule_cutoff_hours ?? POLICY_DEFAULTS.booking_reschedule_cutoff_hours),
    maxReschedules: parseInt(s.booking_max_reschedules ?? POLICY_DEFAULTS.booking_max_reschedules, 10),
  };
}

function toDateStr(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  // The pool uses timezone '+05:30', so DATE columns arrive as IST-midnight instants.
  // Shift to IST explicitly so a UTC server doesn't roll the date back a day.
  const ist = new Date(d.getTime() + 5.5 * 36e5);
  return ist.toISOString().slice(0, 10);
}

function slotStart(slot) {
  const time = String(slot.start_time || '00:00:00').padEnd(8, ':00').slice(0, 8);
  return new Date(`${toDateStr(slot.slot_date)}T${time}+05:30`);
}

function hoursUntil(slot) {
  return (slotStart(slot).getTime() - Date.now()) / 36e5;
}

function formatSlotDate(slot) {
  return slotStart(slot).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function formatSlotTime(slot) {
  const [h, m] = String(slot.start_time).split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

async function loadBooking(db, bookingId, lock = false) {
  const [rows] = await db.query(
    `SELECT b.*, s.slot_date, s.start_time, s.end_time,
            COALESCE(svc.name, b.package_service_name, 'Car care service') AS service_name
     FROM bookings b
     JOIN slots s ON s.id = b.slot_id
     LEFT JOIN services svc ON svc.id = b.service_id
     WHERE b.id = ? ${lock ? 'FOR UPDATE' : ''}`,
    [bookingId]
  );
  return rows[0] || null;
}

/** What the customer may still do with a booking. */
async function getAllowedActions(booking, role = 'customer', db = pool, cachedPolicy = null) {
  const policy = cachedPolicy || await getBookingPolicy(db);
  const active = ['confirmed', 'pending_approval', 'pending_payment'].includes(booking.status);
  const hrs = hoursUntil(booking);
  const isAdmin = role === 'admin';
  const canCancel = active && (isAdmin || hrs >= policy.cancelCutoffHours);
  const canReschedule = active && booking.status !== 'pending_payment'
    && (isAdmin || (hrs >= policy.rescheduleCutoffHours && (booking.reschedule_count || 0) < policy.maxReschedules));
  let reason = null;
  if (!active) reason = `Booking is ${String(booking.status).replace('_', ' ')}`;
  else if (!canCancel) reason = `Changes close ${policy.cancelCutoffHours}h before the slot — please call the studio`;
  else if (!canReschedule && (booking.reschedule_count || 0) >= policy.maxReschedules) reason = `Already rescheduled ${policy.maxReschedules} times`;
  return { can_cancel: canCancel, can_reschedule: canReschedule, hours_until_slot: Math.round(hrs * 10) / 10, reason, policy };
}

/**
 * Cancel a booking: frees the slot, restores free wash / package credit / reward voucher,
 * and tells the customer. Caller owns the transaction.
 */
async function cancelBooking(conn, bookingId, { by = 'customer', reason = null, actorRole = 'customer', skipPolicy = false } = {}) {
  const booking = await loadBooking(conn, bookingId, true);
  if (!booking) return { ok: false, status: 404, error: 'Booking not found' };

  if (!['confirmed', 'pending_approval', 'pending_payment'].includes(booking.status)) {
    return { ok: false, status: 422, error: `This booking is already ${booking.status.replace('_', ' ')}` };
  }
  if (!skipPolicy) {
    const allowed = await getAllowedActions(booking, actorRole, conn);
    if (!allowed.can_cancel) return { ok: false, status: 422, error: allowed.reason };
  }

  await conn.query(
    `UPDATE bookings SET status = 'cancelled', expires_at = NULL, cancel_reason = ?, cancelled_by = ?, cancelled_at = NOW(),
       customer_confirmation = IF(? = 'whatsapp', 'declined', customer_confirmation)
     WHERE id = ?`,
    [reason, by, by, bookingId]
  );
  await conn.query('UPDATE slots SET booked_count = GREATEST(0, booked_count - 1) WHERE id = ?', [booking.slot_id]);

  if (booking.is_free_wash) {
    await conn.query('UPDATE loyalty SET free_washes = free_washes + 1 WHERE customer_id = ?', [booking.customer_id]);
  }

  if (booking.reward_redemption_id) {
    await conn.query(
      "UPDATE loyalty_redemptions SET status = 'active', used_at = NULL, used_booking_id = NULL WHERE id = ? AND status = 'used'",
      [booking.reward_redemption_id]
    );
  }

  // Package credit was only deducted on approval, so only confirmed bookings get it back
  if (booking.booking_type === 'package' && booking.status === 'confirmed') {
    try {
      const { cancelReservation } = require('../controllers/userPackagesController');
      let serviceName = booking.package_service_name || booking.service_name;
      let userPackageId = booking.user_package_id;
      if (!userPackageId) {
        const [ups] = await conn.query(
          `SELECT id FROM user_packages WHERE user_id = ? AND package_id = ? AND package_status = 'active' ORDER BY start_date DESC LIMIT 1`,
          [booking.customer_id, booking.package_id]
        );
        userPackageId = ups[0]?.id;
      }
      if (userPackageId && serviceName) await cancelReservation(conn, userPackageId, serviceName);
    } catch (err) {
      console.error(`[BOOKING] Package credit restore failed for #${bookingId}:`, err.message);
    }
  }

  const advance = Number(booking.advance_amount) || 0;
  const refundNote = advance > 0 && booking.status === 'confirmed'
    ? `Your advance of Rs.${advance} will be refunded within 5-7 working days.`
    : '';

  return { ok: true, booking, refundNote };
}

/**
 * Move a booking to another slot. Caller owns the transaction.
 */
async function rescheduleBooking(conn, bookingId, newSlotId, { actorRole = 'customer' } = {}) {
  const booking = await loadBooking(conn, bookingId, true);
  if (!booking) return { ok: false, status: 404, error: 'Booking not found' };
  if (Number(newSlotId) === Number(booking.slot_id)) {
    return { ok: false, status: 422, error: 'Pick a different time slot' };
  }

  const allowed = await getAllowedActions(booking, actorRole, conn);
  if (!allowed.can_reschedule) return { ok: false, status: 422, error: allowed.reason || 'This booking can no longer be rescheduled' };

  const [slots] = await conn.query('SELECT * FROM slots WHERE id = ? FOR UPDATE', [newSlotId]);
  const slot = slots[0];
  if (!slot) return { ok: false, status: 404, error: 'Selected slot not found' };
  if (slot.is_blocked) return { ok: false, status: 409, error: 'That slot is blocked' };
  if (slot.booked_count >= slot.max_capacity) return { ok: false, status: 409, error: 'That slot just got full — pick another one' };
  if (hoursUntil(slot) < 1) return { ok: false, status: 422, error: 'Pick a slot at least 1 hour from now' };

  await conn.query('UPDATE slots SET booked_count = GREATEST(0, booked_count - 1) WHERE id = ?', [booking.slot_id]);
  await conn.query('UPDATE slots SET booked_count = booked_count + 1 WHERE id = ?', [newSlotId]);
  await conn.query(
    `UPDATE bookings SET slot_id = ?, rescheduled_from_slot_id = ?, reschedule_count = reschedule_count + 1,
       rescheduled_at = NOW(), reminder_sent_at = NULL, customer_confirmation = NULL
     WHERE id = ?`,
    [newSlotId, booking.slot_id, bookingId]
  );

  return { ok: true, booking, newSlot: slot };
}

async function confirmAttendance(db, bookingId) {
  await db.query(
    "UPDATE bookings SET customer_confirmation = 'confirmed', customer_confirmed_at = NOW() WHERE id = ?",
    [bookingId]
  );
}

module.exports = {
  getBookingPolicy,
  getAllowedActions,
  cancelBooking,
  rescheduleBooking,
  confirmAttendance,
  loadBooking,
  formatSlotDate,
  formatSlotTime,
  hoursUntil,
  toDateStr,
};

/**
 * Scheduled customer automations (registered in cronService):
 *   - Day-before booking reminders asking the customer to reply YES / NO / RESCHEDULE
 *   - Birthday & anniversary wishes with a personal coupon
 *   - Warranty expiry reminders (30 and 7 days before) + marking expired warranties
 */
const pool = require('../config/db');
const messagingService = require('./messagingService');
const bookingActions = require('./bookingActions');

const DEFAULT_REMINDER_WINDOW = { minHours: 12, maxHours: 36 };

function istNow() {
  return new Date(Date.now() + 5.5 * 36e5); // read with getUTC* to get IST wall-clock
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/**
 * Sends a reminder for every active booking whose slot is 12–36 hours away and hasn't been
 * reminded yet. Only runs between 9 AM and 8 PM IST so nobody is pinged at night.
 */
async function runBookingReminders({ force = false } = {}) {
  const hour = istNow().getUTCHours();
  if (!force && (hour < 9 || hour >= 20)) return { sent: 0, skipped: 'quiet hours' };

  const [rows] = await pool.query(
    `SELECT b.id
     FROM bookings b JOIN slots s ON s.id = b.slot_id
     WHERE b.status IN ('confirmed','pending_approval')
       AND b.reminder_sent_at IS NULL
       AND TIMESTAMP(s.slot_date, s.start_time) BETWEEN DATE_ADD(NOW(), INTERVAL ? HOUR) AND DATE_ADD(NOW(), INTERVAL ? HOUR)`,
    [DEFAULT_REMINDER_WINDOW.minHours, DEFAULT_REMINDER_WINDOW.maxHours]
  );

  let sent = 0;
  for (const { id } of rows) {
    const b = await bookingActions.loadBooking(pool, id);
    if (!b) continue;
    // Mark first so a slow provider can't cause a double reminder on the next tick
    await pool.query("UPDATE bookings SET reminder_sent_at = NOW(), customer_confirmation = 'pending' WHERE id = ?", [id]);
    const result = await messagingService.notify(
      b.customer_id,
      'BOOKING_REMINDER',
      {
        booking_id: b.id,
        service_name: b.service_name,
        vehicle_number: b.vehicle_reg_no || `${b.vehicle_brand || ''} ${b.vehicle_model || ''}`.trim() || 'your car',
        booking_date: bookingActions.formatSlotDate(b),
        booking_time: bookingActions.formatSlotTime(b),
      },
      { type: 'booking_reminder', id: b.id }
    );
    if (result.success) sent++;
  }
  if (rows.length) console.log(`[CRON] Booking reminders: ${sent}/${rows.length} sent`);
  return { sent, due: rows.length };
}

/** Picks the campaign for a customer: their personal one first, else the default. */
async function pickCampaign(customerId, occasion) {
  const [rows] = await pool.query(
    `SELECT * FROM greeting_campaigns
     WHERE occasion = ? AND is_active = 1 AND (customer_id = ? OR customer_id IS NULL)
     ORDER BY (customer_id IS NULL), id DESC LIMIT 1`,
    [occasion, customerId]
  );
  return rows[0] || null;
}

/** Creates a single-use personal coupon so the offer in the wish actually works at checkout. */
async function issuePersonalCoupon(campaign, customer, occasion) {
  if (!campaign?.offer_code || (!Number(campaign.discount_percent) && !Number(campaign.discount_amount))) return null;
  const year = istNow().getUTCFullYear();
  const code = `${campaign.offer_code}${customer.id}${String(year).slice(2)}`.toUpperCase();
  const validTo = new Date(Date.now() + (campaign.valid_days || 7) * 864e5);
  const isPercent = Number(campaign.discount_percent) > 0;
  try {
    await pool.query(
      `INSERT IGNORE INTO coupons (code, title, type, value, max_discount, min_order_amount, valid_from, valid_to, total_usage_limit, per_customer_limit, first_time_only, is_active)
       VALUES (?, ?, ?, ?, ?, 0, NOW(), ?, 1, 1, 0, 1)`,
      [
        code,
        `${occasion === 'birthday' ? 'Birthday' : 'Anniversary'} gift — ${customer.name}`,
        isPercent ? 'percentage' : 'fixed',
        isPercent ? Number(campaign.discount_percent) : Number(campaign.discount_amount),
        isPercent ? 1000 : Number(campaign.discount_amount),
        validTo,
      ]
    );
  } catch (err) {
    // Coupons module missing on this database — the wish still goes out
    console.warn('[GREETINGS] Could not create coupon:', err.message);
  }
  const offerText = isPercent ? `${Number(campaign.discount_percent)}% off your next service` : `₹${Number(campaign.discount_amount)} off your next service`;
  return { code, validTo, offerText };
}

/**
 * Sends one birthday / anniversary wish. Used by the daily job and by the admin "send now" button.
 * `customMessage` lets the admin override the campaign text for this one customer.
 */
async function sendGreeting(customer, occasion, { campaign = null, customMessage = null, force = false } = {}) {
  const year = istNow().getUTCFullYear();
  if (!force) {
    const [already] = await pool.query(
      'SELECT id FROM greeting_logs WHERE customer_id = ? AND occasion = ? AND greeting_year = ?',
      [customer.id, occasion, year]
    );
    if (already.length) return { skipped: 'already sent this year' };
  }

  const camp = campaign || await pickCampaign(customer.id, occasion);
  const coupon = await issuePersonalCoupon(camp, customer, occasion);
  const vars = {
    customer_name: customer.name.split(' ')[0],
    offer_text: coupon ? coupon.offerText : '',
    offer_code: coupon ? coupon.code : '',
    valid_till: coupon ? formatDate(coupon.validTo) : '',
    booking_url: `${messagingService.appBaseUrl()}/customer/bookings/new`,
  };

  const fallbackTrigger = occasion === 'birthday' ? 'BIRTHDAY_WISH' : 'ANNIVERSARY_WISH';
  const baseTemplate = await messagingService.getTemplate(fallbackTrigger);
  const template = {
    ...(baseTemplate || { template_name: fallbackTrigger, event_trigger: fallbackTrigger, send_sms: 1 }),
    message_body: customMessage || camp?.message_body || baseTemplate?.message_body || 'Warm wishes from GK AutoHerb, {{customer_name}}!',
    // A custom text can't use the Meta-approved template, so send it as plain text
    provider_template_name: customMessage || camp ? null : baseTemplate?.provider_template_name,
  };

  const result = await messagingService.deliver({
    customerId: customer.id,
    mobile: customer.mobile,
    template,
    variables: vars,
    references: { type: occasion, id: camp?.id || null },
  });

  await pool.query(
    `INSERT INTO greeting_logs (customer_id, occasion, greeting_year, campaign_id, message_body, sent_via)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE message_body = VALUES(message_body), sent_at = NOW(), campaign_id = VALUES(campaign_id)`,
    [customer.id, occasion, year, camp?.id || null, result.message, result.whatsapp]
  );
  return { sent: true, message: result.message, coupon: coupon?.code || null, wa_link: result.wa_link, whatsapp: result.whatsapp };
}

async function runGreetings() {
  const today = istNow();
  const mmdd = `${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
  let sent = 0;
  for (const [occasion, column] of [['birthday', 'date_of_birth'], ['anniversary', 'anniversary_date']]) {
    const [customers] = await pool.query(
      `SELECT id, name, mobile FROM users
       WHERE role = 'customer' AND is_active = 1 AND mobile IS NOT NULL
         AND ${column} IS NOT NULL AND DATE_FORMAT(${column}, '%m-%d') = ?`,
      [mmdd]
    );
    for (const c of customers) {
      try {
        const r = await sendGreeting(c, occasion);
        if (r.sent) sent++;
      } catch (err) {
        console.error(`[GREETINGS] ${occasion} for #${c.id} failed:`, err.message);
      }
    }
  }
  if (sent) console.log(`[CRON] Sent ${sent} birthday/anniversary wishes`);
  return { sent };
}

async function runWarrantyJobs() {
  await pool.query("UPDATE service_warranties SET status = 'expired' WHERE status = 'active' AND end_date < CURDATE()");

  let sent = 0;
  for (const [days, flag] of [[30, 'reminder_30_sent'], [7, 'reminder_7_sent']]) {
    const [rows] = await pool.query(
      `SELECT * FROM service_warranties
       WHERE status = 'active' AND ${flag} = 0 AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
      [days]
    );
    for (const w of rows) {
      await pool.query(`UPDATE service_warranties SET ${flag} = 1 WHERE id = ?`, [w.id]);
      const r = await messagingService.notify(
        w.customer_id,
        'WARRANTY_EXPIRY_REMINDER',
        { service_name: w.service_name, warranty_code: w.warranty_code, end_date: formatDate(w.end_date) },
        { type: 'warranty', id: w.id }
      );
      if (r.success) sent++;
    }
  }
  if (sent) console.log(`[CRON] Sent ${sent} warranty expiry reminders`);
  return { sent };
}

// ─── Morning-of reminder (8 AM IST) ────────────────────────────────
const STUDIO_DEFAULT = { address: 'Gotri - Vasna - Bhayli Main Road, Vadodara, Gujarat 391410', lat: 22.3134, lng: 73.1342 };

async function studioInfo() {
  try {
    const { getSettings } = require('../utils/settingsStore');
    const st = await getSettings(['studio_address', 'studio_lat', 'studio_lng']);
    const lat = parseFloat(st.studio_lat) || STUDIO_DEFAULT.lat;
    const lng = parseFloat(st.studio_lng) || STUDIO_DEFAULT.lng;
    return { address: st.studio_address || STUDIO_DEFAULT.address, maps: `https://maps.google.com/?q=${lat},${lng}` };
  } catch {
    return { address: STUDIO_DEFAULT.address, maps: `https://maps.google.com/?q=${STUDIO_DEFAULT.lat},${STUDIO_DEFAULT.lng}` };
  }
}

/** "Today is your wash at 2 PM" for every active booking on today's date (IST), once per booking. */
async function runMorningReminders() {
  const [rows] = await pool.query(
    `SELECT b.id FROM bookings b JOIN slots s ON s.id = b.slot_id
     WHERE b.status IN ('confirmed','pending_approval')
       AND b.morning_reminder_sent_at IS NULL
       AND s.slot_date = CURDATE()
       AND TIMESTAMP(s.slot_date, s.start_time) > NOW()`
  );
  if (!rows.length) return { sent: 0, due: 0 };
  const studio = await studioInfo();
  let sent = 0;
  for (const { id } of rows) {
    const b = await bookingActions.loadBooking(pool, id);
    if (!b) continue;
    await pool.query('UPDATE bookings SET morning_reminder_sent_at = NOW() WHERE id = ?', [id]);
    const r = await messagingService.notify(
      b.customer_id,
      'BOOKING_MORNING_REMINDER',
      {
        booking_id: b.id,
        service_name: b.service_name || b.package_service_name || 'service',
        vehicle_number: b.vehicle_reg_no || `${b.vehicle_brand || ''} ${b.vehicle_model || ''}`.trim() || 'your car',
        booking_time: bookingActions.formatSlotTime(b),
        studio_address: studio.address,
        maps_url: studio.maps,
      },
      { type: 'booking_morning_reminder', id: b.id }
    );
    if (r.success) sent++;
  }
  console.log(`[CRON] Morning reminders: ${sent}/${rows.length} sent`);
  return { sent, due: rows.length };
}

// ─── Packages: expired today + next wash due (10 AM IST) ──────────
const NEXT_WASH_DAYS = 15; // remind when the last visit (or package start) is this many days old

async function remainingWashes(up) {
  const { getServiceBreakdown } = require('../controllers/userPackagesController');
  const breakdown = await getServiceBreakdown(pool, up.package_id, up.package_name).catch(() => []);
  const [usage] = await pool.query('SELECT service_name, used_count FROM package_usage WHERE user_package_id = ?', [up.id]);
  const used = Object.fromEntries(usage.map((u) => [String(u.service_name).toLowerCase().trim(), Number(u.used_count) || 0]));
  // Package service rows can be duplicated in the data — count each service once
  const totals = new Map();
  for (const s of breakdown || []) {
    const key = String(s.service_name).toLowerCase().trim();
    totals.set(key, { name: s.service_name, total: Math.max(totals.get(key)?.total || 0, Number(s.total_count || 0)) });
  }
  let washes = 0;
  let any = 0;
  for (const [key, s] of totals) {
    const left = Math.max(0, s.total - (used[key] || 0));
    any += left;
    if (/wash/i.test(s.name)) washes += left;
  }
  return { washes, any };
}

async function runPackageJobs() {
  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const base = messagingService.appBaseUrl();
  let expired = 0;
  let nextWash = 0;

  // 1) Expired today, told once
  const [ended] = await pool.query(
    `SELECT up.id, up.user_id, p.name AS package_name
     FROM user_packages up JOIN packages p ON p.id = up.package_id
     WHERE up.expired_notified_at IS NULL
       AND up.package_status IN ('active','expired')
       AND DATE(up.end_date) = CURDATE()`
  );
  for (const up of ended) {
    await pool.query('UPDATE user_packages SET expired_notified_at = NOW() WHERE id = ?', [up.id]);
    const r = await messagingService.notify(up.user_id, 'PACKAGE_EXPIRED', { package_name: up.package_name, renewal_url: `${base}/customer/buy-packages` }, { type: 'package', id: up.id });
    if (r.success) expired++;
  }

  // 2) Next wash due: active package, credits left, nothing booked, last visit ≥ NEXT_WASH_DAYS ago
  const [active] = await pool.query(
    `SELECT up.id, up.user_id, up.package_id, up.end_date, up.start_date, up.next_wash_reminded_at, p.name AS package_name,
            (SELECT MAX(s.slot_date) FROM bookings b JOIN slots s ON s.id = b.slot_id
              WHERE b.customer_id = up.user_id AND b.status IN ('completed','confirmed')) AS last_visit,
            (SELECT COUNT(*) FROM bookings b JOIN slots s ON s.id = b.slot_id
              WHERE b.customer_id = up.user_id AND b.status IN ('confirmed','pending_approval') AND s.slot_date >= CURDATE()) AS upcoming
     FROM user_packages up JOIN packages p ON p.id = up.package_id
     WHERE up.package_status = 'active' AND up.end_date > NOW()`
  );
  const dayMs = 864e5;
  const remindedUsers = new Set();
  for (const up of active) {
    if (Number(up.upcoming) > 0 || remindedUsers.has(up.user_id)) continue;
    const lastTouch = Math.max(up.last_visit ? new Date(up.last_visit).getTime() : 0, new Date(up.start_date).getTime());
    if (Date.now() - lastTouch < NEXT_WASH_DAYS * dayMs) continue;
    if (up.next_wash_reminded_at && Date.now() - new Date(up.next_wash_reminded_at).getTime() < NEXT_WASH_DAYS * dayMs) continue;
    const left = await remainingWashes(up);
    const count = left.washes || left.any;
    if (count <= 0) continue;
    remindedUsers.add(up.user_id); // one reminder per customer even with several packages
    await pool.query('UPDATE user_packages SET next_wash_reminded_at = NOW() WHERE id = ?', [up.id]);
    const unit = left.washes ? (count === 1 ? 'wash' : 'washes') : count === 1 ? 'service' : 'services';
    const r = await messagingService.notify(
      up.user_id,
      'PACKAGE_NEXT_WASH',
      {
        remaining: `${count} ${unit}`,
        package_name: up.package_name,
        valid_till: fmt(up.end_date),
        booking_url: `${base}/customer/bookings/new?from_package=1`,
      },
      { type: 'package_next_wash', id: up.id }
    );
    if (r.success) nextWash++;
  }
  if (expired || nextWash) console.log(`[CRON] Packages: ${expired} expired notices, ${nextWash} next-wash reminders`);
  return { expired, nextWash };
}

// ─── Festival / offer campaigns (checked every 5 min) ─────────────
const FESTIVAL_AUDIENCE = {
  all: `SELECT id FROM users WHERE role = 'customer' AND is_active = 1 AND mobile IS NOT NULL`,
  package: `SELECT DISTINCT u.id FROM users u JOIN user_packages up ON up.user_id = u.id
            WHERE u.role = 'customer' AND u.is_active = 1 AND up.package_status = 'active' AND up.end_date > NOW()`,
  inactive: `SELECT u.id FROM users u WHERE u.role = 'customer' AND u.is_active = 1 AND u.mobile IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM bookings b JOIN slots s ON s.id = b.slot_id
                             WHERE b.customer_id = u.id AND s.slot_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY))`,
  recent: `SELECT DISTINCT u.id FROM users u JOIN bookings b ON b.customer_id = u.id JOIN slots s ON s.id = b.slot_id
           WHERE u.role = 'customer' AND u.is_active = 1 AND s.slot_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)`,
};

async function countFestivalAudience(audience) {
  const [rows] = await pool.query(FESTIVAL_AUDIENCE[audience] || FESTIVAL_AUDIENCE.all);
  return rows.length;
}

async function sendFestivalCampaign(campaign) {
  const [users] = await pool.query(FESTIVAL_AUDIENCE[campaign.audience] || FESTIVAL_AUDIENCE.all);
  await pool.query("UPDATE festival_campaigns SET status = 'sending', recipients = ? WHERE id = ?", [users.length, campaign.id]);
  const base = messagingService.appBaseUrl();
  let sent = 0;
  for (const u of users) {
    const r = await messagingService.notify(
      u.id,
      'FESTIVAL_OFFER',
      {
        offer_message: campaign.message,
        coupon_line: campaign.coupon_code ? `🎁 Use code *${campaign.coupon_code}* at checkout.\n` : '',
        booking_url: `${base}/customer/services`,
      },
      { type: 'festival_campaign', id: campaign.id }
    );
    if (r.success && !r.opted_out) sent++;
  }
  await pool.query("UPDATE festival_campaigns SET status = 'sent', sent_count = ?, sent_at = NOW() WHERE id = ?", [sent, campaign.id]);
  console.log(`[CRON] Festival campaign #${campaign.id}: ${sent}/${users.length} sent`);
  return { sent, recipients: users.length };
}

async function runFestivalCampaigns() {
  const [due] = await pool.query("SELECT * FROM festival_campaigns WHERE status = 'scheduled' AND scheduled_at <= NOW() ORDER BY scheduled_at LIMIT 5");
  for (const c of due) {
    // Claim first so two ticks never send the same campaign twice
    const [claim] = await pool.query("UPDATE festival_campaigns SET status = 'sending' WHERE id = ? AND status = 'scheduled'", [c.id]);
    if (!claim.affectedRows) continue;
    await sendFestivalCampaign(c).catch(async (e) => {
      console.error('[CRON] festival campaign failed:', e.message);
      await pool.query("UPDATE festival_campaigns SET status = 'scheduled' WHERE id = ?", [c.id]);
    });
  }
}

module.exports = {
  runBookingReminders, runGreetings, runWarrantyJobs, sendGreeting, pickCampaign,
  runMorningReminders, runPackageJobs, runFestivalCampaigns, sendFestivalCampaign, countFestivalAudience,
  _remainingWashes: remainingWashes,
};


// In-app inbox + free web push (migration 092). Every message the studio sends a customer by
// WhatsApp/SMS also lands in their app inbox and pops up on phones where they allowed notifications.
const pool = require('../config/db');

let webpush = null;
function push() {
  if (webpush !== null) return webpush;
  try {
    const wp = require('web-push');
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      wp.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:gkautoherb@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
      webpush = wp;
    } else {
      webpush = false;
    }
  } catch {
    webpush = false;
  }
  return webpush;
}

// Chat replies are conversations, not notifications
const SKIP_EVENTS = new Set(['auto_bot_reply', 'staff_reply', 'manual']);

const TITLES = [
  [/BOOKING_(RECEIVED|CONFIRMED|APPROVED)/, 'Booking confirmed ✅'],
  [/BOOKING_(MORNING_)?REMINDER/, 'Booking reminder ⏰'],
  [/BOOKING_RESCHEDULED/, 'Booking rescheduled'],
  [/BOOKING_CANCEL/, 'Booking cancelled'],
  [/SERVICE_STARTED/, 'Work started on your car 🔧'],
  [/SERVICE_COMPLETED/, 'Your car is ready ✨'],
  [/PACKAGE_EMI_PAID/, 'Installment received'],
  [/PACKAGE_EMI_OVERDUE/, 'Installment overdue'],
  [/PACKAGE_EMI_DUE/, 'Installment due soon'],
  [/PACKAGE_EMI_STARTED/, 'Package active on EMI ✅'],
  [/PACKAGE_EXPIR/, 'Package expiry'],
  [/PACKAGE_NEXT_WASH/, 'Time for your next wash 🚿'],
  [/PACKAGE_/, 'Package update'],
  [/FESTIVAL_OFFER|COUPON|PROMO/, 'Offer for you 🎉'],
  [/BIRTHDAY/, 'Happy birthday 🎂'],
  [/ANNIVERSARY/, 'Happy anniversary 🎉'],
  [/PAYMENT|ADVANCE|INVOICE/i, 'Payment update'],
  [/PICKUP|DELIVERY|DRIVER/i, 'Pickup & delivery'],
  [/WARRANTY/, 'Warranty reminder'],
  [/SERVICE_REMINDER|DUE/, 'Service reminder'],
  [/FEEDBACK|REVIEW/i, 'How did we do?'],
  [/DIGEST|ADMIN/i, 'Studio update'],
];

function titleFor(event, body) {
  const key = String(event || '');
  for (const [re, t] of TITLES) if (re.test(key)) return t;
  const text = String(body || '');
  if (/received your (advance )?payment|payment of ₹/i.test(text)) return 'Payment received ✅';
  if (/pickup|driver|on the way/i.test(text)) return 'Pickup & delivery';
  const first = text.split('\n')[0].replace(/[*_~]/g, '').trim();
  return first.length > 3 && first.length <= 60 ? first : 'Message from GK AutoHerb';
}

function urlFor(event, role, refType, refId, body) {
  const key = String(event || '');
  const base = role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : '/customer';
  if (role === 'admin') {
    if (/BOOKING/.test(key)) return '/admin/customer-bookings';
    if (/PACKAGE_EMI/.test(key)) return '/admin/package-emi';
    if (/PACKAGE/.test(key)) return '/admin/package-approvals';
    return base;
  }
  if (role === 'staff') return base;
  if (/PACKAGE_EMI/.test(key)) return '/customer/packages/emi';
  if (/PACKAGE/.test(key)) return '/customer/buy-packages';
  // A live job / delivery tracking link in the message opens straight in the app
  const track = String(body || '').match(/https?:\/\/[^/\s]+(\/(?:job|customer\/delivery)\/[^\s]+)/);
  if (track) return track[1];
  if (/SERVICE_(STARTED|COMPLETED)/.test(key)) return '/customer/job-carts';
  if (/BOOKING/.test(key)) return '/customer/bookings';
  if (/FESTIVAL|COUPON|PROMO|NEXT_WASH/.test(key)) return '/customer/services';
  if (/PICKUP|DELIVERY/i.test(key) && refType === 'delivery' && refId) return `/customer/delivery/${refId}`;
  return base;
}

/** Plain text for the inbox: no WhatsApp *bold* markers, tidy spacing. */
function clean(body) {
  return String(body || '').replace(/[*_~]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 2000);
}

async function findUser({ userId, mobile }) {
  if (userId) {
    const [u] = await pool.query('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (u.length) return u[0];
  }
  const ten = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (ten.length !== 10) return null;
  const [u] = await pool.query('SELECT id, role FROM users WHERE mobile = ? AND is_active = 1 ORDER BY id LIMIT 1', [ten]);
  return u[0] || null;
}

/** Send a push to every phone this user enabled; drops subscriptions the browser has revoked. */
async function pushToUser(userId, payload) {
  const wp = push();
  if (!wp) return 0;
  const [subs] = await pool.query('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?', [userId]);
  let sent = 0;
  for (const s of subs) {
    try {
      await wp.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
      sent++;
      await pool.query('UPDATE push_subscriptions SET last_used_at = NOW(), fail_count = 0 WHERE id = ?', [s.id]).catch(() => {});
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE id = ?', [s.id]).catch(() => {});
      } else {
        await pool.query('UPDATE push_subscriptions SET fail_count = fail_count + 1 WHERE id = ?', [s.id]).catch(() => {});
      }
    }
  }
  return sent;
}

/**
 * Save a notification to the user's inbox and push it to their phones.
 * Never throws — messaging must not fail because of the inbox.
 */
async function notifyUser({ userId = null, mobile = null, event = null, title = null, body, url = null, refType = null, refId = null }) {
  try {
    if (!body || SKIP_EVENTS.has(String(event || ''))) return null;
    const user = await findUser({ userId, mobile });
    if (!user) return null;
    const text = clean(body);
    const t = (title || titleFor(event, text)).slice(0, 120);
    const link = url || urlFor(event, user.role, refType, refId, body);
    const [ins] = await pool.query(
      'INSERT INTO app_notifications (user_id, title, body, url, event, ref_type, ref_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, t, text, link, event ? String(event).slice(0, 60) : null, refType, refId || null]
    );
    const io = global.__gkIo;
    if (io) io.emit('app_notification', { user_id: user.id });
    const preview = text.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 170);
    const sent = await pushToUser(user.id, { title: t, body: preview, url: link, tag: `${event || 'gk'}-${refId || ins.insertId}`, id: ins.insertId });
    if (sent) await pool.query('UPDATE app_notifications SET pushed = 1 WHERE id = ?', [ins.insertId]).catch(() => {});
    return { id: ins.insertId, pushed: sent };
  } catch (err) {
    if (!/app_notifications|push_subscriptions/.test(err.message)) console.warn('[appNotify]', err.message);
    return null;
  }
}

/** Alert everyone with one of these roles (new booking, package request, …). */
async function notifyRoles(roles, { title, body, url, event = 'ADMIN_ALERT', refType = null, refId = null }) {
  try {
    const [users] = await pool.query('SELECT id FROM users WHERE role IN (?) AND is_active = 1', [roles]);
    for (const u of users) await notifyUser({ userId: u.id, title, body, url, event, refType, refId });
  } catch (err) {
    console.warn('[appNotify roles]', err.message);
  }
}

module.exports = { notifyUser, notifyRoles, pushToUser, titleFor };

const pool = require('../config/db');

// ─── Inbox ──────────────────────────────────
exports.list = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const before = parseInt(req.query.before, 10) || null;
    const [rows] = await pool.query(
      `SELECT id, title, body, url, event, is_read, created_at FROM app_notifications
       WHERE user_id = ? ${before ? 'AND id < ?' : ''} ORDER BY id DESC LIMIT ?`,
      before ? [req.user.id, before, limit] : [req.user.id, limit]
    );
    const [[{ unread }]] = await pool.query('SELECT COUNT(*) AS unread FROM app_notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
    res.json({ success: true, data: rows, unread: Number(unread) });
  } catch (err) {
    console.error('Notifications list error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const [[{ unread }]] = await pool.query('SELECT COUNT(*) AS unread FROM app_notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
    res.json({ success: true, unread: Number(unread) });
  } catch {
    res.json({ success: true, unread: 0 });
  }
};

exports.markRead = async (req, res) => {
  try {
    await pool.query('UPDATE app_notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await pool.query('UPDATE app_notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── Phone notifications (web push) ─────────
exports.publicKey = (req, res) => {
  res.json({ success: true, key: process.env.VAPID_PUBLIC_KEY || null });
};

exports.subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !/^https:\/\//.test(endpoint) || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, error: 'Invalid subscription' });
    }
    // One row per phone/browser; re-subscribing (or a new login on the same phone) moves it to this user
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth), user_agent = VALUES(user_agent), fail_count = 0`,
      [req.user.id, String(endpoint).slice(0, 600), String(keys.p256dh).slice(0, 200), String(keys.auth).slice(0, 100), String(req.headers['user-agent'] || '').slice(0, 255)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Push subscribe error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (endpoint) await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?', [endpoint, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/** Sends a test notification to the logged-in user's phones. */
exports.test = async (req, res) => {
  const { notifyUser } = require('../services/appNotify');
  const r = await notifyUser({
    userId: req.user.id,
    event: 'TEST',
    title: 'Notifications are on ✅',
    body: 'You will get booking reminders and updates from GK AutoHerb here.',
  });
  res.json({ success: !!r, pushed: r?.pushed || 0 });
};

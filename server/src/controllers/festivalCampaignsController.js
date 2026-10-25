const pool = require('../config/db');
const automation = require('../services/automationJobs');

const AUDIENCES = ['all', 'package', 'inactive', 'recent'];

exports.list = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM festival_campaigns ORDER BY scheduled_at DESC LIMIT 100');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List festival campaigns error:', err);
    res.status(500).json({ success: false, error: 'Failed to load campaigns' });
  }
};

/** How many customers a campaign would reach. */
exports.audienceCount = async (req, res) => {
  try {
    const audience = AUDIENCES.includes(req.query.audience) ? req.query.audience : 'all';
    res.json({ success: true, data: { audience, count: await automation.countFestivalAudience(audience) } });
  } catch (err) {
    console.error('Festival audience count error:', err);
    res.status(500).json({ success: false, error: 'Failed to count audience' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, festival, message, coupon_code, audience, scheduled_at, send_now } = req.body;
    if (!title?.trim() || !message?.trim()) return res.status(400).json({ success: false, error: 'Title and message are required' });
    if (String(message).length > 900) return res.status(400).json({ success: false, error: 'Message is too long (max 900 characters)' });
    const aud = AUDIENCES.includes(audience) ? audience : 'all';

    let when = new Date();
    if (!send_now) {
      when = new Date(scheduled_at);
      if (isNaN(when.getTime())) return res.status(400).json({ success: false, error: 'Pick a valid date and time' });
      if (when.getTime() < Date.now() - 60000) return res.status(400).json({ success: false, error: 'That time is in the past' });
    }

    const [r] = await pool.query(
      `INSERT INTO festival_campaigns (title, festival, message, coupon_code, audience, scheduled_at, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title.trim().slice(0, 120), festival || null, message.trim(), (coupon_code || '').trim().toUpperCase() || null, aud, when, send_now ? 'sending' : 'scheduled', req.user.id]
    );

    if (send_now) {
      // Send in the background; the page polls the list for the result
      const [rows] = await pool.query('SELECT * FROM festival_campaigns WHERE id = ?', [r.insertId]);
      automation.sendFestivalCampaign(rows[0]).catch(async (e) => {
        console.error('Festival send failed:', e.message);
        await pool.query("UPDATE festival_campaigns SET status = 'scheduled' WHERE id = ?", [r.insertId]);
      });
    }
    res.status(201).json({ success: true, data: { id: r.insertId }, message: send_now ? 'Sending now' : 'Campaign scheduled' });
  } catch (err) {
    console.error('Create festival campaign error:', err);
    res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
};

exports.cancel = async (req, res) => {
  try {
    const [r] = await pool.query("UPDATE festival_campaigns SET status = 'cancelled' WHERE id = ? AND status = 'scheduled'", [req.params.id]);
    if (!r.affectedRows) return res.status(409).json({ success: false, error: 'Only scheduled campaigns can be cancelled' });
    res.json({ success: true, message: 'Campaign cancelled' });
  } catch (err) {
    console.error('Cancel festival campaign error:', err);
    res.status(500).json({ success: false, error: 'Failed to cancel campaign' });
  }
};

/**
 * Admin module: birthday & anniversary wishes.
 *   - default campaign per occasion + personal campaigns for chosen customers (custom text / offer)
 *   - upcoming birthdays & anniversaries list
 *   - send a wish right now to a selected customer
 *   - log of what went out
 * The daily 9 AM job (automationJobs.runGreetings) sends the wishes automatically.
 */
const pool = require('../config/db');
const { sendGreeting, pickCampaign } = require('../services/automationJobs');

function campaignFields(body) {
  return {
    occasion: body.occasion === 'anniversary' ? 'anniversary' : 'birthday',
    customer_id: body.customer_id ? Number(body.customer_id) : null,
    title: String(body.title || '').trim().slice(0, 150) || 'Greeting',
    message_body: String(body.message_body || '').trim(),
    offer_code: body.offer_code ? String(body.offer_code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) : null,
    discount_percent: body.discount_percent ? Math.min(100, Number(body.discount_percent)) : null,
    discount_amount: body.discount_amount ? Number(body.discount_amount) : null,
    valid_days: Math.max(1, parseInt(body.valid_days, 10) || 7),
    is_active: body.is_active === undefined ? 1 : (body.is_active ? 1 : 0),
  };
}

exports.listCampaigns = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, u.name AS customer_name, u.mobile AS customer_mobile
       FROM greeting_campaigns g LEFT JOIN users u ON u.id = g.customer_id
       ORDER BY g.customer_id IS NOT NULL, g.occasion, g.id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List campaigns error:', err);
    res.status(500).json({ success: false, error: 'Failed to load campaigns' });
  }
};

exports.saveCampaign = async (req, res) => {
  try {
    const f = campaignFields(req.body);
    if (!f.message_body) return res.status(400).json({ success: false, error: 'Message is required' });
    f.created_by = req.user.id;
    if (req.params.id) {
      await pool.query('UPDATE greeting_campaigns SET ? WHERE id = ?', [f, req.params.id]);
      return res.json({ success: true, data: { id: Number(req.params.id), ...f } });
    }
    const [r] = await pool.query('INSERT INTO greeting_campaigns SET ?', [f]);
    res.status(201).json({ success: true, data: { id: r.insertId, ...f } });
  } catch (err) {
    console.error('Save campaign error:', err);
    res.status(500).json({ success: false, error: 'Failed to save campaign' });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT customer_id FROM greeting_campaigns WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Campaign not found' });
    if (rows[0].customer_id === null) {
      // Defaults are switched off, not deleted, so the daily job always has a fallback
      await pool.query('UPDATE greeting_campaigns SET is_active = 0 WHERE id = ?', [req.params.id]);
    } else {
      await pool.query('DELETE FROM greeting_campaigns WHERE id = ?', [req.params.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete campaign error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
};

/** Customers whose birthday / anniversary falls in the next N days (default 30). */
exports.upcoming = async (req, res) => {
  try {
    const days = Math.min(366, parseInt(req.query.days, 10) || 30);
    const out = [];
    for (const [occasion, col] of [['birthday', 'date_of_birth'], ['anniversary', 'anniversary_date']]) {
      const [rows] = await pool.query(
        `SELECT u.id, u.name, u.mobile, u.gender, u.profile_photo_url, DATE_FORMAT(u.${col}, '%Y-%m-%d') AS date,
                DATEDIFF(
                  IF(DATE_FORMAT(u.${col}, CONCAT(YEAR(CURDATE()), '-%m-%d')) >= CURDATE(),
                     DATE_FORMAT(u.${col}, CONCAT(YEAR(CURDATE()), '-%m-%d')),
                     DATE_FORMAT(u.${col}, CONCAT(YEAR(CURDATE()) + 1, '-%m-%d'))),
                  CURDATE()) AS days_away,
                (SELECT COUNT(*) FROM greeting_logs gl WHERE gl.customer_id = u.id AND gl.occasion = ? AND gl.greeting_year = YEAR(CURDATE())) AS sent_this_year,
                (SELECT COUNT(*) FROM greeting_campaigns gc WHERE gc.customer_id = u.id AND gc.occasion = ? AND gc.is_active = 1) AS has_personal_offer
         FROM users u
         WHERE u.role = 'customer' AND u.is_active = 1 AND u.${col} IS NOT NULL
         HAVING days_away <= ?
         ORDER BY days_away`,
        [occasion, occasion, days]
      );
      rows.forEach((r) => out.push({ ...r, occasion }));
    }
    out.sort((a, b) => a.days_away - b.days_away);
    const [[totals]] = await pool.query(
      `SELECT SUM(date_of_birth IS NOT NULL) AS with_birthday, SUM(anniversary_date IS NOT NULL) AS with_anniversary, COUNT(*) AS customers
       FROM users WHERE role = 'customer' AND is_active = 1`
    );
    res.json({ success: true, data: out, totals });
  } catch (err) {
    console.error('Upcoming greetings error:', err);
    res.status(500).json({ success: false, error: 'Failed to load upcoming dates' });
  }
};

/** POST /greetings/send  { customer_id, occasion, message?, campaign_id? } */
exports.sendNow = async (req, res) => {
  try {
    const { customer_id, occasion = 'birthday', message, campaign_id } = req.body;
    const [users] = await pool.query("SELECT id, name, mobile FROM users WHERE id = ? AND role = 'customer'", [customer_id]);
    if (!users.length) return res.status(404).json({ success: false, error: 'Customer not found' });
    let campaign = null;
    if (campaign_id) {
      const [c] = await pool.query('SELECT * FROM greeting_campaigns WHERE id = ?', [campaign_id]);
      campaign = c[0] || null;
    } else {
      campaign = await pickCampaign(users[0].id, occasion === 'anniversary' ? 'anniversary' : 'birthday');
    }
    const result = await sendGreeting(users[0], occasion === 'anniversary' ? 'anniversary' : 'birthday', {
      campaign,
      customMessage: message && String(message).trim() ? String(message).trim() : null,
      force: true,
    });
    res.json({ success: true, data: result, message: result.whatsapp === 'sent' ? 'Wish sent on WhatsApp' : 'Wish queued — WhatsApp link ready' });
  } catch (err) {
    console.error('Send greeting error:', err);
    res.status(500).json({ success: false, error: 'Failed to send wish' });
  }
};

exports.logs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT gl.*, u.name AS customer_name, u.mobile AS customer_mobile
       FROM greeting_logs gl JOIN users u ON u.id = gl.customer_id
       ORDER BY gl.sent_at DESC LIMIT 200`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Greeting logs error:', err);
    res.status(500).json({ success: false, error: 'Failed to load logs' });
  }
};

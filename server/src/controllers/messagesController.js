const pool = require('../config/db');
const messagingService = require('../services/messagingService');

// Helper function to get campaign target query
const getCampaignQuery = (campaign) => {
  let query = '';
  switch (campaign) {
    case 'bulk_free_wash':
    case 'free_wash_reminder':
      query = `SELECT u.* FROM users u JOIN loyalty l ON u.id = l.customer_id WHERE l.free_washes > 0 AND u.role = 'customer' AND u.is_active = 1 AND u.mobile IS NOT NULL AND u.mobile != ''`;
      break;
    case 'bulk_credits':
    case 'credits_reminder':
      query = `SELECT u.* FROM users u JOIN loyalty l ON u.id = l.customer_id WHERE l.credits > 0 AND u.role = 'customer' AND u.is_active = 1 AND u.mobile IS NOT NULL AND u.mobile != ''`;
      break;
    case 'bulk_reengagement':
    case 'reengagement':
      query = `SELECT u.* FROM users u JOIN loyalty l ON u.id = l.customer_id WHERE l.credits = 0 AND l.free_washes = 0 AND l.wax_count = 0 AND u.role = 'customer' AND u.is_active = 1 AND u.mobile IS NOT NULL AND u.mobile != ''`;
      break;
    default:
      query = `SELECT u.* FROM users u WHERE u.role = 'customer' AND u.is_active = 1 AND u.mobile IS NOT NULL AND u.mobile != ''`;
  }
  return query;
};

// ─── LIST MESSAGES LOG ────────────────────────
exports.listLogs = async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, channel } = req.query;
    let where = '1=1';
    const params = [];
    
    if (status) {
      where += ' AND m.status = ?';
      params.push(status);
    }
    if (channel) {
      where += ' AND m.channel = ?';
      params.push(channel);
    }
    
    params.push(parseInt(limit, 10));
    params.push(parseInt(offset, 10));

    const [rows] = await pool.query(`
      SELECT m.*, u.name as customer_name 
      FROM messages_log m
      LEFT JOIN users u ON m.customer_id = u.id
      WHERE ${where}
      ORDER BY m.sent_at DESC
      LIMIT ? OFFSET ?
    `, params);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Messages list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET BULK PREVIEW ─────────────────────────
exports.getBulkPreview = async (req, res) => {
  try {
    const { campaign } = req.query;
    if (!campaign) {
      return res.status(400).json({ success: false, error: 'Missing campaign parameter' });
    }

    const query = getCampaignQuery(campaign);
    const [users] = await pool.query(query);

    res.json({
      success: true,
      data: {
        campaign,
        target_count: users.length
      }
    });

  } catch (err) {
    console.error('Messages preview error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── SEND BULK PROMOTIONAL MESSAGE ────────────
exports.sendBulk = async (req, res) => {
  try {
    const { message_type, channel, target_audience, message_content } = req.body;
    
    // Validate
    if (!message_type || !channel || !target_audience || !message_content) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Since UI passes audience 'all', but might pass msgType 'bulk_free_wash', mapping logic
    // determines using message_type for campaign if it's specific.
    const query = getCampaignQuery(message_type);
    const [users] = await pool.query(query);

    if (!users.length) {
      return res.status(400).json({ success: false, error: 'No valid customers found matching criteria' });
    }

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        let result;
        if (channel === 'whatsapp') {
          // Assume pre-created template like 'bulk_promotion'
          result = await messagingService.sendWhatsApp(user.mobile, 'bulk_promotion', { body: message_content });
        } else {
          result = await messagingService.sendSMS(user.mobile, process.env.MSG91_PROMO_TEMPLATE_ID || 'PROMO123', '1', {
            name: user.name,
            content: message_content
          });
        }
        
        const status = result.success ? 'sent' : 'failed';
        if (result.success) sent++;
        else failed++;
        
        await pool.query(`
          INSERT INTO messages_log (customer_id, mobile, type, channel, status, message_preview)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [user.id, user.mobile, message_type, channel, status, message_content.substring(0, 100)]);
        
      } catch (e) {
        failed++;
        console.error('Failed to send bulk message to user', user.id, e);
      }
    }

    res.json({
      success: true,
      data: { total: users.length, sent, failed },
      message: `Bulk message triggered. Sent: ${sent}, Failed: ${failed}`
    });
  } catch (err) {
    console.error('Send bulk message error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── SEND SINGLE MESSAGE ──────────────────────
exports.sendSingle = async (req, res) => {
  try {
    const { customer_id, channel, message_type, message_content } = req.body;
    
    if (!customer_id || !channel || !message_content) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE id = ? AND role = "customer"', [customer_id]);
    
    if (!users.length || !users[0].mobile) {
      return res.status(404).json({ success: false, error: 'Customer not found or has no valid mobile number' });
    }

    const user = users[0];
    let result;

    if (channel === 'whatsapp') {
      result = await messagingService.sendWhatsApp(user.mobile, 'manual_message', { body: message_content });
    } else {
      result = await messagingService.sendSMS(user.mobile, process.env.MSG91_PROMO_TEMPLATE_ID || 'PROMO123', '1', {
        name: user.name,
        content: message_content
      });
    }

    const status = result.success ? 'sent' : 'failed';
    
    await pool.query(`
      INSERT INTO messages_log (customer_id, mobile, type, channel, status, message_preview)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [user.id, user.mobile, message_type || 'manual', channel, status, message_content.substring(0, 100)]);

    if (!result.success) {
       return res.status(500).json({ success: false, error: 'Failed to send message' });
    }

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error('Send single message error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

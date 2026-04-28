const pool = require('../config/db');

// ─── GET ALL SETTINGS ─────────────────────
exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT key_name, value FROM settings');
    // Convert array of pairs to an object map
    const settingsMap = rows.reduce((acc, curr) => {
      acc[curr.key_name] = curr.value;
      return acc;
    }, {});
    
    res.json({ success: true, data: settingsMap });
  } catch (err) {
    console.error('Settings getAll error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── UPDATE MULTIPLE SETTINGS ─────────────
exports.updateAll = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const updates = req.body; // { key_name: new_value, key2: value2 }
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }

    await conn.beginTransaction();

    for (const [key, value] of Object.entries(updates)) {
      // Use standard INSERT ... ON DUPLICATE KEY UPDATE but safe
      await conn.query(
        'INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
        [key, value !== null ? String(value) : '', value !== null ? String(value) : '']
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    await conn.rollback();
    console.error('Settings updateAll error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

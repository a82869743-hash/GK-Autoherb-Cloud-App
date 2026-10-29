const pool = require('../config/db');
const { setSetting } = require('../utils/settingsStore');

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

// ─── GET PUBLIC STUDIO SETTINGS ───────────
exports.getPublic = async (req, res) => {
  try {
    const publicKeys = [
      'studio_name', 'studio_address', 'studio_area', 'studio_mobile',
      'studio_email', 'studio_gst', 'studio_lat', 'studio_lng',
      'pickup_charge', 'drop_charge', 'pickup_drop_charge',
      'bookings_paused', 'bookings_paused_message',
      'advance_type', 'advance_value', 'is_gst_applicable'
    ];
    const [rows] = await pool.query(
      'SELECT key_name, value FROM settings WHERE key_name IN (?)',
      [publicKeys]
    );
    const settingsMap = rows.reduce((acc, curr) => {
      acc[curr.key_name] = curr.value;
      return acc;
    }, {});

    // Reliable fallbacks for GK AutoHerb
    if (!settingsMap.studio_name) settingsMap.studio_name = 'GK AutoHerb Detailing Studio';
    if (!settingsMap.studio_address) settingsMap.studio_address = 'Gotri - Vasna - Bhayli Main Road, Vadodara, Gujarat 391410';
    if (!settingsMap.studio_area) settingsMap.studio_area = 'Gotri - Vasna - Bhayli Road, Vadodara';
    if (!settingsMap.studio_lat) settingsMap.studio_lat = '22.3134';
    if (!settingsMap.studio_lng) settingsMap.studio_lng = '73.1342';
    if (!settingsMap.studio_mobile) settingsMap.studio_mobile = '9408424541';
    if (!settingsMap.studio_email) settingsMap.studio_email = 'gaurav.itm2006@gmail.com';
    if (!settingsMap.studio_gst) settingsMap.studio_gst = '24AKUPK0446L1ZT';

    res.json({ success: true, data: settingsMap });
  } catch (err) {
    console.error('Settings getPublic error:', err);
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

    // Studio pin must be a real point in/near Vadodara (a phone in another city once saved Gwalior here)
    if (updates.studio_lat !== undefined || updates.studio_lng !== undefined) {
      const lat = Number(updates.studio_lat);
      const lng = Number(updates.studio_lng);
      const toRad = (d) => (d * Math.PI) / 180;
      const km = 6371 * 2 * Math.asin(Math.sqrt(
        Math.sin(toRad(lat - 22.3072) / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(22.3072)) * Math.sin(toRad(lng - 73.1812) / 2) ** 2
      ));
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !(km <= 60)) {
        return res.status(400).json({ success: false, error: `Studio location must be in Vadodara (this one is ${Number.isFinite(km) ? Math.round(km) + ' km' : 'invalid'} away).` });
      }
    }

    await conn.beginTransaction();

    for (const [key, value] of Object.entries(updates)) {
      await setSetting(key, value, conn);
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

// ─── SERVICE REMINDERS MANUAL TRIGGER & PREVIEW ────
exports.previewReminders = async (req, res) => {
  try {
    const { runServiceReminders } = require('../services/cronService');
    const result = await runServiceReminders({ isPreview: true });
    res.json(result);
  } catch (err) {
    console.error('Preview reminders error:', err);
    res.status(500).json({ success: false, error: 'Failed to preview reminders' });
  }
};

exports.sendRemindersNow = async (req, res) => {
  try {
    const { runServiceReminders } = require('../services/cronService');
    const result = await runServiceReminders({ isManual: true, io: req.app.get('io') });
    res.json(result);
  } catch (err) {
    console.error('Send reminders now error:', err);
    res.status(500).json({ success: false, error: 'Failed to dispatch reminders' });
  }
};


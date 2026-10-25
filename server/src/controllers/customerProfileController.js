/**
 * Customer profile for the mobile app:
 *   - profile fields: name, email, gender (required), date of birth & anniversary (optional), photo (optional)
 *   - saved addresses, Blinkit style (Home / Work / Other, one default)
 *   - "profile complete" = gender set + at least one saved address
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/db');
const { detectVehicleCategory } = require('../utils/vehicleCategory');

const AVATAR_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');

function toDateOnly(v) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 'invalid';
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d > new Date()) return 'invalid';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function dateOut(v) {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  return new Date(v.getTime() + 5.5 * 36e5).toISOString().slice(0, 10);
}

async function buildProfile(userId) {
  const [users] = await pool.query(
    `SELECT id, name, mobile, email, gender, date_of_birth, anniversary_date, profile_photo_url,
            opt_out_promotional, whatsapp_opt_in, referral_code, created_at
     FROM users WHERE id = ?`,
    [userId]
  );
  if (!users.length) return null;
  const u = users[0];
  const [addresses] = await pool.query(
    'SELECT * FROM v2_customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, updated_at DESC',
    [userId]
  );
  const [[{ vehicles }]] = await pool.query('SELECT COUNT(*) AS vehicles FROM vehicles WHERE customer_id = ?', [userId]);
  const missing = [];
  if (!u.gender) missing.push('gender');
  if (!addresses.length) missing.push('address');
  return {
    ...u,
    date_of_birth: dateOut(u.date_of_birth),
    anniversary_date: dateOut(u.anniversary_date),
    addresses,
    vehicle_count: vehicles,
    profile_complete: missing.length === 0,
    missing_fields: missing,
  };
}
exports.buildProfile = buildProfile;

exports.getProfile = async (req, res) => {
  try {
    const profile = await buildProfile(req.user.id);
    if (!profile) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: profile });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, gender, date_of_birth, anniversary_date, opt_out_promotional, whatsapp_opt_in } = req.body;
    const sets = [];
    const params = [];

    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ success: false, error: 'Name cannot be empty' });
      sets.push('name = ?'); params.push(String(name).trim().slice(0, 100));
    }
    if (email !== undefined) {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: 'Enter a valid email' });
      sets.push('email = ?'); params.push(email || null);
    }
    if (gender !== undefined) {
      if (!['male', 'female', 'other'].includes(gender)) return res.status(400).json({ success: false, error: 'Select a gender' });
      sets.push('gender = ?'); params.push(gender);
    }
    const dob = toDateOnly(date_of_birth);
    if (dob === 'invalid') return res.status(400).json({ success: false, error: 'Enter a valid date of birth' });
    if (dob !== undefined) { sets.push('date_of_birth = ?'); params.push(dob); }
    const anniv = toDateOnly(anniversary_date);
    if (anniv === 'invalid') return res.status(400).json({ success: false, error: 'Enter a valid anniversary date' });
    if (anniv !== undefined) { sets.push('anniversary_date = ?'); params.push(anniv); }
    if (opt_out_promotional !== undefined) { sets.push('opt_out_promotional = ?'); params.push(opt_out_promotional ? 1 : 0); }
    if (whatsapp_opt_in !== undefined) { sets.push('whatsapp_opt_in = ?'); params.push(whatsapp_opt_in ? 1 : 0); }

    if (sets.length) {
      await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, req.user.id]);
    }
    res.json({ success: true, message: 'Profile updated', data: await buildProfile(req.user.id) });
  } catch (err) {
    console.error('Update profile error:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'Email already in use' });
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

/** POST /customer-profile/photo  { image: "data:image/jpeg;base64,..." } (resized client-side) */
exports.uploadPhoto = async (req, res) => {
  try {
    const { image } = req.body || {};
    const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(image || '');
    if (!m) return res.status(400).json({ success: false, error: 'Upload a JPG, PNG or WEBP image' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 3 * 1024 * 1024) return res.status(400).json({ success: false, error: 'Photo must be under 3 MB' });

    fs.mkdirSync(AVATAR_DIR, { recursive: true });
    const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
    const file = `u${req.user.id}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(AVATAR_DIR, file), buf);

    const [old] = await pool.query('SELECT profile_photo_url FROM users WHERE id = ?', [req.user.id]);
    const url = `/uploads/avatars/${file}`;
    await pool.query('UPDATE users SET profile_photo_url = ? WHERE id = ?', [url, req.user.id]);

    const prev = old[0]?.profile_photo_url;
    if (prev && prev.startsWith('/uploads/avatars/')) {
      fs.promises.unlink(path.join(AVATAR_DIR, path.basename(prev))).catch(() => {});
    }
    res.json({ success: true, data: { profile_photo_url: url } });
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload photo' });
  }
};

exports.removePhoto = async (req, res) => {
  try {
    const [old] = await pool.query('SELECT profile_photo_url FROM users WHERE id = ?', [req.user.id]);
    await pool.query('UPDATE users SET profile_photo_url = NULL WHERE id = ?', [req.user.id]);
    const prev = old[0]?.profile_photo_url;
    if (prev && prev.startsWith('/uploads/avatars/')) {
      fs.promises.unlink(path.join(AVATAR_DIR, path.basename(prev))).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Remove photo error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove photo' });
  }
};

// ─── Saved addresses ──────────────────────────────────────
function addressFields(body) {
  const label = ['home', 'work', 'other'].includes(body.label) ? body.label : 'home';
  const lat = body.latitude === '' || body.latitude === undefined ? null : Number(body.latitude);
  const lng = body.longitude === '' || body.longitude === undefined ? null : Number(body.longitude);
  return {
    label,
    label_name: label === 'other' && body.label_name ? String(body.label_name).slice(0, 50) : null,
    house_no: body.house_no ? String(body.house_no).slice(0, 120) : null,
    area: body.area ? String(body.area).slice(0, 200) : null,
    address: String(body.address || [body.house_no, body.area].filter(Boolean).join(', ')).slice(0, 500),
    landmark: body.landmark ? String(body.landmark).slice(0, 255) : null,
    city: body.city ? String(body.city).slice(0, 100) : null,
    state: body.state ? String(body.state).slice(0, 100) : null,
    pincode: body.pincode ? String(body.pincode).replace(/\D/g, '').slice(0, 6) : null,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    receiver_name: body.receiver_name ? String(body.receiver_name).slice(0, 120) : null,
    receiver_phone: body.receiver_phone ? String(body.receiver_phone).replace(/\D/g, '').slice(-10) : null,
  };
}

function validateAddress(f) {
  if (!f.house_no && !f.address) return 'Enter house / flat number';
  if (!f.area && !f.address) return 'Enter the area or street';
  if (!f.city) return 'Enter the city';
  if (!f.pincode || f.pincode.length !== 6) return 'Enter a 6-digit pincode';
  return null;
}

exports.listAddresses = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM v2_customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, updated_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List addresses error:', err);
    res.status(500).json({ success: false, error: 'Failed to load addresses' });
  }
};

exports.createAddress = async (req, res) => {
  try {
    const f = addressFields(req.body);
    const problem = validateAddress(f);
    if (problem) return res.status(400).json({ success: false, error: problem });

    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM v2_customer_addresses WHERE customer_id = ?', [req.user.id]);
    const makeDefault = n === 0 || Boolean(req.body.is_default);
    if (makeDefault) await pool.query('UPDATE v2_customer_addresses SET is_default = 0 WHERE customer_id = ?', [req.user.id]);

    const [r] = await pool.query('INSERT INTO v2_customer_addresses SET ?', [{ ...f, customer_id: req.user.id, is_default: makeDefault ? 1 : 0 }]);
    const [rows] = await pool.query('SELECT * FROM v2_customer_addresses WHERE id = ?', [r.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Create address error:', err);
    res.status(500).json({ success: false, error: 'Failed to save address' });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM v2_customer_addresses WHERE id = ? AND customer_id = ?', [req.params.addressId, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Address not found' });
    const f = addressFields({ ...rows[0], ...req.body });
    const problem = validateAddress(f);
    if (problem) return res.status(400).json({ success: false, error: problem });
    if (req.body.is_default) await pool.query('UPDATE v2_customer_addresses SET is_default = 0 WHERE customer_id = ?', [req.user.id]);
    await pool.query('UPDATE v2_customer_addresses SET ? WHERE id = ?', [{ ...f, ...(req.body.is_default ? { is_default: 1 } : {}) }, rows[0].id]);
    const [updated] = await pool.query('SELECT * FROM v2_customer_addresses WHERE id = ?', [rows[0].id]);
    res.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error('Update address error:', err);
    res.status(500).json({ success: false, error: 'Failed to update address' });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM v2_customer_addresses WHERE id = ? AND customer_id = ?', [req.params.addressId, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Address not found' });
    await pool.query('UPDATE v2_customer_addresses SET is_default = (id = ?) WHERE customer_id = ?', [rows[0].id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Default address error:', err);
    res.status(500).json({ success: false, error: 'Failed to update default address' });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM v2_customer_addresses WHERE id = ? AND customer_id = ?', [req.params.addressId, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Address not found' });
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM v2_customer_addresses WHERE customer_id = ?', [req.user.id]);
    if (n <= 1) return res.status(400).json({ success: false, error: 'Keep at least one address on your profile' });
    await pool.query('DELETE FROM v2_customer_addresses WHERE id = ?', [rows[0].id]);
    if (rows[0].is_default) {
      await pool.query('UPDATE v2_customer_addresses SET is_default = 1 WHERE customer_id = ? ORDER BY updated_at DESC LIMIT 1', [req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete address error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete address' });
  }
};

/** Warranties on the customer's cars. */
exports.myWarranties = async (req, res) => {
  try {
    await pool.query("UPDATE service_warranties SET status = 'expired' WHERE customer_id = ? AND status = 'active' AND end_date < CURDATE()", [req.user.id]);
    const [rows] = await pool.query(
      `SELECT w.*, v.brand, v.model, v.registration_no
       FROM service_warranties w LEFT JOIN vehicles v ON v.id = w.vehicle_id
       WHERE w.customer_id = ? ORDER BY w.status = 'active' DESC, w.end_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows.map((w) => ({ ...w, start_date: dateOut(w.start_date), end_date: dateOut(w.end_date) })) });
  } catch (err) {
    console.error('My warranties error:', err);
    res.status(500).json({ success: false, error: 'Failed to load warranties' });
  }
};

/** Pricing segment for a make/model — the app uses it to show only the matching price. */
exports.segmentFor = (req, res) => {
  res.json({ success: true, data: { category: detectVehicleCategory(req.query.brand, req.query.model) } });
};

const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── LIST SHARED FILES ──────────────────────────────
exports.list = async (req, res) => {
  try {
    const { entity_type, entity_id, customer_id } = req.query;
    let where = '1=1';
    const params = [];

    if (entity_type) { where += ' AND sf.entity_type = ?'; params.push(entity_type); }
    if (entity_id) { where += ' AND sf.entity_id = ?'; params.push(entity_id); }
    if (customer_id) { 
      where += ' AND sf.shared_with_customer = 1 AND jc.customer_id = ?'; 
      params.push(customer_id); 
    }

    const query = `
      SELECT sf.*, u.name as uploader_name
      FROM shared_files sf
      LEFT JOIN users u ON u.id = sf.uploaded_by
      LEFT JOIN job_carts jc ON jc.id = sf.entity_id AND sf.entity_type = 'job_cart'
      WHERE ${where}
      ORDER BY sf.created_at DESC
    `;
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Shared files list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── UPLOAD FILE ────────────────────────────────────
exports.upload = async (req, res) => {
  try {
    const { entity_type, entity_id, shared_with_customer } = req.body;
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });

    const share_token = crypto.randomBytes(16).toString('hex');
    const fileUrl = `/uploads/shared/${req.file.filename}`;

    const [result] = await pool.query(
      `INSERT INTO shared_files (uploaded_by, entity_type, entity_id, file_name, file_path, file_type, file_size, shared_with_customer, share_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, entity_type || 'general', entity_id || null, req.file.originalname, fileUrl, req.file.mimetype, req.file.size, shared_with_customer === 'true' ? 1 : 0, share_token]
    );

    res.status(201).json({ success: true, data: { id: result.insertId, fileUrl, share_token }, message: 'File uploaded' });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── DELETE FILE ────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM shared_files WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'File not found' });

    const filePath = path.join(__dirname, '../../public', existing[0].file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM shared_files WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    console.error('File delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── PUBLIC DOWNLOAD BY TOKEN ───────────────────────
exports.downloadByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const [rows] = await pool.query('SELECT * FROM shared_files WHERE share_token = ? AND shared_with_customer = 1', [token]);
    
    if (!rows.length) return res.status(404).send('File not found or access denied');
    
    const file = rows[0];
    const filePath = path.join(__dirname, '../../public', file.file_path);
    
    if (!fs.existsSync(filePath)) return res.status(404).send('File missing on server');
    
    res.download(filePath, file.file_name);
  } catch (err) {
    console.error('File download error:', err);
    res.status(500).send('Server error');
  }
};

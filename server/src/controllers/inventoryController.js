const pool = require('../config/db');
const xlsx = require('xlsx');

// ─── LIST ───────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { search, low_stock, page = 1, limit = 50, category, brand, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'is_deleted = 0';
    const params = [];

    if (search) {
      where += ' AND (product_name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR brand LIKE ? OR category LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (low_stock === 'true' || low_stock === '1') {
      where += ' AND quantity <= low_stock_threshold';
    }

    if (category) {
      where += ' AND category = ?';
      params.push(category);
    }

    if (brand) {
      where += ' AND brand = ?';
      params.push(brand);
    }

    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM inventory WHERE ${where}`, params);

    const [rows] = await pool.query(
      `SELECT *, (quantity <= low_stock_threshold) AS is_low_stock
       FROM inventory WHERE ${where}
       ORDER BY product_name ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: rows.map(r => ({ ...r, is_low_stock: !!r.is_low_stock })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRows[0].total },
    });
  } catch (err) {
    console.error('Inventory list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET ONE ────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT *, (quantity <= low_stock_threshold) AS is_low_stock FROM inventory WHERE id = ? AND is_deleted = 0',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: { ...rows[0], is_low_stock: !!rows[0].is_low_stock } });
  } catch (err) {
    console.error('Inventory getOne error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CREATE ─────────────────────────────────
exports.create = async (req, res) => {
  try {
    const {
      product_name, unit = 'pcs', quantity = 0, low_stock_threshold = 5, images_json, description,
      sku, barcode, category, sub_category, brand, vehicle_compatibility, variant,
      cost_price = 0, selling_price = 0, discount_pct = 0, gst_pct = 0,
      supplier, purchase_date, purchase_invoice_no, warehouse_location,
      warranty, serial_number, expiry_date, status = 'active'
    } = req.body;

    if (!product_name) return res.status(400).json({ success: false, error: 'Product name is required' });

    const imagesVal = images_json ? (typeof images_json === 'string' ? images_json : JSON.stringify(images_json)) : null;

    const [result] = await pool.query(
      `INSERT INTO inventory (
        product_name, unit, quantity, low_stock_threshold, images_json, description,
        sku, barcode, category, sub_category, brand, vehicle_compatibility, variant,
        cost_price, selling_price, discount_pct, gst_pct,
        supplier, purchase_date, purchase_invoice_no, warehouse_location,
        warranty, serial_number, expiry_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_name, unit, quantity, low_stock_threshold, imagesVal, description || null,
        sku || null, barcode || null, category || null, sub_category || null, brand || null, vehicle_compatibility || null, variant || null,
        cost_price, selling_price, discount_pct, gst_pct,
        supplier || null, purchase_date || null, purchase_invoice_no || null, warehouse_location || null,
        warranty || null, serial_number || null, expiry_date || null, status
      ]
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Product created' });
  } catch (err) {
    console.error('Inventory create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── UPDATE ─────────────────────────────────
exports.update = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM inventory WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Product not found' });

    const updates = [];
    const params = [];

    const fields = [
      'product_name', 'unit', 'low_stock_threshold', 'description',
      'sku', 'barcode', 'category', 'sub_category', 'brand', 'vehicle_compatibility', 'variant',
      'cost_price', 'selling_price', 'discount_pct', 'gst_pct',
      'supplier', 'purchase_date', 'purchase_invoice_no', 'warehouse_location',
      'warranty', 'serial_number', 'expiry_date', 'status'
    ];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    }

    if (req.body.images_json !== undefined) {
      const imgVal = req.body.images_json ? (typeof req.body.images_json === 'string' ? req.body.images_json : JSON.stringify(req.body.images_json)) : null;
      updates.push('images_json = ?');
      params.push(imgVal);
    }

    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields to update' });

    params.push(req.params.id);
    await pool.query(`UPDATE inventory SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Product updated' });
  } catch (err) {
    console.error('Inventory update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADJUST QUANTITY (delta) ────────────────
exports.adjustQuantity = async (req, res) => {
  try {
    const { delta } = req.body;
    if (delta === undefined || delta === null) return res.status(400).json({ success: false, error: 'Delta is required' });

    const [existing] = await pool.query('SELECT id, quantity FROM inventory WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Product not found' });

    await pool.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [parseFloat(delta), req.params.id]);

    const [updated] = await pool.query(
      'SELECT *, (quantity <= low_stock_threshold) AS is_low_stock FROM inventory WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true, data: { ...updated[0], is_low_stock: !!updated[0].is_low_stock }, message: 'Quantity adjusted' });
  } catch (err) {
    console.error('Inventory adjust error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── SOFT DELETE ────────────────────────────
exports.softDelete = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM inventory WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Product not found' });

    await pool.query('UPDATE inventory SET is_deleted = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('Inventory delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── BULK UPLOAD ────────────────────────────
exports.bulkUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  const conn = await pool.getConnection();
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!data.length) return res.status(400).json({ success: false, error: 'Empty file' });

    await conn.beginTransaction();
    let count = 0;

    for (const row of data) {
      const name = row['Product Name'] || row.product_name || row.name;
      const unit = row['Unit'] || row.unit || 'pcs';
      const quantity = parseInt(row['Quantity'] || row.quantity || 0, 10);
      const lowStock = parseInt(row['Low Stock Threshold'] || row.low_stock_threshold || 5, 10);
      const price = parseFloat(row['Price'] || row.price || 0);

      if (!name) continue;

      // Check if product exists
      const [existing] = await conn.query('SELECT id FROM inventory WHERE product_name = ? AND is_deleted = 0', [name]);

      if (existing.length) {
        // Update quantity (add to existing)
        await conn.query('UPDATE inventory SET quantity = quantity + ?, price = ? WHERE id = ?', [quantity, price, existing[0].id]);
      } else {
        // Insert new
        await conn.query(
          'INSERT INTO inventory (product_name, unit, quantity, low_stock_threshold, price) VALUES (?, ?, ?, ?, ?)',
          [name, unit, quantity, lowStock, price]
        );
      }
      count++;
    }

    await conn.commit();
    res.status(201).json({ success: true, message: `Successfully imported ${count} products` });
  } catch (err) {
    await conn.rollback();
    console.error('Bulk upload error:', err);
    res.status(500).json({ success: false, error: 'Server error processing file' });
  } finally {
    conn.release();
  }
};

const fs = require('fs');
const pathModule = require('path');

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, error: 'Invalid file type. Only JPG, PNG, WEBP allowed.' });
    }

    // Validate file size (10MB max)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File too large. Max 10MB.' });
    }

    // Try Cloudinary first if configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const cloudinary = require('../config/cloudinary');
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'gk-autoherb/inventory-photos', resource_type: 'image' },
            (err, result) => { if (err) reject(err); else resolve(result); }
          );
          stream.end(req.file.buffer);
        });
        return res.status(201).json({
          success: true,
          url: result.secure_url,
          public_id: result.public_id,
          message: 'Photo uploaded to cloud successfully'
        });
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, falling back to local disk:', cloudErr.message);
      }
    }

    // Fallback: Save to local disk
    const uploadsDir = pathModule.join(__dirname, '..', '..', 'uploads', 'products');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const ext = pathModule.extname(req.file.originalname) || '.jpg';
    const safeName = req.file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    const fileName = `${Date.now()}_${safeName}${ext}`;
    const filePath = pathModule.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, req.file.buffer);

    // Build URL that express.static will serve
    const serverPort = process.env.PORT || 5000;
    const baseUrl = process.env.SERVER_URL || `http://localhost:${serverPort}`;
    const url = `${baseUrl}/uploads/products/${fileName}`;

    res.status(201).json({
      success: true,
      url,
      message: 'Photo uploaded successfully'
    });
  } catch (err) {
    console.error('Inventory photo upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload image' });
  }
};

// ─── BULK DELETE ─────────────────────────────
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Product IDs array required' });
    }
    await pool.query('UPDATE inventory SET is_deleted = 1 WHERE id IN (?)', [ids]);
    res.json({ success: true, message: `${ids.length} products deleted successfully` });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete products' });
  }
};

// ─── BULK UPDATE CATEGORY ────────────────────
exports.bulkUpdateCategory = async (req, res) => {
  try {
    const { ids, category } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !category) {
      return res.status(400).json({ success: false, error: 'IDs array and category string required' });
    }
    await pool.query('UPDATE inventory SET category = ? WHERE id IN (?)', [category, ids]);
    res.json({ success: true, message: `Category updated to "${category}" for ${ids.length} products` });
  } catch (err) {
    console.error('Bulk update category error:', err);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
};

// ─── BULK UPDATE STATUS ──────────────────────
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ success: false, error: 'IDs array and status required' });
    }
    await pool.query('UPDATE inventory SET status = ? WHERE id IN (?)', [status, ids]);
    res.json({ success: true, message: `Status updated to "${status}" for ${ids.length} products` });
  } catch (err) {
    console.error('Bulk update status error:', err);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
};

// ─── GET DISTINCT CATEGORIES ─────────────────
exports.getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT category, COUNT(*) as count FROM inventory WHERE is_deleted = 0 AND category IS NOT NULL AND category != '' GROUP BY category ORDER BY category ASC"
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
};


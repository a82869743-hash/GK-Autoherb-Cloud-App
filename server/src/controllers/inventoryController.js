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
    const files = req.files || (req.file ? [req.file] : []);
    if (!files.length) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const uploadedUrls = [];

    // Derive robust baseUrl fallback from request if SERVER_URL is missing or contains localhost in production
    let baseUrl = process.env.SERVER_URL || '';
    if (!baseUrl || (baseUrl.includes('localhost') && process.env.NODE_ENV === 'production')) {
      baseUrl = `${req.protocol}://${req.get('host')}`;
    }

    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ success: false, error: `Invalid file type for ${file.originalname}. Only JPG, PNG, WEBP allowed.` });
      }
      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: `File ${file.originalname} is too large. Max 10MB.` });
      }

      let photoUrl = '';
      let publicId = null;

      // Try Cloudinary first if configured
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        try {
          const cloudinary = require('../config/cloudinary');
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: 'gk-autoherb/inventory-photos', resource_type: 'image' },
              (err, res) => { if (err) reject(err); else resolve(res); }
            );
            stream.end(file.buffer);
          });
          photoUrl = result.secure_url;
          publicId = result.public_id;
          console.log('[STORAGE] Uploaded inventory image to Cloudinary:', photoUrl);
        } catch (cloudErr) {
          console.warn('[STORAGE] Cloudinary upload failed, falling back to local disk:', cloudErr.message);
        }
      } else {
        console.log('[STORAGE] Cloudinary credentials not set. Using local disk storage fallback.');
      }

      // Fallback: Save to local disk
      if (!photoUrl) {
        const uploadsDir = pathModule.join(__dirname, '..', '..', 'uploads', 'products');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const ext = pathModule.extname(file.originalname) || '.jpg';
        const safeName = file.originalname
          .replace(ext, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .substring(0, 50);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${safeName}${ext}`;
        const filePath = pathModule.join(uploadsDir, fileName);

        fs.writeFileSync(filePath, file.buffer);
        photoUrl = `${baseUrl}/uploads/products/${fileName}`;
      }

      uploadedUrls.push(photoUrl);
    }

    res.status(201).json({
      success: true,
      url: uploadedUrls[0],
      urls: uploadedUrls,
      message: `Uploaded ${uploadedUrls.length} image(s) successfully`
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

// ─── GET CATEGORIES ──────────────────────────
exports.getCategories = async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Fetch master categories list and distinct inventory categories safely
    const [dbCats] = await pool.query('SELECT name FROM inventory_categories ORDER BY name ASC');
    const [invCats] = await pool.query("SELECT DISTINCT category AS name FROM inventory WHERE category IS NOT NULL AND category != '' AND is_deleted = 0");
    const [countsRows] = await pool.query("SELECT category, COUNT(id) AS cnt FROM inventory WHERE category IS NOT NULL AND category != '' AND is_deleted = 0 GROUP BY category");

    const countsMap = {};
    (countsRows || []).forEach(r => {
      if (r.category) countsMap[r.category.trim().toLowerCase()] = Number(r.cnt || 0);
    });

    const categoryMap = new Map();
    (dbCats || []).forEach(c => {
      if (c.name && c.name.trim()) {
        const key = c.name.trim().toLowerCase();
        categoryMap.set(key, { category: c.name.trim(), count: countsMap[key] || 0 });
      }
    });

    (invCats || []).forEach(c => {
      if (c.name && c.name.trim()) {
        const key = c.name.trim().toLowerCase();
        if (!categoryMap.has(key)) {
          categoryMap.set(key, { category: c.name.trim(), count: countsMap[key] || 0 });
        }
      }
    });

    const result = Array.from(categoryMap.values()).sort((a, b) => a.category.localeCompare(b.category));
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
};

// ─── CREATE CATEGORY ─────────────────────────
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name required' });
    }
    const categoryName = name.trim();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(
      'INSERT INTO inventory_categories (name) VALUES (?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [categoryName]
    );

    res.status(201).json({ success: true, message: `Category "${categoryName}" created successfully` });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
};

// ─── RENAME CATEGORY ─────────────────────────
exports.renameCategory = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { old_name, new_name } = req.body;
    if (!old_name || !new_name || !old_name.trim() || !new_name.trim()) {
      return res.status(400).json({ success: false, error: 'Old name and new name required' });
    }
    await conn.beginTransaction();
    const oldCat = old_name.trim();
    const newCat = new_name.trim();

    // Update categories master table
    await conn.query(
      'INSERT INTO inventory_categories (name) VALUES (?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [newCat]
    );
    await conn.query('DELETE FROM inventory_categories WHERE name = ?', [oldCat]);

    // Cascade rename to inventory items
    const [result] = await conn.query(
      'UPDATE inventory SET category = ? WHERE category = ? AND is_deleted = 0',
      [newCat, oldCat]
    );

    await conn.commit();
    res.json({
      success: true,
      message: `Renamed category "${oldCat}" to "${newCat}" across ${result.affectedRows} product(s)`
    });
  } catch (err) {
    await conn.rollback();
    console.error('Rename category error:', err);
    res.status(500).json({ success: false, error: 'Failed to rename category' });
  } finally {
    conn.release();
  }
};

// ─── DELETE CATEGORY ─────────────────────────
exports.deleteCategory = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { name, reassign_to } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name required' });
    }
    const targetCategory = name.trim();

    await conn.beginTransaction();

    const [inUse] = await conn.query(
      'SELECT COUNT(*) AS cnt FROM inventory WHERE category = ? AND is_deleted = 0',
      [targetCategory]
    );
    const activeCount = inUse[0]?.cnt || 0;

    if (activeCount > 0 && (!reassign_to || !reassign_to.trim())) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: `Category "${targetCategory}" is currently assigned to ${activeCount} product(s). Select a target category to reassign them.`
      });
    }

    if (activeCount > 0 && reassign_to) {
      const reassignName = reassign_to.trim();
      await conn.query(
        'UPDATE inventory SET category = ? WHERE category = ? AND is_deleted = 0',
        [reassignName, targetCategory]
      );
    }

    // Delete from categories master table
    await conn.query('DELETE FROM inventory_categories WHERE name = ?', [targetCategory]);

    await conn.commit();
    res.json({ success: true, message: `Category "${targetCategory}" deleted successfully` });
  } catch (err) {
    await conn.rollback();
    console.error('Delete category error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  } finally {
    conn.release();
  }
};


const pool = require('../config/db');

// Create purchase bill
exports.create = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { vendor_id, purchase_date, invoice_number, items, tax_amount = 0, notes } = req.body;

    if (!vendor_id || !purchase_date || !items || !items.length) {
      return res.status(400).json({ success: false, error: 'Vendor, date, and items are required' });
    }

    // Calculate total amount from items
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
    }
    const finalTotal = totalAmount + parseFloat(tax_amount);

    // 1. Insert header
    const [headerResult] = await connection.query(
      `INSERT INTO v2_purchases (vendor_id, purchase_date, invoice_number, total_amount, tax_amount, status, notes)
       VALUES (?, ?, ?, ?, ?, 'received', ?)`,
      [vendor_id, purchase_date, invoice_number || null, finalTotal, tax_amount, notes || '']
    );
    const purchaseId = headerResult.insertId;

    // 2. Insert line items & update inventory
    for (const item of items) {
      const lineTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      await connection.query(
        `INSERT INTO v2_purchase_items (purchase_id, item_id, quantity, unit_price, total_price, received_quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [purchaseId, item.item_id, item.quantity, item.unit_price, lineTotal, item.quantity]
      );

      // Increment stock in inventory
      await connection.query(
        `UPDATE inventory SET quantity = quantity + ? WHERE id = ?`,
        [item.quantity, item.item_id]
      );
    }

    // 3. GST auto-logging
    const [gstSetting] = await connection.query("SELECT value FROM settings WHERE key_name = 'is_gst_applicable'");
    const isGstEnabled = gstSetting.length && gstSetting[0].value === '1';

    if (isGstEnabled) {
      const periodMonth = new Date(purchase_date).getMonth() + 1;
      const periodYear = new Date(purchase_date).getFullYear();
      const [gstSettingNo] = await connection.query("SELECT value FROM settings WHERE key_name = 'gstin'");
      const gstin = gstSettingNo.length ? gstSettingNo[0].value : '';

      const taxableAmount = totalAmount;
      const cgst = parseFloat(tax_amount) / 2;
      const sgst = parseFloat(tax_amount) / 2;
      const igst = 0;

      await connection.query(
        `INSERT INTO v2_gst_records (record_type, purchase_id, gstin, taxable_amount, cgst, sgst, igst, total_gst, period_month, period_year)
         VALUES ('purchase', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [purchaseId, gstin, taxableAmount, cgst, sgst, igst, tax_amount, periodMonth, periodYear]
      );
    }

    // 4. Create an expense record to link to balance sheet
    await connection.query(
      `INSERT INTO v2_expenses (category, description, amount, expense_date, payment_mode, vendor_id, added_by)
       VALUES ('Inventory Purchase', ?, ?, ?, 'cash', ?, ?)`,
      [`Purchase Invoice #${invoice_number || purchaseId}`, finalTotal, purchase_date, vendor_id, req.user.id]
    );

    await connection.commit();
    res.status(201).json({ success: true, data: { id: purchaseId }, message: 'Purchase bill recorded and inventory updated.' });
  } catch (err) {
    await connection.rollback();
    console.error('Create purchase bill error:', err);
    res.status(500).json({ success: false, error: 'Failed to record purchase bill' });
  } finally {
    connection.release();
  }
};

// List purchase bills
exports.list = async (req, res) => {
  try {
    const { from_date, to_date, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];

    if (from_date) { where += ' AND p.purchase_date >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND p.purchase_date <= ?'; params.push(to_date); }

    const [rows] = await pool.query(
      `SELECT p.*, v.name as vendor_name
       FROM v2_purchases p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       WHERE ${where}
       ORDER BY p.purchase_date DESC, p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM v2_purchases p WHERE ${where}`, params);

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRows[0].total }
    });
  } catch (err) {
    console.error('List purchases error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get details of a single purchase bill
exports.getDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const [header] = await pool.query(
      `SELECT p.*, v.name as vendor_name, v.mobile as vendor_mobile, v.email as vendor_email
       FROM v2_purchases p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       WHERE p.id = ?`,
      [id]
    );

    if (!header.length) return res.status(404).json({ success: false, error: 'Purchase bill not found' });

    const [items] = await pool.query(
      `SELECT pi.*, inv.product_name, inv.unit
       FROM v2_purchase_items pi
       LEFT JOIN inventory inv ON pi.item_id = inv.id
       WHERE pi.purchase_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...header[0],
        items
      }
    });
  } catch (err) {
    console.error('Purchase detail error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

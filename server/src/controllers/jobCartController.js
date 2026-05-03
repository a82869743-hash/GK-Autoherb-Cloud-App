const pool = require('../config/db');
const cloudinary = require('../config/cloudinary');
const { generateInvoicePDF } = require('../services/invoiceService');

// ─── VEHICLE LOOKUP ─────────────────────────
exports.lookup = async (req, res) => {
  try {
    const { regNo } = req.params;
    const [vehicles] = await pool.query(
      `SELECT v.*, u.id AS customer_id, u.name AS customer_name, u.mobile AS customer_mobile, u.email AS customer_email
       FROM vehicles v JOIN users u ON v.customer_id = u.id
       WHERE v.registration_no = ?`,
      [regNo.toUpperCase().replace(/\s/g, '')]
    );
    if (!vehicles.length) return res.status(404).json({ success: false, error: 'Vehicle not found' });

    const vehicle = vehicles[0];
    const [visitRows] = await pool.query(
      'SELECT COALESCE(MAX(visit_number), 0) AS max_visit FROM job_carts WHERE vehicle_id = ?',
      [vehicle.id]
    );
    res.json({
      success: true,
      data: {
        found: true,
        vehicle: { id: vehicle.id, registration_no: vehicle.registration_no, brand: vehicle.brand, model: vehicle.model, customer_id: vehicle.customer_id },
        customer: { id: vehicle.customer_id, name: vehicle.customer_name, mobile: vehicle.customer_mobile, email: vehicle.customer_email },
        visit_count: visitRows[0].max_visit,
        next_visit_number: visitRows[0].max_visit + 1,
      },
    });
  } catch (err) {
    console.error('Lookup error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CREATE JOB CART ────────────────────────
exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { registration_no, customer_id, customer_name, customer_mobile, customer_email, car_brand, car_model, visit_date, notes, booking_id } = req.body;
    const regNo = (registration_no || '').toUpperCase().replace(/\s/g, '');

    if (!regNo || !car_brand || !car_model) {
      return res.status(400).json({ success: false, error: 'Registration number, brand, and model are required' });
    }

    let vehicleId, custId = customer_id;

    // Check if vehicle exists
    const [existingVehicle] = await conn.query('SELECT id, customer_id FROM vehicles WHERE registration_no = ?', [regNo]);

    if (existingVehicle.length) {
      vehicleId = existingVehicle[0].id;
      custId = existingVehicle[0].customer_id;
    } else {
      // Need customer — find or create
      if (!custId && customer_mobile) {
        const [existingUser] = await conn.query('SELECT id FROM users WHERE mobile = ? AND role = ?', [customer_mobile, 'customer']);
        if (existingUser.length) {
          custId = existingUser[0].id;
        } else {
          // Create customer
          const bcrypt = require('bcryptjs');
          const password = customer_mobile.slice(-4) + 'GKA';
          const hash = await bcrypt.hash(password, 10);
          const [newUser] = await conn.query(
            'INSERT INTO users (name, mobile, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [customer_name || 'Customer', customer_mobile, customer_email || null, hash, 'customer']
          );
          custId = newUser.insertId;
          // Create loyalty record
          await conn.query('INSERT INTO loyalty (customer_id) VALUES (?)', [custId]);
        }
      }
      if (!custId) return res.status(400).json({ success: false, error: 'Customer information required for new vehicle' });

      // Create vehicle
      const [newVehicle] = await conn.query(
        'INSERT INTO vehicles (registration_no, customer_id, brand, model) VALUES (?, ?, ?, ?)',
        [regNo, custId, car_brand, car_model]
      );
      vehicleId = newVehicle.insertId;
    }

    // Calculate visit number
    const [visitRows] = await conn.query(
      'SELECT COALESCE(MAX(visit_number), 0) + 1 AS next_visit FROM job_carts WHERE vehicle_id = ?',
      [vehicleId]
    );

    const [result] = await conn.query(
      'INSERT INTO job_carts (vehicle_id, visit_date, visit_number, status, notes, created_by, booking_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [vehicleId, visit_date || new Date(), visitRows[0].next_visit, 'draft', notes || null, req.user.id, booking_id || null]
    );

    // Update booking status if converted from slot
    if (booking_id) {
      await conn.query("UPDATE bookings SET status = 'completed' WHERE id = ?", [booking_id]);
    }

    await conn.commit();

    const jobCartId = result.insertId;

    // SMS moved to completion step

    res.status(201).json({ success: true, data: { id: jobCartId }, message: 'Job cart created' });
  } catch (err) {
    await conn.rollback();
    console.error('Create job cart error:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'Duplicate entry' });
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── LIST JOB CARTS ─────────────────────────
exports.list = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20, from_date, to_date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];

    // Role-based filtering
    if (req.user.role === 'customer') {
      where += ' AND v.customer_id = ?';
      params.push(req.user.id);
    }
    if (status && status !== 'all') {
      where += ' AND jc.status = ?';
      params.push(status);
    } else {
      where += " AND jc.status != 'cancelled'";
    }
    if (from_date) {
      where += ' AND jc.visit_date >= ?';
      params.push(from_date);
    }
    if (to_date) {
      where += ' AND jc.visit_date <= ?';
      params.push(to_date);
    }
    if (search) {
      where += ' AND (v.registration_no LIKE ? OR u.name LIKE ? OR v.brand LIKE ? OR v.model LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const countQuery = `SELECT COUNT(*) AS total FROM job_carts jc JOIN vehicles v ON jc.vehicle_id = v.id JOIN users u ON v.customer_id = u.id WHERE ${where}`;
    const [countRows] = await pool.query(countQuery, params);

    const dataQuery = `
      SELECT jc.id, jc.visit_date, jc.visit_number, jc.status, jc.notes, jc.created_at, jc.completed_at, jc.invoice_number,
             v.registration_no, v.brand, v.model,
             u.name AS customer_name, u.mobile AS customer_mobile,
             (SELECT COUNT(*) FROM job_services WHERE job_cart_id = jc.id) AS services_count,
             (SELECT COALESCE(SUM(js.service_price + js.labor_charges), 0)
              + COALESCE((SELECT SUM(jp.quantity * jp.unit_cost) FROM job_products jp JOIN job_services js2 ON jp.job_service_id = js2.id WHERE js2.job_cart_id = jc.id), 0)
              FROM job_services js WHERE js.job_cart_id = jc.id) AS total_amount
      FROM job_carts jc
      JOIN vehicles v ON jc.vehicle_id = v.id
      JOIN users u ON v.customer_id = u.id
      WHERE ${where}
      ORDER BY jc.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataQuery, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRows[0].total },
    });
  } catch (err) {
    console.error('List job carts error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET ONE JOB CART ───────────────────────
exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const [carts] = await pool.query(`
      SELECT jc.*, v.registration_no, v.brand, v.model, v.customer_id,
             u.name AS customer_name, u.mobile AS customer_mobile, u.email AS customer_email
      FROM job_carts jc
      JOIN vehicles v ON jc.vehicle_id = v.id
      JOIN users u ON v.customer_id = u.id
      WHERE jc.id = ?
    `, [id]);

    if (!carts.length) return res.status(404).json({ success: false, error: 'Job cart not found' });
    const cart = carts[0];

    // Customer can only see own carts
    if (req.user.role === 'customer' && cart.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Fetch services
    const [services] = await pool.query(
      'SELECT * FROM job_services WHERE job_cart_id = ? ORDER BY id',
      [id]
    );

    // Fetch ALL products for this job cart in ONE query (fixes N+1)
    const serviceIds = services.map(s => s.id);
    let allProducts = [];
    if (serviceIds.length > 0) {
      const [prodRows] = await pool.query(`
        SELECT jp.*, inv.product_name, inv.unit
        FROM job_products jp JOIN inventory inv ON jp.product_id = inv.id
        WHERE jp.job_service_id IN (?)
      `, [serviceIds]);
      allProducts = prodRows;
    }

    // Group products by service and calculate subtotals
    for (const svc of services) {
      svc.products = allProducts.filter(p => p.job_service_id === svc.id);
      const prodCost = svc.products.reduce((sum, p) => sum + parseFloat(p.quantity) * parseFloat(p.unit_cost), 0);
      svc.subtotal = parseFloat(svc.service_price) + parseFloat(svc.labor_charges) + prodCost;

      // Staff: hide prices
      if (req.user.role === 'staff') {
        delete svc.service_price;
        delete svc.labor_charges;
        delete svc.subtotal;
        svc.products.forEach(p => { delete p.unit_cost; });
      }
    }

    // Fetch photos
    const [photos] = await pool.query('SELECT * FROM job_photos WHERE job_cart_id = ? ORDER BY uploaded_at', [id]);

    const totalAmount = req.user.role !== 'staff'
      ? services.reduce((sum, s) => sum + (s.subtotal || 0), 0)
      : undefined;

    res.json({
      success: true,
      data: {
        id: cart.id,
        vehicle: { id: cart.vehicle_id, registration_no: cart.registration_no, brand: cart.brand, model: cart.model, customer_id: cart.customer_id },
        visit_date: cart.visit_date,
        visit_number: cart.visit_number,
        status: cart.status,
        notes: cart.notes,
        created_at: cart.created_at,
        completed_at: cart.completed_at,
        invoice_number: cart.invoice_number,
        customer: { id: cart.customer_id, name: cart.customer_name, mobile: cart.customer_mobile, email: cart.customer_email },
        services,
        photos,
        total_amount: totalAmount,
      },
    });
  } catch (err) {
    console.error('Get job cart error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── UPDATE JOB CART ────────────────────────
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { visit_date, notes, discount_type, discount_value, invoice_notes } = req.body;

    const [cart] = await pool.query('SELECT status FROM job_carts WHERE id = ?', [id]);
    if (!cart.length) return res.status(404).json({ success: false, error: 'Not found' });
    if (cart[0].status === 'complete') return res.status(422).json({ success: false, error: 'Cannot edit completed job cart' });

    await pool.query(
      'UPDATE job_carts SET visit_date = ?, notes = ?, discount_type = ?, discount_value = ?, invoice_notes = ? WHERE id = ?', 
      [visit_date, notes, discount_type || null, discount_value || null, invoice_notes || null, id]
    );
    res.json({ success: true, message: 'Job cart updated' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── SUBMIT (draft → open) ──────────────────
exports.submit = async (req, res) => {
  try {
    const { id } = req.params;
    const [cart] = await pool.query('SELECT status FROM job_carts WHERE id = ?', [id]);
    if (!cart.length) return res.status(404).json({ success: false, error: 'Not found' });
    if (cart[0].status !== 'draft') return res.status(422).json({ success: false, error: 'Only draft carts can be submitted' });

    await pool.query("UPDATE job_carts SET status = 'open' WHERE id = ?", [id]);
    res.json({ success: true, message: 'Job cart submitted' });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── COMPLETE (open → complete) ─────────────
exports.complete = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { credits_awarded = 0, free_washes_awarded = 0, wax_awarded = 0 } = req.body;

    // 1. Check status is 'open'
    const [cart] = await conn.query(
      `SELECT jc.*, v.customer_id FROM job_carts jc JOIN vehicles v ON jc.vehicle_id = v.id WHERE jc.id = ?`,
      [id]
    );
    if (!cart.length) { await conn.rollback(); return res.status(404).json({ success: false, error: 'Not found' }); }
    if (cart[0].status !== 'open') { await conn.rollback(); return res.status(422).json({ success: false, error: 'Only open carts can be completed' }); }

    const customerId = cart[0].customer_id;

    // 2. Set complete
    await conn.query("UPDATE job_carts SET status = 'complete', completed_at = NOW() WHERE id = ?", [id]);

    // 3. Deduct inventory
    const [services] = await conn.query('SELECT id FROM job_services WHERE job_cart_id = ?', [id]);
    for (const svc of services) {
      const [products] = await conn.query('SELECT product_id, quantity FROM job_products WHERE job_service_id = ?', [svc.id]);
      for (const prod of products) {
        await conn.query('UPDATE inventory SET quantity = quantity - ? WHERE id = ?', [prod.quantity, prod.product_id]);
      }
    }

    // 4. Award loyalty
    if (credits_awarded > 0 || free_washes_awarded > 0 || wax_awarded > 0) {
      await conn.query(
        `INSERT INTO loyalty (customer_id, credits, free_washes, wax_count)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           credits = credits + VALUES(credits),
           free_washes = free_washes + VALUES(free_washes),
           wax_count = wax_count + VALUES(wax_count)`,
        [customerId, credits_awarded, free_washes_awarded, wax_awarded]
      );
    }

    // 5. Calculate total and create transaction
    const [totalRows] = await conn.query(`
      SELECT COALESCE(SUM(js.service_price + js.labor_charges), 0) AS svc_total
      FROM job_services js WHERE js.job_cart_id = ?
    `, [id]);
    const [prodTotal] = await conn.query(`
      SELECT COALESCE(SUM(jp.quantity * jp.unit_cost), 0) AS prod_total
      FROM job_products jp JOIN job_services js ON jp.job_service_id = js.id
      WHERE js.job_cart_id = ?
    `, [id]);
    let grandTotal = parseFloat(totalRows[0].svc_total) + parseFloat(prodTotal[0].prod_total);

    let discountAmt = 0;
    if (cart[0].discount_type === 'percentage') {
      discountAmt = grandTotal * (parseFloat(cart[0].discount_value || 0) / 100);
    } else if (cart[0].discount_type === 'fixed') {
      discountAmt = parseFloat(cart[0].discount_value || 0);
    }
    grandTotal = Math.max(0, grandTotal - discountAmt);

    // 6. Create transaction
    await conn.query(
      'INSERT INTO transactions (type, reference_id, amount, direction, note, transaction_date, created_by) VALUES (?, ?, ?, ?, ?, CURDATE(), ?)',
      ['job_revenue', id, grandTotal, 'in', `Job Cart #${id} completed`, req.user.id]
    );

    // 7. Generate invoice number (atomic — lock row to prevent race condition)
    const [settingsRows] = await conn.query("SELECT value FROM settings WHERE key_name = 'invoice_prefix'");
    const [counterRows] = await conn.query("SELECT value FROM settings WHERE key_name = 'invoice_counter' FOR UPDATE");
    const prefix = settingsRows[0]?.value || 'GKA';
    const counter = parseInt(counterRows[0]?.value || '1000', 10);
    const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${counter}`;

    await conn.query("UPDATE settings SET value = CAST(CAST(value AS UNSIGNED) + 1 AS CHAR) WHERE key_name = 'invoice_counter'");
    await conn.query('UPDATE job_carts SET invoice_number = ? WHERE id = ?', [invoiceNumber, id]);

    await conn.commit();

    // 8. Async WhatsApp + SMS (non-blocking — never fail completion for this)
    try {
      const messagingService = require('../services/messagingService');
      const sendSms = require('../utils/sendSms');
      const [custInfo] = await pool.query(
        `SELECT u.name, u.mobile, v.brand, v.model, v.registration_no
         FROM users u JOIN vehicles v ON v.customer_id = u.id
         JOIN job_carts jc ON jc.vehicle_id = v.id
         WHERE jc.id = ?`, [id]
      );
      if (custInfo.length) {
        const c = custInfo[0];
        const [svcs] = await pool.query('SELECT service_name FROM job_services WHERE job_cart_id = ?', [id]);
        const serviceList = svcs.map(s => s.service_name).join(', ');
        const messageBody = `Dear ${c.name}, your ${c.brand} ${c.model} (${c.registration_no}) service is complete at GK AutoHerb! Services: ${serviceList}. Total: Rs.${grandTotal}. Thank you!`;
        
        // Fire-and-forget WhatsApp (existing custom template)
        messagingService.sendWhatsApp(`91${c.mobile}`, 'job_complete', { body: messageBody }).catch(() => {});
        
        // Fire-and-forget 2Factor SMS (strictly matches DLT template: GK AutoHerb: Your job card #VAR1# is ready...)
        sendSms(c.mobile, id).catch(() => {});
        
        // Log to messages_log
        const baseUrl = process.env.APP_BASE_URL || 'https://gkautobook.cloud';
        const smsPreview = `GK AutoHerb: Your job card ${id} is ready. Track here ${baseUrl}/job/${id}`;
        
        pool.query(
          `INSERT INTO messages_log (customer_id, mobile, type, channel, status, message_preview) VALUES (?, ?, 'job_complete', 'sms', 'sent', ?)`,
          [customerId, c.mobile, smsPreview]
        ).catch(() => {});
      }
    } catch (msgErr) {
      console.error('Messaging after completion failed (non-blocking):', msgErr.message);
    }

    res.json({
      success: true,
      message: 'Job cart completed',
      data: { id: parseInt(id), status: 'complete', invoice_number: invoiceNumber, total_amount: grandTotal },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Complete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── ADD SERVICE ────────────────────────────
exports.addService = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { service_name, service_price = 0, labor_charges = 0, products = [] } = req.body;

    if (!service_name) return res.status(400).json({ success: false, error: 'Service name is required' });

    const [cart] = await conn.query('SELECT status FROM job_carts WHERE id = ?', [id]);
    if (!cart.length) { await conn.rollback(); return res.status(404).json({ success: false, error: 'Not found' }); }
    if (cart[0].status === 'complete') { await conn.rollback(); return res.status(422).json({ success: false, error: 'Cannot modify completed cart' }); }

    const [svcResult] = await conn.query(
      'INSERT INTO job_services (job_cart_id, service_name, service_price, labor_charges) VALUES (?, ?, ?, ?)',
      [id, service_name, service_price, labor_charges]
    );
    const serviceId = svcResult.insertId;

    for (const prod of products) {
      if (!prod.product_id || !prod.quantity) continue;
      await conn.query(
        'INSERT INTO job_products (job_service_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)',
        [serviceId, prod.product_id, prod.quantity, prod.unit_cost || 0]
      );
    }

    await conn.commit();
    res.status(201).json({ success: true, data: { id: serviceId }, message: 'Service added' });
  } catch (err) {
    await conn.rollback();
    console.error('Add service error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── UPDATE SERVICE ─────────────────────────
exports.updateService = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id, sid } = req.params;
    const { service_name, service_price, labor_charges, products = [] } = req.body;

    const [cart] = await conn.query('SELECT status FROM job_carts WHERE id = ?', [id]);
    if (!cart.length) { await conn.rollback(); return res.status(404).json({ success: false, error: 'Cart not found' }); }
    if (cart[0].status === 'complete') { await conn.rollback(); return res.status(422).json({ success: false, error: 'Cannot modify completed cart' }); }

    await conn.query(
      'UPDATE job_services SET service_name = ?, service_price = ?, labor_charges = ? WHERE id = ? AND job_cart_id = ?',
      [service_name, service_price, labor_charges, sid, id]
    );

    // Replace products
    await conn.query('DELETE FROM job_products WHERE job_service_id = ?', [sid]);
    for (const prod of products) {
      if (!prod.product_id || !prod.quantity) continue;
      await conn.query(
        'INSERT INTO job_products (job_service_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)',
        [sid, prod.product_id, prod.quantity, prod.unit_cost || 0]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Service updated' });
  } catch (err) {
    await conn.rollback();
    console.error('Update service error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── DELETE SERVICE ─────────────────────────
exports.deleteService = async (req, res) => {
  try {
    const { id, sid } = req.params;
    const [cart] = await pool.query('SELECT status FROM job_carts WHERE id = ?', [id]);
    if (!cart.length) return res.status(404).json({ success: false, error: 'Not found' });
    if (cart[0].status === 'complete') return res.status(422).json({ success: false, error: 'Cannot modify completed cart' });

    await pool.query('DELETE FROM job_services WHERE id = ? AND job_cart_id = ?', [sid, id]);
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) {
    console.error('Delete service error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── UPLOAD PHOTO ───────────────────────────
exports.uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const photoType = req.body.type || 'before';

    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `gk-autoherb/job-photos/${id}`, resource_type: 'image' },
        (err, result) => { if (err) reject(err); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });

    const [insertResult] = await pool.query(
      'INSERT INTO job_photos (job_cart_id, type, url, public_id) VALUES (?, ?, ?, ?)',
      [id, photoType, result.secure_url, result.public_id]
    );

    res.status(201).json({
      success: true,
      data: { id: insertResult.insertId, url: result.secure_url, type: photoType, public_id: result.public_id },
    });
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── DELETE PHOTO ───────────────────────────
exports.deletePhoto = async (req, res) => {
  try {
    const { pid } = req.params;
    const [photos] = await pool.query('SELECT * FROM job_photos WHERE id = ?', [pid]);
    if (!photos.length) return res.status(404).json({ success: false, error: 'Photo not found' });

    if (photos[0].public_id) {
      await cloudinary.uploader.destroy(photos[0].public_id).catch(() => {});
    }
    await pool.query('DELETE FROM job_photos WHERE id = ?', [pid]);
    res.json({ success: true, message: 'Photo deleted' });
  } catch (err) {
    console.error('Delete photo error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET INVOICE PDF ────────────────────────
exports.getInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const [cart] = await pool.query(
      `SELECT jc.status, v.customer_id FROM job_carts jc JOIN vehicles v ON jc.vehicle_id = v.id WHERE jc.id = ?`,
      [id]
    );
    if (!cart.length) return res.status(404).json({ success: false, error: 'Not found' });
    if (cart[0].status !== 'complete') return res.status(422).json({ success: false, error: 'Invoice available only for completed carts' });

    // Customer can only download own
    if (req.user.role === 'customer' && cart[0].customer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { pdfBuffer, invoiceNumber } = await generateInvoicePDF(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Invoice error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── SOFT DELETE (CANCEL) JOB CART ──────────────
exports.softDelete = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE job_carts SET status = 'cancelled' WHERE id = ?", [id]);
    res.json({ success: true, message: 'Job cart cancelled' });
  } catch (err) {
    console.error('Job cart soft-delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── RESTORE CANCELLED JOB CART ─────────────────
exports.restore = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE job_carts SET status = 'open' WHERE id = ?", [id]);
    res.json({ success: true, message: 'Job cart restored' });
  } catch (err) {
    console.error('Job cart restore error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

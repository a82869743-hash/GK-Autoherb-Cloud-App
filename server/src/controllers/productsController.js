const pool = require('../config/db');
const crypto = require('crypto');
const Razorpay = require('razorpay');

let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// ─── LIST ORDERS (ADMIN) ───────────────────────────
exports.listOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];

    if (status) {
      where += ' AND po.payment_status = ?';
      params.push(status);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM product_orders po WHERE ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT po.*, 
              u.name AS customer_name, u.mobile AS customer_mobile, u.email AS customer_email,
              i.product_name, i.sku, i.brand, i.category
       FROM product_orders po
       JOIN users u ON po.customer_id = u.id
       JOIN inventory i ON po.product_id = i.id
       WHERE ${where}
       ORDER BY po.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countRows[0].total
      }
    });
  } catch (err) {
    console.error('listOrders error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── LIST MY ORDERS (CUSTOMER) ───────────────────────
exports.listMyOrders = async (req, res) => {
  try {
    const customerId = req.user.id;
    const [rows] = await pool.query(
      `SELECT po.*, i.product_name, i.sku, i.brand, i.category
       FROM product_orders po
       JOIN inventory i ON po.product_id = i.id
       WHERE po.customer_id = ?
       ORDER BY po.created_at DESC`,
      [customerId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listMyOrders error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CREATE ORDER ──────────────────────────────────
exports.createOrder = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { product_id, quantity = 1, payment_method, qr_transaction_id } = req.body;
    const customerId = req.user.id;

    if (!product_id || !payment_method) {
      return res.status(400).json({ success: false, error: 'Product ID and payment method are required' });
    }

    if (!['razorpay', 'qr'].includes(payment_method)) {
      return res.status(400).json({ success: false, error: 'Invalid payment method' });
    }

    await conn.beginTransaction();

    // Fetch product details to get unit price and stock
    const [products] = await conn.query(
      'SELECT id, product_name, selling_price, quantity FROM inventory WHERE id = ? AND is_deleted = 0',
      [product_id]
    );

    if (!products.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const product = products[0];
    const unitPrice = parseFloat(product.selling_price) || 0;
    const totalAmount = unitPrice * quantity;

    if (parseFloat(product.quantity) < quantity) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient stock available' });
    }

    let razorpayOrder = null;
    let orderId = null;

    if (payment_method === 'razorpay') {
      const calculatedAmount = Math.round(totalAmount * 100); // in paise
      if (razorpayInstance) {
        const options = {
          amount: calculatedAmount,
          currency: 'INR',
          receipt: `prod_order_${Date.now()}`
        };
        razorpayOrder = await razorpayInstance.orders.create(options);
      } else {
        console.warn('[RAZORPAY MOCK MODE] Creating simulated order for product purchase');
        razorpayOrder = {
          id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          amount: calculatedAmount,
          currency: 'INR',
          receipt: `prod_order_mock_${Date.now()}`
        };
      }

      // Insert product order as pending
      const [oResult] = await conn.query(
        `INSERT INTO product_orders 
         (customer_id, product_id, quantity, unit_price, total_amount, payment_method, payment_status, razorpay_order_id)
         VALUES (?, ?, ?, ?, ?, 'razorpay', 'pending', ?)`,
        [customerId, product_id, quantity, unitPrice, totalAmount, razorpayOrder.id]
      );
      orderId = oResult.insertId;

      // Insert into v2_payments
      await conn.query(
        `INSERT INTO v2_payments 
         (customer_id, product_id, amount, payment_method, status, razorpay_order_id, notes)
         VALUES (?, ?, ?, 'razorpay', 'pending', ?, ?)`,
        [customerId, product_id, totalAmount, razorpayOrder.id, JSON.stringify({ product_order_id: orderId, quantity })]
      );

      await conn.commit();
      return res.json({
        success: true,
        order_id: orderId,
        payment_method: 'razorpay',
        razorpay_order: razorpayOrder
      });

    } else {
      // QR payment confirmation
      if (!qr_transaction_id) {
        await conn.rollback();
        return res.status(400).json({ success: false, error: 'QR Transaction ID is required for QR payments' });
      }

      // Insert product order as pending
      const [oResult] = await conn.query(
        `INSERT INTO product_orders 
         (customer_id, product_id, quantity, unit_price, total_amount, payment_method, payment_status, qr_transaction_id)
         VALUES (?, ?, ?, ?, ?, 'qr', 'pending', ?)`,
        [customerId, product_id, quantity, unitPrice, totalAmount, qr_transaction_id]
      );
      orderId = oResult.insertId;

      // Insert into v2_payments
      await conn.query(
        `INSERT INTO v2_payments 
         (customer_id, product_id, amount, payment_method, status, notes)
         VALUES (?, ?, ?, 'qr', 'pending', ?)`,
        [customerId, product_id, totalAmount, JSON.stringify({ product_order_id: orderId, quantity, qr_transaction_id })]
      );

      await conn.commit();
      return res.json({
        success: true,
        order_id: orderId,
        payment_method: 'qr',
        message: 'QR Payment order created and pending verification'
      });
    }

  } catch (err) {
    await conn.rollback();
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── VERIFY RAZORPAY PAYMENT ────────────────────────
exports.verifyPayment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment details' });
    }

    await conn.beginTransaction();

    // Fetch the pending order
    const [orders] = await conn.query(
      'SELECT * FROM product_orders WHERE razorpay_order_id = ? AND payment_status = ? FOR UPDATE',
      [razorpay_order_id, 'pending']
    );

    if (!orders.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Order not found or already verified' });
    }

    const order = orders[0];

    // Verification check
    let signatureIsValid = false;
    if (razorpay_order_id.startsWith('order_mock_') || !razorpayInstance) {
      signatureIsValid = true;
    } else {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');
      signatureIsValid = (expectedSignature === razorpay_signature);
    }

    if (!signatureIsValid) {
      // Mark order as failed
      await conn.query('UPDATE product_orders SET payment_status = ? WHERE id = ?', ['failed', order.id]);
      await conn.query('UPDATE v2_payments SET status = ? WHERE razorpay_order_id = ?', ['failed', razorpay_order_id]);
      await conn.commit();
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    // Update order status to completed
    await conn.query(
      `UPDATE product_orders 
       SET payment_status = 'completed', razorpay_payment_id = ?, razorpay_signature = ? 
       WHERE id = ?`,
      [razorpay_payment_id, razorpay_signature, order.id]
    );

    // Update v2_payments
    await conn.query(
      `UPDATE v2_payments 
       SET status = 'captured', razorpay_payment_id = ?, razorpay_signature = ? 
       WHERE razorpay_order_id = ?`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    // Get the payment ID for transaction log
    const [payments] = await conn.query('SELECT id FROM v2_payments WHERE razorpay_order_id = ?', [razorpay_order_id]);
    if (payments.length) {
      await conn.query(
        `INSERT INTO v2_payment_transactions 
         (payment_id, transaction_type, amount, status) 
         VALUES (?, 'credit', ?, 'success')`,
        [payments[0].id, order.total_amount]
      );
    }

    // Deduct stock quantity in inventory
    await conn.query(
      'UPDATE inventory SET quantity = quantity - ? WHERE id = ?',
      [order.quantity, order.product_id]
    );

    // Log Buy & Sell record as complete
    await conn.query(
      `INSERT INTO buy_sell (type, party_name, party_mobile, product_id, product_name, quantity, unit_price, total_amount, note, status, transaction_date, created_by)
       SELECT 'sell_b2c', u.name, u.mobile, i.id, i.product_name, ?, ?, ?, 'B2C product purchase via customer portal (Razorpay)', 'complete', CURDATE(), u.id
       FROM users u, inventory i
       WHERE u.id = ? AND i.id = ?`,
      [order.quantity, order.unit_price, order.total_amount, order.customer_id, order.product_id]
    );

    await conn.commit();
    res.json({ success: true, message: 'Payment verified and order completed' });

  } catch (err) {
    await conn.rollback();
    console.error('verifyPayment error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── CONFIRM QR PAYMENT (ADMIN) ───────────────────────
exports.confirmQrOrder = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    await conn.beginTransaction();

    const [orders] = await conn.query(
      'SELECT * FROM product_orders WHERE id = ? AND payment_status = ? FOR UPDATE',
      [id, 'pending']
    );

    if (!orders.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Pending product order not found' });
    }

    const order = orders[0];

    // Check inventory stock
    const [products] = await conn.query('SELECT quantity FROM inventory WHERE id = ?', [order.product_id]);
    if (!products.length || parseFloat(products[0].quantity) < order.quantity) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient stock in inventory to fulfill this order' });
    }

    // Update order status
    await conn.query(
      `UPDATE product_orders SET payment_status = 'completed' WHERE id = ?`,
      [id]
    );

    // Update v2_payments status to captured
    const [payments] = await conn.query(
      `SELECT id FROM v2_payments 
       WHERE customer_id = ? AND product_id = ? AND status = 'pending' AND payment_method = 'qr' 
       ORDER BY created_at DESC LIMIT 1`,
      [order.customer_id, order.product_id]
    );

    if (payments.length) {
      const paymentId = payments[0].id;
      await conn.query(
        `UPDATE v2_payments SET status = 'captured' WHERE id = ?`,
        [paymentId]
      );

      // Log transaction
      await conn.query(
        `INSERT INTO v2_payment_transactions 
         (payment_id, transaction_type, amount, status) 
         VALUES (?, 'credit', ?, 'success')`,
        [paymentId, order.total_amount]
      );
    }

    // Deduct stock quantity in inventory
    await conn.query(
      'UPDATE inventory SET quantity = quantity - ? WHERE id = ?',
      [order.quantity, order.product_id]
    );

    // Log Buy & Sell record as complete
    await conn.query(
      `INSERT INTO buy_sell (type, party_name, party_mobile, product_id, product_name, quantity, unit_price, total_amount, note, status, transaction_date, created_by)
       SELECT 'sell_b2c', u.name, u.mobile, i.id, i.product_name, ?, ?, ?, 'B2C product purchase via customer portal (QR Confirmed)', 'complete', CURDATE(), ?
       FROM users u, inventory i
       WHERE u.id = ? AND i.id = ?`,
      [order.quantity, order.unit_price, order.total_amount, req.user.id, order.customer_id, order.product_id]
    );

    await conn.commit();
    res.json({ success: true, message: 'QR payment confirmed and stock deducted successfully' });

  } catch (err) {
    await conn.rollback();
    console.error('confirmQrOrder error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── LIST CUSTOMER PRODUCTS ────────────────────────
exports.listCustomerProducts = async (req, res) => {
  try {
    let rows;
    try {
      // Return 1:1 distinct product rows without arbitrary GROUP BY aggregation
      [rows] = await pool.query(
        `SELECT id, product_name, unit, quantity, low_stock_threshold,
                sku, barcode, category, sub_category, brand, vehicle_compatibility, variant,
                cost_price, selling_price, discount_pct, gst_pct,
                supplier, purchase_date, purchase_invoice_no, warehouse_location,
                warranty, serial_number, expiry_date, status, description,
                CAST(images_json AS CHAR(2000)) as images_json
         FROM inventory 
         WHERE is_deleted = 0 AND status = 'active'
         ORDER BY product_name ASC, id DESC`
      );
    } catch (statusErr) {
      // status column may not exist — fallback without it
      console.warn('status column not found in inventory, querying without it:', statusErr.message);
      [rows] = await pool.query(
        `SELECT id, product_name, unit, quantity, low_stock_threshold,
                sku, barcode, category, sub_category, brand, vehicle_compatibility, variant,
                cost_price, selling_price, discount_pct, gst_pct,
                supplier, purchase_date, purchase_invoice_no, warehouse_location,
                warranty, serial_number, expiry_date, description,
                CAST(images_json AS CHAR(2000)) as images_json
         FROM inventory 
         WHERE is_deleted = 0
         ORDER BY product_name ASC, id DESC`
      );
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listCustomerProducts error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

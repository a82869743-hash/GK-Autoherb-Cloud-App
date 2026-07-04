const pool = require('../config/db');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const messagingService = require('../services/messagingService');

let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ... skipped Razorpay logic, adding it below

// ─── Razorpay Order Creation ───────────────────────
exports.createRazorpayOrder = async (req, res) => {
  try {
    if (!razorpayInstance) {
      return res.status(500).json({ success: false, error: 'Razorpay is not configured on the server' });
    }

    const { amount, currency = 'INR', receipt } = req.body;
    if (!amount) return res.status(400).json({ success: false, error: 'Amount is required' });

    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
      currency,
      receipt: receipt || `receipt_${Date.now()}`
    };

    const order = await razorpayInstance.orders.create(options);
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('createRazorpayOrder error:', error);
    res.status(500).json({ success: false, error: 'Failed to create Razorpay order' });
  }
};

// ─── Razorpay Verification ─────────────────────────
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment details' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('verifyRazorpayPayment error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
};

// ─── Get wallet balance ────────────────────────────
exports.getWalletBalance = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const [rows] = await pool.query('SELECT balance FROM wallets WHERE customer_id = ?', [customer_id]);
    const balance = rows.length ? parseFloat(rows[0].balance) : 0;
    res.json({ success: true, data: { balance } });
  } catch (error) {
    console.error('getWalletBalance error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wallet balance' });
  }
};

// ─── Get all payments with filters ──────────────────
exports.getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, method, from, to, customer_id } = req.query;
    const offset = (page - 1) * limit;
    let where = ['1=1'];
    const params = [];

    if (status) { where.push('p.payment_status = ?'); params.push(status); }
    if (method) { where.push('p.payment_method = ?'); params.push(method); }
    if (customer_id) { where.push('p.customer_id = ?'); params.push(customer_id); }
    if (from) { where.push('p.created_at >= ?'); params.push(from); }
    if (to) { where.push('p.created_at <= ?'); params.push(`${to} 23:59:59`); }

    const countSql = `SELECT COUNT(*) as total FROM payments p WHERE ${where.join(' AND ')}`;
    const [countRows] = await pool.query(countSql, params);

    const sql = `
      SELECT p.*, u.name as customer_name, u.mobile as customer_mobile
      FROM payments p
      LEFT JOIN users u ON u.id = p.customer_id
      WHERE ${where.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(sql, [...params, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRows[0].total }
    });
  } catch (err) {
    console.error('getPayments error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
};

// ─── Create payment ─────────────────────────────────
exports.createPayment = async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const { customer_id, job_cart_id, booking_id, amount, wallet_spend, payment_type, payment_method, transaction_ref, notes } = req.body;
    
    let finalAmount = parseFloat(amount) || 0;
    let walletDeducted = parseFloat(wallet_spend) || 0;

    if (finalAmount <= 0 && walletDeducted <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Valid amount or wallet spend is required' });
    }

    // Process Wallet Spend if requested
    if (walletDeducted > 0 && customer_id) {
      const [wallet] = await connection.query('SELECT id, balance FROM wallets WHERE customer_id = ? FOR UPDATE', [customer_id]);
      if (!wallet.length || parseFloat(wallet[0].balance) < walletDeducted) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
      }

      await connection.query(
        'UPDATE wallets SET balance = balance - ?, total_spent = total_spent + ? WHERE id = ?',
        [walletDeducted, walletDeducted, wallet[0].id]
      );
      
      await connection.query(
        `INSERT INTO wallet_transactions (wallet_id, customer_id, amount, type, source, reference_id, description)
         VALUES (?, ?, ?, 'debit', 'payment', ?, 'Used wallet balance for payment')`,
        [wallet[0].id, customer_id, walletDeducted, job_cart_id || booking_id || null]
      );
    }

    let insertId = null;
    if (finalAmount > 0) {
      const [result] = await connection.query(
        `INSERT INTO payments (customer_id, job_cart_id, booking_id, amount, payment_type, payment_method, payment_status, transaction_ref, notes, paid_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, NOW(), ?)`,
        [customer_id, job_cart_id, booking_id, finalAmount, payment_type || 'full', payment_method || 'cash', transaction_ref, notes, req.user.id]
      );
      insertId = result.insertId;
    }
    
    if (walletDeducted > 0) {
      const [walletResult] = await connection.query(
        `INSERT INTO payments (customer_id, job_cart_id, booking_id, amount, payment_type, payment_method, payment_status, notes, paid_at, created_by)
         VALUES (?, ?, ?, ?, ?, 'wallet', 'completed', ?, NOW(), ?)`,
        [customer_id, job_cart_id, booking_id, walletDeducted, payment_type || 'full', 'Wallet deduction applied', req.user.id]
      );
      if (!insertId) insertId = walletResult.insertId;
    }

    // Update job_cart payment status if linked
    if (job_cart_id) {
      const [jcRows] = await connection.query('SELECT total_amount, advance_paid FROM job_carts WHERE id = ? FOR UPDATE', [job_cart_id]);
      if (jcRows.length) {
        const jc = jcRows[0];
        const totalPaid = parseFloat(jc.advance_paid || 0) + finalAmount + walletDeducted;
        const balanceDue = Math.max(0, parseFloat(jc.total_amount || 0) - totalPaid);
        const paymentStatus = balanceDue <= 0 ? 'paid' : 'partial';
        await connection.query(
          'UPDATE job_carts SET payment_status = ?, advance_paid = ?, balance_due = ? WHERE id = ?',
          [paymentStatus, totalPaid, balanceDue, job_cart_id]
        );
      }
    }

    // Send WhatsApp receipt
    if (customer_id && finalAmount > 0) {
      const [uRows] = await connection.query('SELECT name, mobile FROM users WHERE id = ?', [customer_id]);
      if (uRows.length && uRows[0].mobile) {
        const msg = `Dear ${uRows[0].name}, we have received your payment of ₹${finalAmount} via ${payment_method || 'cash'}. Thank you for choosing GK AutoHerb!`;
        messagingService.sendWhatsApp(uRows[0].mobile, msg).catch(console.error);
      }
    }

    await connection.commit();
    res.status(201).json({ success: true, data: { id: insertId, wallet_deducted: walletDeducted }, message: 'Payment recorded' });
  } catch (err) {
    await connection.rollback();
    console.error('createPayment error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create payment' });
  } finally {
    connection.release();
  }
};

// ─── Create advance payment ─────────────────────────
exports.createAdvancePayment = async (req, res) => {
  try {
    const { customer_id, booking_id, job_cart_id, advance_amount, total_amount, payment_method, due_date, notes } = req.body;

    if (!customer_id || !advance_amount) {
      return res.status(400).json({ success: false, error: 'Customer and advance amount required' });
    }

    const balance = (total_amount || 0) - advance_amount;

    const [result] = await pool.query(
      `INSERT INTO advance_payments (customer_id, booking_id, job_cart_id, advance_amount, total_amount, balance_due, payment_method, due_date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id, booking_id, job_cart_id, advance_amount, total_amount || 0, balance, payment_method || 'cash', due_date, notes, req.user.id]
    );

    // Also record as a payment
    await pool.query(
      `INSERT INTO payments (customer_id, booking_id, job_cart_id, amount, payment_type, payment_method, payment_status, notes, paid_at, created_by)
       VALUES (?, ?, ?, ?, 'advance', ?, 'completed', ?, NOW(), ?)`,
      [customer_id, booking_id, job_cart_id, advance_amount, payment_method || 'cash', notes, req.user.id]
    );

    // Send WhatsApp receipt for advance
    const [uRows] = await pool.query('SELECT name, mobile FROM users WHERE id = ?', [customer_id]);
    if (uRows.length && uRows[0].mobile) {
      const msg = `Dear ${uRows[0].name}, we have received your advance payment of ₹${advance_amount} via ${payment_method || 'cash'}. Balance due: ₹${balance}. Thank you for choosing GK AutoHerb!`;
      messagingService.sendWhatsApp(uRows[0].mobile, msg).catch(console.error);
    }

    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Advance payment recorded' });
  } catch (err) {
    console.error('createAdvancePayment error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to record advance payment' });
  }
};

// ─── Get advance payments with balance due ──────────
exports.getAdvancePayments = async (req, res) => {
  try {
    const { status = 'advance_paid' } = req.query;
    const [rows] = await pool.query(`
      SELECT ap.*, u.name as customer_name, u.mobile as customer_mobile
      FROM advance_payments ap
      LEFT JOIN users u ON u.id = ap.customer_id
      WHERE ap.status = ?
      ORDER BY ap.created_at DESC
    `, [status]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getAdvancePayments error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch advance payments' });
  }
};

// ─── Process refund ─────────────────────────────────
exports.createRefund = async (req, res) => {
  try {
    const { payment_id, amount, reason } = req.body;

    const [payment] = await pool.query('SELECT * FROM payments WHERE id = ?', [payment_id]);
    if (!payment.length) return res.status(404).json({ success: false, error: 'Payment not found' });

    if (amount > payment[0].amount) {
      return res.status(400).json({ success: false, error: 'Refund amount exceeds payment amount' });
    }

    const [result] = await pool.query(
      `INSERT INTO refunds (payment_id, customer_id, amount, reason, status) VALUES (?, ?, ?, ?, 'approved')`,
      [payment_id, payment[0].customer_id, amount, reason]
    );

    // Update payment status
    await pool.query('UPDATE payments SET payment_status = ? WHERE id = ?', ['refunded', payment_id]);

    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Refund processed' });
  } catch (err) {
    console.error('createRefund error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to process refund' });
  }
};

// ─── Payment summary stats ──────────────────────────
exports.getPaymentStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN payment_status = 'completed' AND DATE(paid_at) = CURDATE() THEN amount END), 0) as today_collected,
        COALESCE(SUM(CASE WHEN payment_status = 'completed' AND MONTH(paid_at) = MONTH(CURDATE()) AND YEAR(paid_at) = YEAR(CURDATE()) THEN amount END), 0) as month_collected,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount END), 0) as pending_amount,
        COUNT(CASE WHEN payment_status = 'completed' AND DATE(paid_at) = CURDATE() THEN 1 END) as today_count,
        COUNT(CASE WHEN payment_type = 'refund' THEN 1 END) as refund_count
      FROM payments
    `);

    const [advances] = await pool.query(`
      SELECT COALESCE(SUM(balance_due), 0) as total_balance_due, COUNT(*) as pending_count
      FROM advance_payments WHERE status = 'advance_paid'
    `);

    res.json({
      success: true,
      data: { ...stats[0], ...advances[0] }
    });
  } catch (err) {
    console.error('getPaymentStats error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch payment stats' });
  }
};

// ─── Download Invoice PDF ───────────────────────────
const { generatePaymentReceiptPDF } = require('../services/invoiceService');

exports.downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { pdfBuffer, invoiceNumber } = await generatePaymentReceiptPDF(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error('downloadInvoice error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to generate invoice PDF' });
  }
};

// --- Send Advance Payment Due Reminder ----------------
const { sendPaymentReminder } = require('./whatsappController');
exports.sendReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT ap.*, u.name as customer_name, u.mobile as customer_mobile
      FROM advance_payments ap
      LEFT JOIN users u ON u.id = ap.customer_id
      WHERE ap.id = ?
    `, [id]);
    
    if (!rows.length) return res.status(404).json({ success: false, error: 'Advance payment not found' });
    
    const ap = rows[0];
    if (ap.balance_due <= 0) return res.status(400).json({ success: false, error: 'Balance is already cleared' });
    
    const dueDateStr = ap.due_date ? new Date(ap.due_date).toLocaleDateString('en-IN') : 'Soon';
    await sendPaymentReminder(ap.customer_mobile, ap.customer_name, ap.balance_due, dueDateStr);
    
    res.json({ success: true, message: 'Reminder sent successfully' });
  } catch (err) {
    console.error('sendReminder error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send reminder' });
  }
};


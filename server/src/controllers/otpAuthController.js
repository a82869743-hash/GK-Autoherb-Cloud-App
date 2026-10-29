const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const messagingService = require('../services/messagingService');

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 45;

/**
 * Generate cryptographically secure random 6-digit numeric OTP
 */
function generate6DigitOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate standard Auth JWT token
 */
function generateAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      custom_role_id: user.custom_role_id || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ─── 1. SEND OTP (POST /api/auth/otp/send) ─────────────────────
exports.sendOtp = async (req, res) => {
  try {
    const { mobile, purpose = 'login' } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!mobile) {
      return res.status(400).json({ success: false, error: 'Mobile number is required' });
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number' });
    }

    // 1. Rate limiting by IP (max 10 requests per 10 minutes)
    const [ipRows] = await pool.query(
      `SELECT COUNT(*) as ip_count FROM otp_requests
       WHERE ip_address = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
      [ipAddress]
    );
    if (ipRows[0].ip_count >= 10) {
      return res.status(429).json({ success: false, error: 'Too many requests from this network. Please wait a few minutes.' });
    }

    // 2. Cooldown check per mobile (45s cooldown)
    const [recentRows] = await pool.query(
      `SELECT id, created_at FROM otp_requests
       WHERE mobile = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
       ORDER BY created_at DESC LIMIT 1`,
      [cleanMobile, COOLDOWN_SECONDS]
    );
    if (recentRows.length > 0) {
      return res.status(429).json({
        success: false,
        error: `Please wait ${COOLDOWN_SECONDS} seconds before requesting a new OTP.`
      });
    }

    // 3. Generate 6-digit OTP and bcrypt hash
    const rawOtp = generate6DigitOTP();
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 4. Save to otp_requests table
    await pool.query(
      `INSERT INTO otp_requests (mobile, otp_hash, purpose, expires_at, attempts, is_verified, ip_address)
       VALUES (?, ?, ?, ?, 0, 0, ?)`,
      [cleanMobile, otpHash, purpose, expiresAt, ipAddress]
    );

    // 5. Send by SMS through 2Factor's OTP route (works without our own DLT templates — the
    //    custom-text route used before was rejected by 2Factor, so no login code ever arrived)
    const isProd = process.env.NODE_ENV === 'production';
    const hasSmsKey = !!(process.env.TWO_FACTOR_API_KEY || process.env.MSG91_AUTH_KEY);
    const smsSent = await require('../utils/sendOtp')(cleanMobile, rawOtp);
    const smsRes = { success: smsSent };

    // Also over WhatsApp when the Cloud API + an approved authentication template are set up
    let waRes = { success: false };
    try {
      const tpl = await messagingService.getTemplate('OTP_VERIFICATION');
      if (tpl?.provider_template_name) {
        waRes = await require('../services/whatsappProvider').sendAuthOtp(cleanMobile, tpl.provider_template_name, tpl.provider_language, rawOtp);
      }
    } catch (waErr) {
      console.warn('[WA OTP] failed:', waErr.message);
    }

    // Tell the customer if nothing could be sent (instead of "code sent" and a code that never arrives)
    if (hasSmsKey && !smsRes.success && !waRes.success) {
      await pool.query('UPDATE otp_requests SET expires_at = NOW() WHERE mobile = ? AND is_verified = 0 AND expires_at > NOW()', [cleanMobile]);
      console.error(`[OTP] Could not send to ******${cleanMobile.slice(-4)} (SMS and WhatsApp both failed)`);
      return res.status(502).json({ success: false, error: 'Could not send the code right now. Please try again in a minute or log in with your password.' });
    }

    // Never write live OTP codes into production logs
    if (isProd) {
      console.log(`[OTP] Code sent to ******${cleanMobile.slice(-4)} (SMS: ${smsRes.success}, WhatsApp: ${waRes.success})`);
    } else {
      console.log(`[DEV OTP] Verification code for ${cleanMobile}: [${rawOtp}] (SMS: ${smsRes.success}, WhatsApp: ${waRes.success})`);
    }

    // In dev / test mode only, we include rawOtp in debug log
    const responsePayload = {
      success: true,
      message: 'Verification code sent to your mobile number',
      cooldown_seconds: COOLDOWN_SECONDS,
      expires_in_minutes: OTP_EXPIRY_MINUTES
    };

    if (!isProd) {
      responsePayload.dev_hint = 'OTP logged on server terminal for testing';
    }

    res.json(responsePayload);

  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, error: 'Failed to dispatch verification code' });
  }
};

// ─── 2. VERIFY OTP (POST /api/auth/otp/verify) ───────────────────
exports.verifyOtp = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { mobile, otp, name, vehicle_brand, vehicle_model, vehicle_number } = req.body;

    if (!mobile || !otp) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Mobile and OTP are required' });
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp).trim();

    if (cleanOtp.length !== OTP_LENGTH) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Please enter a valid 6-digit code' });
    }

    // 1. Fetch latest active OTP request for this mobile
    const [requests] = await conn.query(
      `SELECT * FROM otp_requests
       WHERE mobile = ? AND is_verified = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [cleanMobile]
    );

    if (!requests.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Verification code has expired or is invalid. Please request a new one.' });
    }

    const otpReq = requests[0];

    // Check attempts limit
    if (otpReq.attempts >= MAX_ATTEMPTS) {
      await conn.query('UPDATE otp_requests SET expires_at = NOW() WHERE id = ?', [otpReq.id]);
      await conn.commit();
      return res.status(429).json({ success: false, error: 'Maximum attempts reached. Please request a new OTP.' });
    }

    // Increment attempts count
    await conn.query('UPDATE otp_requests SET attempts = attempts + 1 WHERE id = ?', [otpReq.id]);

    // Verify bcrypt hash
    const isMatch = await bcrypt.compare(cleanOtp, otpReq.otp_hash);
    if (!isMatch) {
      await conn.commit();
      const remainingAttempts = MAX_ATTEMPTS - (otpReq.attempts + 1);
      return res.status(400).json({
        success: false,
        error: `Incorrect verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Please request a new one.'}`
      });
    }

    // Mark OTP request as verified
    await conn.query('UPDATE otp_requests SET is_verified = 1 WHERE id = ?', [otpReq.id]);

    // 2. Check if customer user exists in users table
    const [existingUsers] = await conn.query(
      'SELECT id, name, mobile, role, custom_role_id, is_active FROM users WHERE mobile = ?',
      [cleanMobile]
    );

    let userRecord = null;
    let isNewCustomer = false;

    if (existingUsers.length > 0) {
      userRecord = existingUsers[0];

      // Security requirement: Ensure staff and admin keep password login
      if (userRecord.role !== 'customer') {
        await conn.rollback();
        return res.status(403).json({
          success: false,
          error: 'Staff and Admin accounts must log in with their secure password credentials.'
        });
      }

      if (userRecord.is_active === 0) {
        await conn.rollback();
        return res.status(403).json({ success: false, error: 'This account has been deactivated. Please contact studio support.' });
      }

    } else {
      // 3. New customer auto-registration flow
      isNewCustomer = true;
      const customerName = name && name.trim() ? name.trim() : `Customer ${cleanMobile.slice(-4)}`;
      const randomPasswordHash = await bcrypt.hash(Math.random().toString(36) + 'GKAuto!@#', 10);
      const referralCode = 'GK' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const [insertUser] = await conn.query(
        `INSERT INTO users (name, mobile, password_hash, role, is_active, referral_code)
         VALUES (?, ?, ?, 'customer', 1, ?)`,
        [customerName, cleanMobile, randomPasswordHash, referralCode]
      );

      const newUserId = insertUser.insertId;

      // Initialize customer loyalty record
      await conn.query(
        'INSERT INTO loyalty (customer_id, credits, free_washes, wax_count) VALUES (?, 0, 0, 0)',
        [newUserId]
      );

      // Register vehicle if details provided
      if (vehicle_number || (vehicle_brand && vehicle_model)) {
        const cleanReg = vehicle_number ? vehicle_number.toUpperCase().replace(/\s/g, '') : `NEW-${newUserId}`;
        await conn.query(
          `INSERT INTO vehicles (customer_id, brand, model, registration_no, is_primary, category)
           VALUES (?, ?, ?, ?, 1, ?)
           ON DUPLICATE KEY UPDATE is_primary = 1`,
          [newUserId, vehicle_brand || 'Generic', vehicle_model || 'Vehicle', cleanReg,
           require('../utils/vehicleCategory').detectVehicleCategory(vehicle_brand, vehicle_model)]
        );
      }

      userRecord = {
        id: newUserId,
        name: customerName,
        mobile: cleanMobile,
        role: 'customer',
        custom_role_id: null
      };

      // Send welcome notification asynchronously
      messagingService.notify(
        newUserId,
        'WELCOME_MESSAGE',
        { customer_name: customerName, referral_code: referralCode }
      ).catch(() => {});
    }

    await conn.commit();

    // 4. Issue JWT Auth Token matching existing auth response shape
    const token = generateAuthToken(userRecord);
    const profile = await require('./customerProfileController').buildProfile(userRecord.id).catch(() => null);

    res.json({
      success: true,
      data: {
        user: {
          id: userRecord.id,
          name: userRecord.name,
          mobile: userRecord.mobile,
          role: userRecord.role,
          custom_role_id: userRecord.custom_role_id || null,
        },
        token,
        is_new_customer: isNewCustomer,
        profile_complete: profile ? profile.profile_complete : false,
      }
    });

  } catch (err) {
    await conn.rollback();
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, error: 'Failed to verify code' });
  } finally {
    conn.release();
  }
};

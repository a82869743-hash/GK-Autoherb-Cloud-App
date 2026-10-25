-- Older live tables can hold zero dates ('0000-00-00') that strict mode refuses to carry through
-- an ALTER, so relax the mode for this file only (no row is changed).
SET @OLD_SQL_MODE_087 = @@SESSION.sql_mode;
SET SESSION sql_mode = '';

-- ═══════════════════════════════════════════════════════════════════
-- 087 — Mobile app features
--   * Customer profile: gender, DOB, anniversary, profile photo
--   * Saved addresses (Blinkit style labels: Home / Work / Other)
--   * Vehicle category stored on the vehicle (drives pricing)
--   * Booking cancel / reschedule tracking + day-before confirmation
--   * Job card pipeline stages + service warranties
--   * Loyalty reward catalogue + redemption vouchers
--   * WhatsApp inbox (auto-bot replies & segregation)
--   * Birthday / anniversary greeting campaigns
-- All statements are idempotent.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Users: profile fields ─────────────────────────────────────────
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'gender');
SET @s = IF(@c = 0, "ALTER TABLE users ADD COLUMN gender ENUM('male','female','other') NULL", 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'date_of_birth');
SET @s = IF(@c = 0, 'ALTER TABLE users ADD COLUMN date_of_birth DATE NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'anniversary_date');
SET @s = IF(@c = 0, 'ALTER TABLE users ADD COLUMN anniversary_date DATE NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_photo_url');
SET @s = IF(@c = 0, 'ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR(500) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'whatsapp_opt_in');
SET @s = IF(@c = 0, 'ALTER TABLE users ADD COLUMN whatsapp_opt_in TINYINT(1) NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ─── Saved addresses: Blinkit-style labels ─────────────────────────
CREATE TABLE IF NOT EXISTS v2_customer_addresses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  address VARCHAR(500) NOT NULL,
  landmark VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  pincode VARCHAR(20) NULL,
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,
  is_default TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v2_customer_addresses' AND COLUMN_NAME = 'label');
SET @s = IF(@c = 0, "ALTER TABLE v2_customer_addresses ADD COLUMN label ENUM('home','work','other') NOT NULL DEFAULT 'home'", 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v2_customer_addresses' AND COLUMN_NAME = 'label_name');
SET @s = IF(@c = 0, 'ALTER TABLE v2_customer_addresses ADD COLUMN label_name VARCHAR(50) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v2_customer_addresses' AND COLUMN_NAME = 'house_no');
SET @s = IF(@c = 0, 'ALTER TABLE v2_customer_addresses ADD COLUMN house_no VARCHAR(120) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v2_customer_addresses' AND COLUMN_NAME = 'area');
SET @s = IF(@c = 0, 'ALTER TABLE v2_customer_addresses ADD COLUMN area VARCHAR(200) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v2_customer_addresses' AND COLUMN_NAME = 'receiver_name');
SET @s = IF(@c = 0, 'ALTER TABLE v2_customer_addresses ADD COLUMN receiver_name VARCHAR(120) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v2_customer_addresses' AND COLUMN_NAME = 'receiver_phone');
SET @s = IF(@c = 0, 'ALTER TABLE v2_customer_addresses ADD COLUMN receiver_phone VARCHAR(15) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ─── Vehicles: category used for pricing ───────────────────────────
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicles' AND COLUMN_NAME = 'category');
SET @s = IF(@c = 0, 'ALTER TABLE vehicles ADD COLUMN category VARCHAR(30) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Allow the luxury segment on bookings (services already carry price_luxury)
ALTER TABLE bookings MODIFY COLUMN vehicle_category ENUM('hatchback','medium_hatchback','sedan','premium_sedan','suv','luxury') NULL;

-- ─── Bookings: cancel / reschedule / confirmation ──────────────────
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'cancel_reason');
SET @s = IF(@c = 0, 'ALTER TABLE bookings ADD COLUMN cancel_reason VARCHAR(500) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'cancelled_by');
SET @s = IF(@c = 0, "ALTER TABLE bookings ADD COLUMN cancelled_by ENUM('customer','admin','system','whatsapp') NULL", 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'cancelled_at');
SET @s = IF(@c = 0, 'ALTER TABLE bookings ADD COLUMN cancelled_at DATETIME NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'reschedule_count');
SET @s = IF(@c = 0, 'ALTER TABLE bookings ADD COLUMN reschedule_count INT UNSIGNED NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'rescheduled_from_slot_id');
SET @s = IF(@c = 0, 'ALTER TABLE bookings ADD COLUMN rescheduled_from_slot_id INT UNSIGNED NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'rescheduled_at');
SET @s = IF(@c = 0, 'ALTER TABLE bookings ADD COLUMN rescheduled_at DATETIME NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'reminder_sent_at');
SET @s = IF(@c = 0, 'ALTER TABLE bookings ADD COLUMN reminder_sent_at DATETIME NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'customer_confirmation');
SET @s = IF(@c = 0, "ALTER TABLE bookings ADD COLUMN customer_confirmation ENUM('pending','confirmed','declined','reschedule_requested') NULL", 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'customer_confirmed_at');
SET @s = IF(@c = 0, 'ALTER TABLE bookings ADD COLUMN customer_confirmed_at DATETIME NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'reward_redemption_id');
SET @s = IF(@c = 0, 'ALTER TABLE bookings ADD COLUMN reward_redemption_id INT UNSIGNED NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ─── Services: warranty + bike/car flag ────────────────────────────
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'warranty_months');
SET @s = IF(@c = 0, 'ALTER TABLE services ADD COLUMN warranty_months INT UNSIGNED NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'warranty_km');
SET @s = IF(@c = 0, 'ALTER TABLE services ADD COLUMN warranty_km INT UNSIGNED NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'vehicle_type');
SET @s = IF(@c = 0, "ALTER TABLE services ADD COLUMN vehicle_type ENUM('car','bike') NOT NULL DEFAULT 'car'", 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ─── Job cards: live pipeline stage ────────────────────────────────
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_carts' AND COLUMN_NAME = 'stage');
SET @s = IF(@c = 0, "ALTER TABLE job_carts ADD COLUMN stage VARCHAR(30) NULL DEFAULT 'received'", 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_carts' AND COLUMN_NAME = 'stage_updated_at');
SET @s = IF(@c = 0, 'ALTER TABLE job_carts ADD COLUMN stage_updated_at DATETIME NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

CREATE TABLE IF NOT EXISTS job_stage_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_cart_id INT UNSIGNED NOT NULL,
  stage VARCHAR(30) NOT NULL,
  note VARCHAR(500) NULL,
  changed_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_job (job_cart_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Warranties issued on job completion ───────────────────────────
CREATE TABLE IF NOT EXISTS service_warranties (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  vehicle_id INT UNSIGNED NULL,
  job_cart_id INT UNSIGNED NULL,
  service_id INT UNSIGNED NULL,
  service_name VARCHAR(150) NOT NULL,
  warranty_code VARCHAR(30) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  warranty_km INT UNSIGNED NULL,
  status ENUM('active','expired','claimed','void') NOT NULL DEFAULT 'active',
  reminder_30_sent TINYINT(1) NOT NULL DEFAULT 0,
  reminder_7_sent TINYINT(1) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_warranty_code (warranty_code),
  UNIQUE KEY uq_job_service (job_cart_id, service_id),
  INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Loyalty: reward catalogue + vouchers ──────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  reward_type ENUM('free_service','discount_amount','free_wash') NOT NULL DEFAULT 'free_service',
  service_id INT UNSIGNED NULL,
  discount_amount DECIMAL(10,2) NULL,
  points_required INT UNSIGNED NOT NULL,
  validity_days INT UNSIGNED NOT NULL DEFAULT 90,
  image_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  reward_id INT UNSIGNED NOT NULL,
  reward_title VARCHAR(150) NOT NULL,
  reward_type VARCHAR(30) NOT NULL,
  service_id INT UNSIGNED NULL,
  discount_amount DECIMAL(10,2) NULL,
  points_spent INT UNSIGNED NOT NULL,
  voucher_code VARCHAR(30) NOT NULL,
  status ENUM('active','used','expired','cancelled') NOT NULL DEFAULT 'active',
  expires_at DATETIME NULL,
  used_at DATETIME NULL,
  used_booking_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_voucher (voucher_code),
  INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── WhatsApp inbox (incoming messages, auto-bot, segregation) ─────
CREATE TABLE IF NOT EXISTS whatsapp_inbox (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NULL,
  phone VARCHAR(20) NOT NULL,
  contact_name VARCHAR(150) NULL,
  message_body TEXT NULL,
  provider_message_id VARCHAR(120) NULL,
  category ENUM('confirmation','cancellation','reschedule','booking_query','pricing_query','status_query','complaint','feedback','greeting','other') NOT NULL DEFAULT 'other',
  intent_detail VARCHAR(100) NULL,
  booking_id INT UNSIGNED NULL,
  auto_reply TEXT NULL,
  auto_action VARCHAR(100) NULL,
  status ENUM('new','auto_resolved','needs_attention','resolved') NOT NULL DEFAULT 'new',
  handled_by INT UNSIGNED NULL,
  handled_at DATETIME NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_provider_msg (provider_message_id),
  INDEX idx_phone (phone),
  INDEX idx_category (category),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Outgoing WhatsApp log needs more message types for the full event set
ALTER TABLE whatsapp_messages MODIFY COLUMN message_type VARCHAR(40) NOT NULL DEFAULT 'manual';

-- ─── Birthday / anniversary greetings ──────────────────────────────
CREATE TABLE IF NOT EXISTS greeting_campaigns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  occasion ENUM('birthday','anniversary') NOT NULL,
  customer_id INT UNSIGNED NULL COMMENT 'NULL = default for every customer',
  title VARCHAR(150) NOT NULL,
  message_body TEXT NOT NULL,
  offer_code VARCHAR(40) NULL,
  discount_percent DECIMAL(5,2) NULL,
  discount_amount DECIMAL(10,2) NULL,
  valid_days INT UNSIGNED NOT NULL DEFAULT 7,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_occasion (occasion, customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS greeting_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  occasion ENUM('birthday','anniversary') NOT NULL,
  greeting_year SMALLINT UNSIGNED NOT NULL,
  campaign_id INT UNSIGNED NULL,
  message_body TEXT NULL,
  sent_via VARCHAR(20) NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_once_a_year (customer_id, occasion, greeting_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO greeting_campaigns (occasion, customer_id, title, message_body, offer_code, discount_percent, valid_days, is_active)
SELECT 'birthday', NULL, 'Default birthday wish',
  'Happy Birthday {{customer_name}}! 🎂 The whole GK AutoHerb team wishes you a fantastic year ahead. Here is a gift from us: {{offer_text}}! Use code *{{offer_code}}* before {{valid_till}}. Book: {{booking_url}}',
  'BDAY15', 15.00, 7, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM greeting_campaigns WHERE occasion = 'birthday' AND customer_id IS NULL);

INSERT INTO greeting_campaigns (occasion, customer_id, title, message_body, offer_code, discount_percent, valid_days, is_active)
SELECT 'anniversary', NULL, 'Default anniversary wish',
  'Happy Anniversary {{customer_name}}! 💐 Wishing you both a lifetime of happy drives. Celebrate with {{offer_text}}! Use code *{{offer_code}}* before {{valid_till}}. Book: {{booking_url}}',
  'ANNIV15', 15.00, 7, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM greeting_campaigns WHERE occasion = 'anniversary' AND customer_id IS NULL);

-- ─── Loyalty reward catalogue defaults (admin can edit) ────────────
INSERT INTO loyalty_rewards (title, description, reward_type, points_required, validity_days, sort_order)
SELECT 'Free Car Wash', 'One complimentary exterior foam wash for your car', 'free_wash', 500, 90, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM loyalty_rewards);

INSERT INTO loyalty_rewards (title, description, reward_type, discount_amount, points_required, validity_days, sort_order)
SELECT '₹200 off any service', 'Flat ₹200 off on your next service booking', 'discount_amount', 200.00, 200, 60, 2
FROM DUAL WHERE (SELECT COUNT(*) FROM loyalty_rewards) = 1;

-- ─── WhatsApp / SMS templates for the full customer journey ────────
INSERT IGNORE INTO v2_whatsapp_templates (template_name, event_trigger, message_body, variables, is_active) VALUES
('OTP Verification', 'OTP_VERIFICATION', '{{otp}} is your GK AutoHerb verification code. It is valid for 10 minutes. Do not share it with anyone.', '["otp"]', 1),
('Booking Rescheduled', 'BOOKING_RESCHEDULED', 'Dear {{customer_name}}, your booking #{{booking_id}} for {{service_name}} has been rescheduled to {{booking_date}} at {{booking_time}}. See you then! - GK AutoHerb', '["customer_name","booking_id","service_name","booking_date","booking_time"]', 1),
('Booking Cancelled By Customer', 'BOOKING_CANCELLED_CUSTOMER', 'Dear {{customer_name}}, as requested, your booking #{{booking_id}} on {{booking_date}} has been cancelled. {{refund_note}} We hope to see you soon. - GK AutoHerb', '["customer_name","booking_id","booking_date","refund_note"]', 1),
('Booking Day-Before Reminder', 'BOOKING_REMINDER', 'Hi {{customer_name}}, reminder: your {{service_name}} for {{vehicle_number}} is tomorrow ({{booking_date}}) at {{booking_time}}.\n\nReply *YES* to confirm, *NO* to cancel or *RESCHEDULE* to pick a new time. - GK AutoHerb', '["customer_name","service_name","vehicle_number","booking_date","booking_time"]', 1),
('Booking Confirmed By Customer', 'BOOKING_CUSTOMER_CONFIRMED', 'Thank you {{customer_name}}! Your slot on {{booking_date}} at {{booking_time}} is confirmed. Our team is ready for your {{vehicle_number}}. - GK AutoHerb', '["customer_name","booking_date","booking_time","vehicle_number"]', 1),
('Reschedule Link', 'BOOKING_RESCHEDULE_LINK', 'No problem {{customer_name}}! Pick a new date and time for booking #{{booking_id}} here: {{reschedule_url}} - GK AutoHerb', '["customer_name","booking_id","reschedule_url"]', 1),
('Job Stage Update', 'JOB_STAGE_UPDATE', 'Hi {{customer_name}}, update on your {{vehicle_number}}: *{{stage_label}}*. {{stage_note}} Track live: {{tracking_url}}', '["customer_name","vehicle_number","stage_label","stage_note","tracking_url"]', 1),
('Warranty Issued', 'WARRANTY_ISSUED', 'Dear {{customer_name}}, your {{service_name}} on {{vehicle_number}} is covered by warranty {{warranty_code}} valid till {{end_date}}. Keep this message for claims. - GK AutoHerb', '["customer_name","service_name","vehicle_number","warranty_code","end_date"]', 1),
('Warranty Expiry Reminder', 'WARRANTY_EXPIRY_REMINDER', 'Dear {{customer_name}}, your {{service_name}} warranty ({{warranty_code}}) expires on {{end_date}}. Book a free inspection before it ends: {{booking_url}} - GK AutoHerb', '["customer_name","service_name","warranty_code","end_date","booking_url"]', 1),
('Loyalty Points Earned', 'LOYALTY_POINTS_EARNED', 'Hi {{customer_name}}, you earned {{points_earned}} GK points ({{earn_percent}}% back) on your ₹{{amount}} bill. Balance: {{total_points}} points. Redeem in the app: {{rewards_url}}', '["customer_name","points_earned","earn_percent","amount","total_points","rewards_url"]', 1),
('Reward Redeemed', 'REWARD_REDEEMED', 'Hi {{customer_name}}, you redeemed {{points_spent}} points for *{{reward_title}}*. Voucher: {{voucher_code}} (valid till {{valid_till}}). - GK AutoHerb', '["customer_name","points_spent","reward_title","voucher_code","valid_till"]', 1),
('Birthday Wish', 'BIRTHDAY_WISH', 'Happy Birthday {{customer_name}}! 🎂 Wishing you a wonderful year from all of us at GK AutoHerb.', '["customer_name"]', 1),
('Anniversary Wish', 'ANNIVERSARY_WISH', 'Happy Anniversary {{customer_name}}! 💐 Wishing you many more happy years from GK AutoHerb.', '["customer_name"]', 1),
('Payment Received', 'PAYMENT_RECEIVED', 'Dear {{customer_name}}, we received your payment of ₹{{amount}} for {{payment_for}}. Thank you! - GK AutoHerb', '["customer_name","amount","payment_for"]', 1),
('Pickup Scheduled', 'PICKUP_SCHEDULED', 'Dear {{customer_name}}, pickup for your {{vehicle_number}} is scheduled at {{pickup_time}} from {{address}}. Driver: {{driver_name}}. - GK AutoHerb', '["customer_name","vehicle_number","pickup_time","address","driver_name"]', 1),
('Auto Reply Fallback', 'AUTO_REPLY_FALLBACK', 'Hi {{customer_name}}, thanks for messaging GK AutoHerb! Our team will reply shortly. Quick options: reply *BOOK* to book a service, *STATUS* for your car status, *PRICE* for prices.', '["customer_name"]', 1);

-- ─── Map each template to its approved Meta (WhatsApp Cloud API) template ─
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v2_whatsapp_templates' AND COLUMN_NAME = 'provider_template_name');
SET @s = IF(@c = 0, 'ALTER TABLE v2_whatsapp_templates ADD COLUMN provider_template_name VARCHAR(120) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v2_whatsapp_templates' AND COLUMN_NAME = 'provider_language');
SET @s = IF(@c = 0, "ALTER TABLE v2_whatsapp_templates ADD COLUMN provider_language VARCHAR(10) NOT NULL DEFAULT 'en'", 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v2_whatsapp_templates' AND COLUMN_NAME = 'send_sms');
SET @s = IF(@c = 0, 'ALTER TABLE v2_whatsapp_templates ADD COLUMN send_sms TINYINT(1) NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

ALTER TABLE v2_notification_logs MODIFY COLUMN status ENUM('sent','failed','pending','retry','queued','delivered','read') NOT NULL DEFAULT 'pending';

-- ─── Booking columns used by the booking flow but never created by a migration ─
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'booking_type');
SET @s = IF(@c = 0, "ALTER TABLE bookings ADD COLUMN booking_type VARCHAR(20) NOT NULL DEFAULT 'direct'", 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'user_package_id');
SET @s = IF(@c = 0, 'ALTER TABLE bookings ADD COLUMN user_package_id INT UNSIGNED NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'package_service_name');
SET @s = IF(@c = 0, 'ALTER TABLE bookings ADD COLUMN package_service_name VARCHAR(255) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET SESSION sql_mode = @OLD_SQL_MODE_087;

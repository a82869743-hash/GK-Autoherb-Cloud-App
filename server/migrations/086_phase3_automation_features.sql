-- ==========================================================
-- 086_phase3_automation_features.sql
-- Phase 3: Automation Features, Coupons, OTP Auth & Service Media
-- ==========================================================

-- 1. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  value DECIMAL(10, 2) NOT NULL,
  max_discount DECIMAL(10, 2) NULL,
  min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  applicable_services JSON NULL,
  applicable_packages JSON NULL,
  valid_from DATETIME NULL,
  valid_to DATETIME NULL,
  total_usage_limit INT NULL,
  per_customer_limit INT NOT NULL DEFAULT 1,
  first_time_only TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_active (is_active),
  INDEX idx_validity (valid_from, valid_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Coupon Redemptions Table
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  coupon_id INT NOT NULL,
  customer_id INT NOT NULL,
  booking_id INT NULL,
  job_cart_id INT NULL,
  package_request_id INT NULL,
  manual_bill_id INT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_coupon (coupon_id),
  INDEX idx_customer (customer_id),
  INDEX idx_booking (booking_id),
  INDEX idx_job_cart (job_cart_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. OTP Requests Table for Secure Mobile SMS Login & Registration
CREATE TABLE IF NOT EXISTS otp_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mobile VARCHAR(15) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose ENUM('login', 'register', 'reset_password') NOT NULL DEFAULT 'login',
  expires_at DATETIME NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mobile (mobile),
  INDEX idx_expires (expires_at),
  INDEX idx_purpose (purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Service Media Table (Videos, Gallery Images & Thumbnails)
CREATE TABLE IF NOT EXISTS service_media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  media_type ENUM('image', 'video') NOT NULL DEFAULT 'image',
  url VARCHAR(500) NOT NULL,
  public_id VARCHAR(255) NULL,
  thumbnail_url VARCHAR(500) NULL,
  duration DECIMAL(6, 2) NULL,
  external_url VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_service (service_id),
  INDEX idx_type (media_type),
  INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Add Coupon Reference Columns to Orders and Bookings if not already present
-- bookings coupon fields
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'coupon_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE bookings ADD COLUMN coupon_id INT NULL, ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0.00', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- job_carts coupon fields
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_carts' AND COLUMN_NAME = 'coupon_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE job_carts ADD COLUMN coupon_id INT NULL, ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0.00', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- user_packages coupon fields
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_packages' AND COLUMN_NAME = 'coupon_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE user_packages ADD COLUMN coupon_id INT NULL, ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0.00', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- manual_bills coupon fields
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'manual_bills' AND COLUMN_NAME = 'coupon_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE manual_bills ADD COLUMN coupon_id INT NULL, ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0.00', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. Add video_url and media_gallery fields to services table if not already present
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'video_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE services ADD COLUMN video_url VARCHAR(500) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. Seed Settings for Automation, Google Reviews & Reminders
INSERT IGNORE INTO settings (key_name, value) VALUES
('service_reminders_enabled', '1'),
('service_reminder_interval_days', '90'),
('service_reminder_wash_days', '30'),
('service_reminder_template', 'Hi {{customer_name}}, your {{vehicle_name}} is due for regular maintenance at GK AutoHerb. Book your studio slot today: {{booking_url}}'),
('admin_whatsapp_number', '9408424541'),
('admin_daily_digest_enabled', '1'),
('google_review_url', 'https://search.google.com/local/writereview?placeid=ChIJn8N3wS1wXzkR8W6_m4gq5uU'),
('feedback_google_threshold', '4'),
('feedback_delay_hours', '2'),
('feedback_enabled', '1'),
('whatsapp_provider', 'mock');

-- 8. Seed Additional WhatsApp Templates for Complete Event Automation
INSERT IGNORE INTO v2_whatsapp_templates (template_name, event_trigger, message_body, variables, is_active) VALUES
('Booking Cancelled', 'BOOKING_CANCELLED', 'Dear {{customer_name}}, your booking #{{booking_id}} for {{service_name}} has been cancelled. For queries, contact +91 94084 24541. - GK AutoHerb', '["customer_name","booking_id","service_name"]', 1),
('Booking Expired', 'BOOKING_EXPIRED', 'Dear {{customer_name}}, your pending booking reservation #{{booking_id}} has expired. Please rebook your slot at {{booking_url}}. - GK AutoHerb', '["customer_name","booking_id","booking_url"]', 1),
('Vehicle Received', 'VEHICLE_RECEIVED', 'Dear {{customer_name}}, your vehicle {{vehicle_number}} has been received at GK AutoHerb Studio! Job Card #{{job_cart_id}} has been opened.', '["customer_name","vehicle_number","job_cart_id"]', 1),
('Service Progress Update', 'SERVICE_PROGRESS', 'Dear {{customer_name}}, progress update for your vehicle {{vehicle_number}}: {{status_note}}. View progress: {{tracking_url}}', '["customer_name","vehicle_number","status_note","tracking_url"]', 1),
('Loyalty Rewards Awarded', 'LOYALTY_AWARDED', 'Congratulations {{customer_name}}! You have earned {{points_earned}} GK Loyalty Points on Invoice #{{invoice_number}}. Current balance: {{total_points}} points.', '["customer_name","points_earned","invoice_number","total_points"]', 1),
('Free Wash Awarded', 'FREE_WASH_AWARDED', 'Congratulations {{customer_name}}! A complimentary wash voucher has been added to your account. Book anytime at {{booking_url}}!', '["customer_name","booking_url"]', 1),
('Special Coupon Offer', 'COUPON_ISSUED', 'Special Offer from GK AutoHerb! Use code *{{coupon_code}}* to get {{discount_text}} on your next detailing booking. Valid until {{valid_till}}: {{booking_url}}', '["customer_name","coupon_code","discount_text","valid_till","booking_url"]', 1),
('Service Reminder', 'SERVICE_REMINDER', 'Dear {{customer_name}}, your {{vehicle_name}} is due for regular maintenance at GK AutoHerb! Book your priority slot today: {{booking_url}}', '["customer_name","vehicle_name","booking_url"]', 1),
('Feedback Request', 'FEEDBACK_REQUEST', 'Dear {{customer_name}}, thank you for choosing GK AutoHerb! How was your experience with {{vehicle_number}}? Share feedback: {{feedback_url}}', '["customer_name","vehicle_number","feedback_url"]', 1),
('Admin Daily Digest', 'ADMIN_DAILY_DIGEST', 'GK AutoHerb Daily Morning Digest: {{reminders_count}} service reminders sent today. {{due_soon_count}} vehicles due soon. {{open_jobs_count}} jobs currently open in bays.', '["reminders_count","due_soon_count","open_jobs_count"]', 1),
('Admin Low Rating Alert', 'ADMIN_LOW_RATING', 'ALERT: Customer {{customer_name}} submitted a {{rating}} star feedback for Job Card #{{job_cart_id}}! Comments: "{{comments}}". Customer Mobile: {{customer_mobile}}', '["customer_name","rating","job_cart_id","comments","customer_mobile"]', 1),
('Admin New Booking Alert', 'ADMIN_NEW_BOOKING', 'New Booking Received! Customer: {{customer_name}} ({{customer_mobile}}), Vehicle: {{vehicle_number}}, Slot: {{slot_time}}. Approve in admin queue: {{admin_url}}', '["customer_name","customer_mobile","vehicle_number","slot_time","admin_url"]', 1);

-- 9. Seed Sample Initial Active Coupons
INSERT IGNORE INTO coupons (code, title, type, value, max_discount, min_order_amount, total_usage_limit, per_customer_limit, first_time_only, is_active) VALUES
('WELCOME100', 'New Customer Welcome Bonus', 'fixed', 100.00, 100.00, 499.00, 500, 1, 1, 1),
('FESTIVE15', 'Festive Detailing Special', 'percentage', 15.00, 500.00, 999.00, 200, 2, 0, 1),
('CERAMIC500', 'Ceramic Shield Discount', 'fixed', 500.00, 500.00, 4999.00, 50, 1, 0, 1);

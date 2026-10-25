-- 089: complete WhatsApp customer journey
--   morning-of-booking reminder, richer job start / finish, package start / renewal / expired /
--   next-wash-due, and festival offer campaigns. Safe to run more than once.

-- ── New templates ────────────────────────────────────────────────
INSERT IGNORE INTO v2_whatsapp_templates (template_name, event_trigger, message_body, variables, is_active) VALUES
('Booking Morning Reminder', 'BOOKING_MORNING_REMINDER', 'Good morning {{customer_name}}! ☀️ Today is your {{service_name}} for {{vehicle_number}} at {{booking_time}}.\n\n📍 {{studio_address}}\nDirections: {{maps_url}}\n\nNeed to change it? Reply *RESCHEDULE*. See you soon! - GK AutoHerb', '["customer_name","service_name","vehicle_number","booking_time","studio_address","maps_url"]', 1),
('Package Renewed', 'PACKAGE_RENEWED', 'Hi {{customer_name}}, your *{{package_name}}* package has been renewed ✅\nValid: {{valid_from}} to {{valid_till}}.\nBook your next wash anytime: {{booking_url}} - GK AutoHerb', '["customer_name","package_name","valid_from","valid_till","booking_url"]', 1),
('Package Expired', 'PACKAGE_EXPIRED', 'Hi {{customer_name}}, your *{{package_name}}* package expired today. Renew now to keep your car protected and your savings going: {{renewal_url}} - GK AutoHerb', '["customer_name","package_name","renewal_url"]', 1),
('Package Next Wash Due', 'PACKAGE_NEXT_WASH', 'Hi {{customer_name}}, it''s time for your next wash! 🚿 You have *{{remaining}}* left in your {{package_name}} package (valid till {{valid_till}}).\nBook a slot in 10 seconds: {{booking_url}} - GK AutoHerb', '["customer_name","remaining","package_name","valid_till","booking_url"]', 1),
('Festival Offer', 'FESTIVAL_OFFER', '{{offer_message}}\n\n{{coupon_line}}Book now: {{booking_url}}\n- Team GK AutoHerb', '["offer_message","coupon_line","booking_url"]', 1);

-- ── Better start / finish / package-start wording (only if still the original default) ──
UPDATE v2_whatsapp_templates
SET message_body = 'Hi {{customer_name}}, work has started on your {{vehicle_number}} 🔧\nServices: {{services}}\nEstimated ready by: {{estimated_time}}\n\nWatch it live: {{tracking_url}} - GK AutoHerb',
    variables = '["customer_name","vehicle_number","services","estimated_time","tracking_url"]'
WHERE event_trigger = 'SERVICE_STARTED'
  AND message_body = 'Dear {{customer_name}}, work on your vehicle {{vehicle_number}} has started! Estimated completion: {{estimated_time}}. We will notify you once done.';

UPDATE v2_whatsapp_templates
SET message_body = 'Hi {{customer_name}}, your {{vehicle_number}} is ready! ✨\nJob card #{{job_cart_id}} · Bill {{amount}}\n\nSee the details: {{tracking_url}}\nThank you for choosing GK AutoHerb!',
    variables = '["customer_name","vehicle_number","job_cart_id","amount","tracking_url"]'
WHERE event_trigger = 'SERVICE_COMPLETED'
  AND message_body = 'Dear {{customer_name}}, your vehicle {{vehicle_number}} service is complete! Job Card: {{job_cart_id}}. Visit GK AutoHerb to collect your vehicle.';

UPDATE v2_whatsapp_templates
SET message_body = 'Hi {{customer_name}}, your *{{package_name}}* package is active 🎉\nValid: {{valid_from}} to {{valid_till}}.\nBook your first wash: {{booking_url}} - GK AutoHerb',
    variables = '["customer_name","package_name","valid_from","valid_till","booking_url"]'
WHERE event_trigger = 'PACKAGE_APPROVED'
  AND message_body = 'Dear {{customer_name}}, your {{package_name}} package has been approved! Valid: {{valid_from}} to {{valid_till}}. Enjoy premium services! - GK AutoHerb';

-- ── Reminder bookkeeping ──────────────────────────────────────────
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'morning_reminder_sent_at');
SET @s = IF(@c = 0, 'ALTER TABLE bookings ADD COLUMN morning_reminder_sent_at DATETIME NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_packages' AND COLUMN_NAME = 'next_wash_reminded_at');
SET @s = IF(@c = 0, 'ALTER TABLE user_packages ADD COLUMN next_wash_reminded_at DATETIME NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_packages' AND COLUMN_NAME = 'expired_notified_at');
SET @s = IF(@c = 0, 'ALTER TABLE user_packages ADD COLUMN expired_notified_at DATETIME NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ── Festival / offer campaigns ────────────────────────────────────
CREATE TABLE IF NOT EXISTS festival_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  festival VARCHAR(60) NULL,
  message TEXT NOT NULL,
  coupon_code VARCHAR(40) NULL,
  audience ENUM('all','package','inactive','recent') NOT NULL DEFAULT 'all',
  scheduled_at DATETIME NOT NULL,
  status ENUM('scheduled','sending','sent','cancelled') NOT NULL DEFAULT 'scheduled',
  recipients INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  INDEX idx_due (status, scheduled_at)
);

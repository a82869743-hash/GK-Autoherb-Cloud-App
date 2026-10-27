-- 090: package EMI (studio installments)
--   Admin turns EMI on per package and picks the month options (e.g. 3,6) and a minimum price.
--   The customer pays the first installment at purchase, the rest monthly (online or at the studio).
--   Additive only. Safe to run more than once. No sample data.

SET @OLD_SQL_MODE_090 = @@SESSION.sql_mode;
SET SESSION sql_mode = '';

-- ── Per-package EMI settings ──────────────────────────────────────
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'packages' AND COLUMN_NAME = 'emi_enabled');
SET @s = IF(@c = 0, 'ALTER TABLE packages ADD COLUMN emi_enabled TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'packages' AND COLUMN_NAME = 'emi_months');
SET @s = IF(@c = 0, 'ALTER TABLE packages ADD COLUMN emi_months VARCHAR(30) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'packages' AND COLUMN_NAME = 'emi_min_amount');
SET @s = IF(@c = 0, 'ALTER TABLE packages ADD COLUMN emi_min_amount DECIMAL(10,2) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ── The months a customer picked when asking for the package ─────
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'package_requests' AND COLUMN_NAME = 'emi_months');
SET @s = IF(@c = 0, 'ALTER TABLE package_requests ADD COLUMN emi_months INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ── EMI plans and their installments ──────────────────────────────
CREATE TABLE IF NOT EXISTS package_emi_plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  package_id INT UNSIGNED NOT NULL,
  package_request_id INT UNSIGNED NULL,
  user_package_id INT UNSIGNED NULL,
  vehicle_id INT UNSIGNED NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  months INT NOT NULL,
  installment_amount DECIMAL(10,2) NOT NULL,
  status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  INDEX idx_emi_customer (customer_id),
  INDEX idx_emi_user_package (user_package_id),
  INDEX idx_emi_status (status)
);

CREATE TABLE IF NOT EXISTS package_emi_installments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id INT UNSIGNED NOT NULL,
  installment_no INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('pending','paid','waived') NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL,
  payment_method VARCHAR(30) NULL,
  payment_ref VARCHAR(120) NULL,
  v2_payment_id INT UNSIGNED NULL,
  recorded_by INT UNSIGNED NULL,
  reminder_sent_at DATETIME NULL,
  overdue_notified_at DATETIME NULL,
  UNIQUE KEY uq_emi_plan_no (plan_id, installment_no),
  INDEX idx_emi_due (status, due_date)
);

-- ── Messages ──────────────────────────────────────────────────────
INSERT IGNORE INTO v2_whatsapp_templates (template_name, event_trigger, message_body, variables, is_active) VALUES
('Package EMI Started', 'PACKAGE_EMI_STARTED', 'Hi {{customer_name}}, your *{{package_name}}* package is active on EMI ✅\nPaid today: {{paid_amount}} (1 of {{months}})\nNext installment: {{next_amount}} on {{next_due}}.\nSee your plan: {{plan_url}} - GK AutoHerb', '["customer_name","package_name","paid_amount","months","next_amount","next_due","plan_url"]', 1),
('Package EMI Due', 'PACKAGE_EMI_DUE', 'Hi {{customer_name}}, a gentle reminder: installment {{installment_no}} of {{months}} for your *{{package_name}}* package ({{amount}}) is due on {{due_date}}.\nPay online: {{plan_url}} or at the studio. - GK AutoHerb', '["customer_name","installment_no","months","package_name","amount","due_date","plan_url"]', 1),
('Package EMI Overdue', 'PACKAGE_EMI_OVERDUE', 'Hi {{customer_name}}, installment {{installment_no}} for your *{{package_name}}* package ({{amount}}) was due on {{due_date}} and is still unpaid. Please pay soon to keep using your package: {{plan_url}} - GK AutoHerb', '["customer_name","installment_no","package_name","amount","due_date","plan_url"]', 1),
('Package EMI Paid', 'PACKAGE_EMI_PAID', 'Thank you {{customer_name}}! We received {{amount}} for installment {{installment_no}} of {{months}} ({{package_name}}).\n{{next_line}} - GK AutoHerb', '["customer_name","amount","installment_no","months","package_name","next_line"]', 1);

SET SESSION sql_mode = @OLD_SQL_MODE_090;

-- 091: per-service discount set by the admin (percent or flat rupees, optional label and dates).
--   Customers see the offer price and online bookings are charged it. Additive only, safe to re-run.

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'discount_type');
SET @s = IF(@c = 0, 'ALTER TABLE services ADD COLUMN discount_type ENUM(''percent'',''flat'') NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'discount_value');
SET @s = IF(@c = 0, 'ALTER TABLE services ADD COLUMN discount_value DECIMAL(10,2) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'discount_label');
SET @s = IF(@c = 0, 'ALTER TABLE services ADD COLUMN discount_label VARCHAR(60) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'discount_starts_on');
SET @s = IF(@c = 0, 'ALTER TABLE services ADD COLUMN discount_starts_on DATE NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'discount_ends_on');
SET @s = IF(@c = 0, 'ALTER TABLE services ADD COLUMN discount_ends_on DATE NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

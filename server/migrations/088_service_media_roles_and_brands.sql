-- 088: before/after/process media slots for services + PPF / ceramic brands shown to customers
-- Safe to run more than once.

-- Each service media item says what it is for (gallery, before photo, after photo, process video)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_media' AND COLUMN_NAME = 'media_role');
SET @sql := IF(@col = 0,
  "ALTER TABLE service_media ADD COLUMN media_role ENUM('gallery','before','after','process') NOT NULL DEFAULT 'gallery' AFTER media_type",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Product brands the studio uses (shown on the customer app for PPF / ceramic services)
CREATE TABLE IF NOT EXISTS product_brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  tagline VARCHAR(160) NULL,
  logo_url VARCHAR(500) NULL,
  applies_to ENUM('ppf','ceramic','both') NOT NULL DEFAULT 'both',
  warranty_note VARCHAR(120) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO product_brands (name, tagline, applies_to, sort_order)
SELECT 'Garware', 'Made-in-India paint protection film', 'ppf', 1
WHERE NOT EXISTS (SELECT 1 FROM product_brands WHERE name = 'Garware');

INSERT INTO product_brands (name, tagline, applies_to, sort_order)
SELECT 'Astonish', 'Ceramic & graphene coatings', 'ceramic', 2
WHERE NOT EXISTS (SELECT 1 FROM product_brands WHERE name = 'Astonish');

-- ═══════════════════════════════════════════════════════════
-- MIGRATION 050: Package System V2 — Annual Car Care
-- ═══════════════════════════════════════════════════════════

-- 1. Add pricing_type to packages (basic/premium differentiation)
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS pricing_type ENUM('basic','premium') NOT NULL DEFAULT 'basic' AFTER is_published,
  ADD COLUMN IF NOT EXISTS paid_wash_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER wax_count,
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_published,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0 AFTER visible_to_customer;

-- 2. Create package_pricing table for car-type × pricing-type matrix
CREATE TABLE IF NOT EXISTS package_pricing (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  package_id   INT UNSIGNED NOT NULL,
  car_type     ENUM('SMALL_HATCHBACK','MEDIUM_HATCHBACK','SEDAN_SUV','PREMIUM_SEDAN','LARGE_CAR') NOT NULL,
  pricing_type ENUM('basic','premium') NOT NULL DEFAULT 'basic',
  price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  UNIQUE KEY uq_pkg_car_pricing (package_id, car_type, pricing_type),
  INDEX idx_package_id (package_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add pricing_type to package_requests so we know which tier was requested
ALTER TABLE package_requests
  ADD COLUMN IF NOT EXISTS pricing_type ENUM('basic','premium') NOT NULL DEFAULT 'basic' AFTER price,
  ADD COLUMN IF NOT EXISTS car_type VARCHAR(50) NULL AFTER pricing_type,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;

-- 4. Add pricing_type to user_packages for tracking
ALTER TABLE user_packages
  ADD COLUMN IF NOT EXISTS pricing_type ENUM('basic','premium') NULL DEFAULT 'basic' AFTER vehicle_segment,
  ADD COLUMN IF NOT EXISTS car_type VARCHAR(50) NULL AFTER pricing_type;

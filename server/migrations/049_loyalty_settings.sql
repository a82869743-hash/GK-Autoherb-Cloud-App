-- ═══════════════════════════════════════════════════════════
-- PHASE 2: Loyalty Settings
-- Configurable loyalty point ratio and redemption rules.
-- Stored in the existing settings table as key-value pairs.
-- ═══════════════════════════════════════════════════════════

-- Insert default loyalty settings (only if they don't exist)
INSERT IGNORE INTO settings (setting_key, setting_value, description)
VALUES
  ('loyalty_points_ratio', '100', 'Amount in ₹ spent per 1 loyalty point earned'),
  ('loyalty_min_redeem', '50', 'Minimum points required to redeem'),
  ('loyalty_point_value', '1', 'Value of 1 loyalty point in ₹ for redemption'),
  ('loyalty_enabled', '1', 'Whether loyalty system is active (1=yes, 0=no)');

-- ═══════════════════════════════════════════════════════════
-- PHASE 2: Quick Wash Bookings
-- Lightweight booking system for walk-in wash services
-- without requiring full job card workflow.
-- Uses job_type field on bookings rather than separate table.
-- ═══════════════════════════════════════════════════════════

-- Add quick wash fields to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS job_type ENUM('standard','quick_wash') NOT NULL DEFAULT 'standard'
    COMMENT 'standard = normal booking, quick_wash = walk-in wash',
  ADD COLUMN IF NOT EXISTS wash_status ENUM('pending','washing','completed','delivered') NULL DEFAULT NULL
    COMMENT 'Quick wash specific status tracking',
  ADD COLUMN IF NOT EXISTS queue_position INT NULL DEFAULT NULL
    COMMENT 'Position in wash queue',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP NULL DEFAULT NULL
    COMMENT 'When wash actually started',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL DEFAULT NULL
    COMMENT 'When wash was completed',
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL DEFAULT NULL
    COMMENT 'When vehicle was handed back';

-- Index for quick wash queue queries
ALTER TABLE bookings
  ADD INDEX IF NOT EXISTS idx_job_type (job_type),
  ADD INDEX IF NOT EXISTS idx_wash_status (wash_status);

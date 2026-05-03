-- ═══════════════════════════════════════════════════════════
-- Migration 042: Soft Deletes & Archive Support
--
-- 1. Add status to manual_bills
-- ═══════════════════════════════════════════════════════════

ALTER TABLE manual_bills
ADD COLUMN status ENUM('paid', 'voided', 'cancelled') NOT NULL DEFAULT 'paid' AFTER payment_method;

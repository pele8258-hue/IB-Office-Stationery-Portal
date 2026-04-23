-- Migration: align existing schema with corrected business requirements
-- Target statuses: PENDING, APPROVED, REJECTED
-- Run once against your existing database.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) Normalize existing workflow values before shrinking ENUM sets.
UPDATE workflows
SET current_status = CASE current_status
  WHEN 'COMPLETED' THEN 'APPROVED'
  WHEN 'CANCELLED' THEN 'REJECTED'
  ELSE current_status
END
WHERE current_status IN ('COMPLETED', 'CANCELLED');

UPDATE workflow_status_logs
SET from_status = CASE from_status
  WHEN 'COMPLETED' THEN 'APPROVED'
  WHEN 'CANCELLED' THEN 'REJECTED'
  ELSE from_status
END
WHERE from_status IN ('COMPLETED', 'CANCELLED');

UPDATE workflow_status_logs
SET to_status = CASE to_status
  WHEN 'COMPLETED' THEN 'APPROVED'
  WHEN 'CANCELLED' THEN 'REJECTED'
  ELSE to_status
END
WHERE to_status IN ('COMPLETED', 'CANCELLED');

ALTER TABLE workflows
  MODIFY COLUMN current_status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE workflow_status_logs
  MODIFY COLUMN from_status ENUM('PENDING', 'APPROVED', 'REJECTED') NULL,
  MODIFY COLUMN to_status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL;

-- 2) Add corrected fields for request details (idempotent via metadata checks).
SET @db_name = DATABASE();

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'stationery_daily_request_items'
      AND COLUMN_NAME = 'line_description'
  ),
  'SELECT ''line_description already exists on stationery_daily_request_items''',
  'ALTER TABLE stationery_daily_request_items ADD COLUMN line_description VARCHAR(255) NULL AFTER stock_item_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'stationery_monthly_requests'
      AND COLUMN_NAME = 'description_text'
  ),
  'SELECT ''description_text already exists on stationery_monthly_requests''',
  'ALTER TABLE stationery_monthly_requests ADD COLUMN description_text VARCHAR(500) NULL AFTER contact_number'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'stationery_monthly_request_items'
      AND COLUMN_NAME = 'line_description'
  ),
  'SELECT ''line_description already exists on stationery_monthly_request_items''',
  'ALTER TABLE stationery_monthly_request_items ADD COLUMN line_description VARCHAR(255) NULL AFTER stock_item_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) Add/refresh stock balance monitoring view.
CREATE OR REPLACE VIEW vw_stock_balance_by_branch AS
SELECT
  bis.id AS branch_item_stock_id,
  bis.branch_id,
  b.branch_name,
  bis.stock_item_id,
  si.item_code,
  si.item_name,
  si.barcode_number,
  bis.quantity_base_units AS stock_balance_base_units,
  bis.reorder_level_base_units,
  bis.updated_at
FROM branch_item_stock bis
JOIN branches b ON b.id = bis.branch_id
JOIN stock_items si ON si.id = bis.stock_item_id;

SET FOREIGN_KEY_CHECKS = 1;

-- IB Office Stationery Portal
-- MySQL 8+ schema
-- Run this script in your target database, e.g.:
--   mysql -u <user> -p <database_name> < db/schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS branches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_code VARCHAR(30) NOT NULL UNIQUE,
  branch_name VARCHAR(150) NOT NULL,
  address_line1 VARCHAR(255) NULL,
  address_line2 VARCHAR(255) NULL,
  city VARCHAR(120) NULL,
  state VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  postal_code VARCHAR(20) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id BIGINT UNSIGNED NULL,
  department_code VARCHAR(30) NOT NULL,
  department_name VARCHAR(150) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_departments_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id),
  UNIQUE KEY uq_departments_branch_code (branch_id, department_code),
  UNIQUE KEY uq_departments_branch_name (branch_id, department_name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NULL UNIQUE,
  contact_number VARCHAR(30) NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  signature_image_url VARCHAR(500) NULL,
  role_name VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_users_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS unit_types (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unit_code VARCHAR(20) NOT NULL UNIQUE,
  unit_name VARCHAR(50) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_code VARCHAR(30) NOT NULL UNIQUE,
  category_name VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_code VARCHAR(50) NOT NULL UNIQUE,
  item_name VARCHAR(180) NOT NULL,
  item_description VARCHAR(500) NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  barcode_number VARCHAR(120) NOT NULL UNIQUE,
  default_issue_unit_type_id TINYINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_items_category
    FOREIGN KEY (category_id) REFERENCES item_categories(id),
  CONSTRAINT fk_stock_items_default_issue_unit
    FOREIGN KEY (default_issue_unit_type_id) REFERENCES unit_types(id),
  KEY idx_stock_items_name (item_name),
  KEY idx_stock_items_category (category_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_item_units (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stock_item_id BIGINT UNSIGNED NOT NULL,
  unit_type_id TINYINT UNSIGNED NOT NULL,
  units_per_this_unit DECIMAL(18,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_item_units_stock_item
    FOREIGN KEY (stock_item_id) REFERENCES stock_items(id),
  CONSTRAINT fk_stock_item_units_unit_type
    FOREIGN KEY (unit_type_id) REFERENCES unit_types(id),
  CONSTRAINT chk_stock_item_units_positive
    CHECK (units_per_this_unit > 0),
  UNIQUE KEY uq_stock_item_units (stock_item_id, unit_type_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_item_stock (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id BIGINT UNSIGNED NOT NULL,
  stock_item_id BIGINT UNSIGNED NOT NULL,
  quantity_base_units DECIMAL(18,4) NOT NULL DEFAULT 0,
  reorder_level_base_units DECIMAL(18,4) NOT NULL DEFAULT 0,
  last_stock_update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_branch_item_stock_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_branch_item_stock_stock_item
    FOREIGN KEY (stock_item_id) REFERENCES stock_items(id),
  CONSTRAINT chk_branch_item_stock_qty_non_negative
    CHECK (quantity_base_units >= 0),
  UNIQUE KEY uq_branch_item_stock (branch_id, stock_item_id),
  KEY idx_branch_item_stock_item (stock_item_id),
  KEY idx_branch_item_stock_qty (quantity_base_units)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_item_stock_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM(
    'IN',
    'OUT',
    'ADJUSTMENT',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'REQUEST_ISSUE',
    'REQUEST_RETURN'
  ) NOT NULL,
  quantity_base_units DECIMAL(18,4) NOT NULL,
  reference_type ENUM('STATIONERY_DAILY', 'STATIONERY_MONTHLY', 'CAR_BOOKING', 'MANUAL', 'OTHER') NOT NULL DEFAULT 'MANUAL',
  reference_id BIGINT UNSIGNED NULL,
  moved_by_user_id BIGINT UNSIGNED NULL,
  notes VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_movements_branch_item_stock
    FOREIGN KEY (branch_item_stock_id) REFERENCES branch_item_stock(id),
  CONSTRAINT fk_stock_movements_moved_by
    FOREIGN KEY (moved_by_user_id) REFERENCES users(id),
  CONSTRAINT chk_stock_movements_non_zero
    CHECK (quantity_base_units <> 0),
  KEY idx_stock_movements_branch_item_stock (branch_item_stock_id),
  KEY idx_stock_movements_created_at (created_at),
  KEY idx_stock_movements_reference (reference_type, reference_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflows (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_type ENUM('STATIONERY_DAILY', 'STATIONERY_MONTHLY', 'CAR_BOOKING') NOT NULL,
  request_number VARCHAR(30) NOT NULL UNIQUE,
  requester_user_id BIGINT UNSIGNED NOT NULL,
  requester_branch_id BIGINT UNSIGNED NOT NULL,
  requester_department_id BIGINT UNSIGNED NULL,
  current_status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflows_requester
    FOREIGN KEY (requester_user_id) REFERENCES users(id),
  CONSTRAINT fk_workflows_branch
    FOREIGN KEY (requester_branch_id) REFERENCES branches(id),
  CONSTRAINT fk_workflows_department
    FOREIGN KEY (requester_department_id) REFERENCES departments(id),
  KEY idx_workflows_requester (requester_user_id),
  KEY idx_workflows_status (current_status),
  KEY idx_workflows_type_submitted (request_type, submitted_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_approval_steps (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id BIGINT UNSIGNED NOT NULL,
  step_no SMALLINT UNSIGNED NOT NULL,
  approver_user_id BIGINT UNSIGNED NOT NULL,
  action_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
  action_comment VARCHAR(500) NULL,
  approver_signature_image_url VARCHAR(500) NULL,
  action_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_approval_steps_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  CONSTRAINT fk_workflow_approval_steps_approver
    FOREIGN KEY (approver_user_id) REFERENCES users(id),
  UNIQUE KEY uq_workflow_approver_step (workflow_id, step_no, approver_user_id),
  KEY idx_workflow_approval_steps_workflow (workflow_id),
  KEY idx_workflow_approval_steps_action (action_status, action_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_status_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id BIGINT UNSIGNED NOT NULL,
  from_status ENUM('PENDING', 'APPROVED', 'REJECTED') NULL,
  to_status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL,
  changed_by_user_id BIGINT UNSIGNED NULL,
  change_reason VARCHAR(500) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_status_logs_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  CONSTRAINT fk_workflow_status_logs_changed_by
    FOREIGN KEY (changed_by_user_id) REFERENCES users(id),
  KEY idx_workflow_status_logs_workflow (workflow_id, changed_at),
  KEY idx_workflow_status_logs_to_status (to_status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stationery_daily_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id BIGINT UNSIGNED NOT NULL UNIQUE,
  request_date DATE NOT NULL,
  description_text VARCHAR(500) NULL,
  receiver_name VARCHAR(150) NOT NULL,
  receiver_signature_image_url VARCHAR(500) NULL,
  receiver_department_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stationery_daily_requests_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  CONSTRAINT fk_stationery_daily_requests_department
    FOREIGN KEY (receiver_department_id) REFERENCES departments(id),
  KEY idx_stationery_daily_requests_date (request_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stationery_daily_request_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  daily_request_id BIGINT UNSIGNED NOT NULL,
  stock_item_id BIGINT UNSIGNED NOT NULL,
  line_description VARCHAR(255) NULL,
  item_description_override VARCHAR(255) NULL,
  requested_quantity DECIMAL(18,4) NOT NULL,
  requested_unit_type_id TINYINT UNSIGNED NOT NULL,
  conversion_factor_to_base DECIMAL(18,4) NOT NULL,
  requested_quantity_base DECIMAL(18,4) AS (requested_quantity * conversion_factor_to_base) STORED,
  approved_quantity DECIMAL(18,4) NULL,
  issued_quantity DECIMAL(18,4) NULL,
  notes VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sdr_items_daily_request
    FOREIGN KEY (daily_request_id) REFERENCES stationery_daily_requests(id),
  CONSTRAINT fk_sdr_items_stock_item
    FOREIGN KEY (stock_item_id) REFERENCES stock_items(id),
  CONSTRAINT fk_sdr_items_unit_type
    FOREIGN KEY (requested_unit_type_id) REFERENCES unit_types(id),
  CONSTRAINT chk_sdr_items_qty_positive
    CHECK (requested_quantity > 0 AND conversion_factor_to_base > 0),
  KEY idx_sdr_items_request (daily_request_id),
  KEY idx_sdr_items_stock_item (stock_item_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stationery_monthly_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id BIGINT UNSIGNED NOT NULL UNIQUE,
  planning_month DATE NOT NULL COMMENT 'Use the first day of target month',
  department_id BIGINT UNSIGNED NOT NULL,
  requester_name_snapshot VARCHAR(150) NOT NULL,
  contact_number VARCHAR(30) NOT NULL,
  description_text VARCHAR(500) NULL,
  notes VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stationery_monthly_requests_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  CONSTRAINT fk_stationery_monthly_requests_department
    FOREIGN KEY (department_id) REFERENCES departments(id),
  KEY idx_stationery_monthly_requests_planning_month (planning_month)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stationery_monthly_request_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  monthly_request_id BIGINT UNSIGNED NOT NULL,
  stock_item_id BIGINT UNSIGNED NOT NULL,
  line_description VARCHAR(255) NULL,
  requested_quantity DECIMAL(18,4) NOT NULL,
  requested_unit_type_id TINYINT UNSIGNED NOT NULL,
  conversion_factor_to_base DECIMAL(18,4) NOT NULL,
  requested_quantity_base DECIMAL(18,4) AS (requested_quantity * conversion_factor_to_base) STORED,
  notes VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_smr_items_monthly_request
    FOREIGN KEY (monthly_request_id) REFERENCES stationery_monthly_requests(id),
  CONSTRAINT fk_smr_items_stock_item
    FOREIGN KEY (stock_item_id) REFERENCES stock_items(id),
  CONSTRAINT fk_smr_items_unit_type
    FOREIGN KEY (requested_unit_type_id) REFERENCES unit_types(id),
  CONSTRAINT chk_smr_items_qty_positive
    CHECK (requested_quantity > 0 AND conversion_factor_to_base > 0),
  KEY idx_smr_items_request (monthly_request_id),
  KEY idx_smr_items_stock_item (stock_item_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cars (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plate_number VARCHAR(30) NOT NULL UNIQUE,
  parking_floor VARCHAR(50) NULL,
  parking_slot_number VARCHAR(50) NULL,
  owner_branch_id BIGINT UNSIGNED NOT NULL,
  engine_number VARCHAR(80) NOT NULL UNIQUE,
  frame_number VARCHAR(80) NOT NULL UNIQUE,
  car_model VARCHAR(120) NOT NULL,
  brand VARCHAR(120) NOT NULL,
  car_image_url VARCHAR(500) NULL,
  color VARCHAR(50) NULL,
  car_status ENUM('AVAILABLE', 'BOOKED', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE') NOT NULL DEFAULT 'AVAILABLE',
  current_meter_reading INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cars_owner_branch
    FOREIGN KEY (owner_branch_id) REFERENCES branches(id),
  KEY idx_cars_status (car_status),
  KEY idx_cars_brand_model (brand, car_model)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS car_booking_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id BIGINT UNSIGNED NOT NULL UNIQUE,
  car_id BIGINT UNSIGNED NOT NULL,
  request_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  booking_date DATE NOT NULL,
  requested_departure_time DATETIME NOT NULL,
  time_out DATETIME NULL,
  time_in DATETIME NULL,
  destination_place VARCHAR(255) NOT NULL,
  meter_out INT UNSIGNED NULL,
  meter_in INT UNSIGNED NULL,
  car_status_on_request ENUM('AVAILABLE', 'BOOKED', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE') NULL,
  car_taker_name VARCHAR(150) NULL,
  car_taker_signature_image_url VARCHAR(500) NULL,
  key_receiver_name VARCHAR(150) NULL,
  key_receiver_signature_image_url VARCHAR(500) NULL,
  meter_out_image_url VARCHAR(500) NULL,
  meter_in_image_url VARCHAR(500) NULL,
  purpose VARCHAR(500) NULL,
  remarks VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_car_booking_requests_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  CONSTRAINT fk_car_booking_requests_car
    FOREIGN KEY (car_id) REFERENCES cars(id),
  CONSTRAINT chk_car_booking_meter
    CHECK (meter_in IS NULL OR meter_out IS NULL OR meter_in >= meter_out),
  CONSTRAINT chk_car_booking_time
    CHECK (time_in IS NULL OR time_out IS NULL OR time_in >= time_out),
  KEY idx_car_booking_requests_booking_date (booking_date),
  KEY idx_car_booking_requests_car (car_id),
  KEY idx_car_booking_requests_departure (requested_departure_time)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW vw_request_monitoring AS
SELECT
  w.id AS workflow_id,
  w.request_number,
  w.request_type,
  w.current_status,
  w.requester_user_id,
  u.full_name AS requester_name,
  w.requester_branch_id,
  b.branch_name,
  w.requester_department_id,
  d.department_name,
  w.submitted_at,
  w.decided_at,
  w.updated_at
FROM workflows w
JOIN users u ON u.id = w.requester_user_id
JOIN branches b ON b.id = w.requester_branch_id
LEFT JOIN departments d ON d.id = w.requester_department_id;

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

INSERT INTO unit_types (unit_code, unit_name)
VALUES
  ('UNIT', 'Unit'),
  ('PACK', 'Pack'),
  ('BOX', 'Box')
ON DUPLICATE KEY UPDATE unit_name = VALUES(unit_name);

SET FOREIGN_KEY_CHECKS = 1;

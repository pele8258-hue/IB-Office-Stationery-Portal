## Database Schema Overview (MySQL 8+)

This folder contains the schema for the Stationery project:

- `schema.sql`: full DDL (tables, constraints, indexes, view, base unit seed data)

## Core Design

The schema is built around a shared workflow engine:

- `workflows`: one row per request (stationery daily, stationery monthly, car booking)
- `workflow_approval_steps`: approval history by step and approver
- `workflow_status_logs`: full request status transition history

This allows one consistent approval and monitoring model for all request types.

## Main Functional Areas

### 1) User / Branch / Department Management

- `branches`
- `departments`
- `users` (includes signature image URL)

### 2) Stock and Item Management

- `unit_types` (UNIT, PACK, BOX)
- `item_categories`
- `stock_items` (includes barcode)
- `stock_item_units` (unit conversion, e.g. 1 BOX = 50 UNIT)
- `branch_item_stock` (stock quantity per branch in base unit)
- `stock_movements` (audit of stock in/out/adjustment/request issue)

### 3) Stationery Request System

- Daily:
  - `stationery_daily_requests`
  - `stationery_daily_request_items`
- Monthly:
  - `stationery_monthly_requests`
  - `stationery_monthly_request_items`

### 4) Car Management + Booking

- `cars` (plate no, parking floor/slot, owner branch, engine/frame no, model/brand, image, color, status)
- `car_booking_requests` (request datetime, booking date, time out/in, departure time, destination, meter in/out, signatures, meter images)

### 5) Request Monitoring

- `vw_request_monitoring` combines common workflow fields with requester, branch, and department information.
- `vw_stock_balance_by_branch` gives stock balance by branch and item.

## How to Run

```bash
mysql -u <user> -p <database_name> < db/schema.sql
```

## Important Usage Notes

1. Use `stock_item_units.units_per_this_unit` to convert request quantity into base unit.
2. Keep `branch_item_stock.quantity_base_units` as your source of truth for inventory.
3. Use request statuses `PENDING`, `APPROVED`, `REJECTED`; insert every transition into `workflow_status_logs`.
4. Insert per-approver decisions into `workflow_approval_steps` for full approval history.
5. Monthly request supports header-level description (`stationery_monthly_requests.description_text`) and item-level quantity/unit (`stationery_monthly_request_items`).

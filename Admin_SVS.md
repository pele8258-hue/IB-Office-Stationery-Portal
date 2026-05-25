# Admin_SVS — Database Documentation

This file must be updated every time the database schema is created, changed, or fixed.

---

## Connection Details

| Setting         | Value                          |
|-----------------|--------------------------------|
| Host            | 10.10.200.112                  |
| Port            | 1521                           |
| SID             | testdb                         |
| User            | PELAY                          |
| Driver          | oracledb v6+ (thin mode)       |
| Connection file | `server/utils/db.js`           |

---

## Schema Change Log

| Date       | Type          | Description                                          | Changed By |
|------------|---------------|------------------------------------------------------|------------|
| 2026-05-20 | Initial setup | Oracle DB connection established                     | PELAY      |
| 2026-05-20 | Create table  | Created branches, departments, roles, permissions, role_permissions, staff | PELAY |
| 2026-05-20 | Create table  | Created resources, staff_resources for per-user page/tab access control    | PELAY |
| 2026-05-20 | Create table  | Created vehicles table with owner details, documents, and expiry tracking  | PELAY |
| 2026-05-20 | Create table  | Created vehicle_requests table for booking, meter, and late return tracking | PELAY |
| 2026-05-20 | Seed data     | Inserted 32 departments from org chart into departments table               | PELAY |
| 2026-05-20 | Seed data     | Inserted branch: 010 - Main Branch (type: HEAD)                             | PELAY |
| 2026-05-20 | Create table  | Created vehicle_request_passengers table to track passengers per request    | PELAY |
| 2026-05-20 | Drop column   | Dropped job_title from staff — duplicated position, use position only       | PELAY |
| 2026-05-22 | Update data   | Renamed resource "Branch Management" → "Organization Management" (code: BRANCHES) | PELAY |
| 2026-05-22 | Drop columns  | Removed 7 inline document columns from vehicles (vehicle_document, road_tax_expiry, road_tax_document, insurance_expiry, insurance_document, lease_expiry, lease_document) | PELAY |
| 2026-05-22 | Create table  | Created vehicle_documents table — stores documents per vehicle with name, issued_date, expiry_date, file_path, uploaded_by | PELAY |
| 2026-05-22 | Add columns   | Added verify_status, reject_reason, verified_by, verified_at to vehicles for vehicle approval workflow (PENDING/APPROVED/REJECTED) | PELAY |
| 2026-05-22 | Add column    | Added request_number (VARCHAR2 30, UNIQUE, NOT NULL) to vehicle_requests — auto-generated as REQ-YYYYMMDD-NNNN via sequence vehicle_request_seq + trigger trg_vr_request_number | PELAY |
| 2026-05-22 | Add columns   | Added soft-delete columns to vehicle_documents: deleted VARCHAR2(1) DEFAULT 'N' NOT NULL, deleted_by NUMBER (FK staff.id), deleted_at TIMESTAMP | PELAY |

---

## Tables

---

### branches

| Column     | Type          | Nullable | Notes                          |
|------------|---------------|----------|--------------------------------|
| id         | NUMBER        | NO       | Primary key, auto-increment    |
| name       | VARCHAR2(100) | NO       | Branch full name               |
| code       | VARCHAR2(20)  | NO       | Unique short code              |
| type       | VARCHAR2(10)  | NO       | `HEAD` or `BRANCH`             |
| status     | VARCHAR2(1)   | NO       | `A` = Active, `I` = Inactive   |
| created_at | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP      |
| updated_at | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP      |

**Constraints:** `uq_branch_code`, `chk_branch_type`, `chk_branch_status`

---

### departments

| Column     | Type          | Nullable | Notes                          |
|------------|---------------|----------|--------------------------------|
| id         | NUMBER        | NO       | Primary key, auto-increment    |
| name       | VARCHAR2(100) | NO       | Department full name           |
| code       | VARCHAR2(20)  | NO       | Unique short code              |
| status     | VARCHAR2(1)   | NO       | `A` = Active, `I` = Inactive   |
| created_at | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP      |
| updated_at | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP      |

**Constraints:** `uq_dept_code`, `chk_dept_status`

---

### roles

| Column      | Type          | Nullable | Notes                          |
|-------------|---------------|----------|--------------------------------|
| id          | NUMBER        | NO       | Primary key, auto-increment    |
| name        | VARCHAR2(50)  | NO       | Role display name              |
| code        | VARCHAR2(20)  | NO       | Unique code (SUPER_ADMIN, MAKER, CHECKER) |
| description | VARCHAR2(255) | YES      | Role description               |
| status      | VARCHAR2(1)   | NO       | `A` = Active, `I` = Inactive   |
| created_at  | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP      |
| updated_at  | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP      |

**Seeded rows:** `SUPER_ADMIN`, `MAKER`, `CHECKER`

---

### permissions

| Column      | Type          | Nullable | Notes                              |
|-------------|---------------|----------|------------------------------------|
| id          | NUMBER        | NO       | Primary key, auto-increment        |
| module      | VARCHAR2(50)  | NO       | Module name (STORE, VEHICLE, STAFF)|
| action      | VARCHAR2(20)  | NO       | Action (VIEW, CREATE, EDIT, DELETE, APPROVE) |
| description | VARCHAR2(255) | YES      | Human-readable description         |
| created_at  | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP          |

**Constraints:** `uq_module_action` (module + action must be unique pair)

**Seeded modules:** `STORE`, `VEHICLE`, `STAFF`

---

### role_permissions

| Column        | Type      | Nullable | Notes                             |
|---------------|-----------|----------|-----------------------------------|
| id            | NUMBER    | NO       | Primary key, auto-increment       |
| role_id       | NUMBER    | NO       | FK → roles.id                     |
| permission_id | NUMBER    | NO       | FK → permissions.id               |
| created_at    | TIMESTAMP | NO       | Default CURRENT_TIMESTAMP         |

**Constraints:** `uq_role_permission` (role_id + permission_id unique pair)

---

### staff

| Column        | Type          | Nullable | Notes                                        |
|---------------|---------------|----------|----------------------------------------------|
| id            | NUMBER        | NO       | Primary key, auto-increment                  |
| name          | VARCHAR2(150) | NO       | Full name                                    |
| email         | VARCHAR2(150) | NO       | Unique, used for login                       |
| password      | VARCHAR2(255) | NO       | Bcrypt hashed                                |
| phone         | VARCHAR2(20)  | YES      | Contact phone number                         |
| position      | VARCHAR2(100) | YES      | Position in the organization                 |
| branch_id     | NUMBER        | NO       | FK → branches.id                             |
| department_id | NUMBER        | NO       | FK → departments.id                          |
| role_id       | NUMBER        | NO       | FK → roles.id                                |
| status        | VARCHAR2(1)   | NO       | `N` = New (first login), `A` = Active, `I` = Inactive |
| created_by    | NUMBER        | YES      | FK → staff.id (who created this account)     |
| created_at    | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                    |
| updated_at    | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                    |

**Status flow:** `N` → staff logs in and sets new password → `A`

**Constraints:** `uq_staff_email`, `chk_staff_status`, FK to branches, departments, roles, staff

---

### resources

| Column      | Type          | Nullable | Notes                                      |
|-------------|---------------|----------|--------------------------------------------|
| id          | NUMBER        | NO       | Primary key, auto-increment                |
| name        | VARCHAR2(100) | NO       | Display name (e.g. "Vehicle Booking")      |
| code        | VARCHAR2(50)  | NO       | Unique code (e.g. `VEHICLE_BOOKING`)       |
| module      | VARCHAR2(50)  | NO       | Parent module (e.g. `VEHICLE`, `STORE`)    |
| description | VARCHAR2(255) | YES      | Description of this page/tab               |
| status      | VARCHAR2(1)   | NO       | `A` = Active, `I` = Inactive               |
| created_at  | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                  |
| updated_at  | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                  |

**Note:** Seeded later when pages/tabs are finalised.

---

### staff_resources

| Column      | Type        | Nullable | Notes                                         |
|-------------|-------------|----------|-----------------------------------------------|
| id          | NUMBER      | NO       | Primary key, auto-increment                   |
| staff_id    | NUMBER      | NO       | FK → staff.id                                 |
| resource_id | NUMBER      | NO       | FK → resources.id                             |
| can_view    | VARCHAR2(1) | NO       | `Y` / `N` — can view this page                |
| can_create  | VARCHAR2(1) | NO       | `Y` / `N` — can create on this page           |
| can_edit    | VARCHAR2(1) | NO       | `Y` / `N` — can edit on this page             |
| can_approve | VARCHAR2(1) | NO       | `Y` / `N` — can approve on this page          |
| created_by  | NUMBER      | YES      | FK → staff.id (who configured this access)    |
| created_at  | TIMESTAMP   | NO       | Default CURRENT_TIMESTAMP                     |
| updated_at  | TIMESTAMP   | NO       | Default CURRENT_TIMESTAMP                     |

**Constraints:** `uq_staff_resource` (staff_id + resource_id unique pair)

---

### vehicles

| Column         | Type          | Nullable | Notes                                             |
|----------------|---------------|----------|---------------------------------------------------|
| id             | NUMBER        | NO       | Primary key, auto-increment                       |
| plate_number   | VARCHAR2(20)  | NO       | Unique vehicle plate number                       |
| part_number    | VARCHAR2(100) | YES      | Internal part reference number                    |
| engine_number  | VARCHAR2(100) | YES      | Engine number                                     |
| frame_number   | VARCHAR2(100) | YES      | Chassis / frame number                            |
| brand          | VARCHAR2(100) | YES      | Vehicle brand (e.g. Toyota)                       |
| model          | VARCHAR2(100) | YES      | Vehicle model (e.g. Hilux)                        |
| color          | VARCHAR2(50)  | YES      | Vehicle color                                     |
| year           | NUMBER(4)     | YES      | Manufacturing year                                |
| type           | VARCHAR2(20)  | YES      | SEDAN / VAN / TRUCK / SUV / PICKUP / OTHER        |
| ownership_type | VARCHAR2(10)  | NO       | `OWN` or `LEASE` — default `OWN`                  |
| parking_lot    | VARCHAR2(50)  | YES      | Parking lot identifier                            |
| parking_floor  | VARCHAR2(10)  | YES      | Parking floor                                     |
| owner_name     | VARCHAR2(150) | YES      | Vehicle owner full name                           |
| owner_email    | VARCHAR2(150) | YES      | Vehicle owner email                               |
| owner_phone    | VARCHAR2(20)  | YES      | Vehicle owner phone                               |
| owner_dob      | DATE          | YES      | Vehicle owner date of birth                       |
| branch_id      | NUMBER        | NO       | FK → branches.id                                  |
| status         | VARCHAR2(20)  | NO       | `AVAILABLE` / `IN_USE` / `MAINTENANCE` / `LEASE_EXPIRED` |
| created_by     | NUMBER        | YES      | FK → staff.id                                     |
| updated_by     | NUMBER        | YES      | FK → staff.id                                     |
| verify_status  | VARCHAR2(10)  | NO       | `PENDING` / `APPROVED` / `REJECTED` — default `PENDING` |
| reject_reason  | VARCHAR2(500) | YES      | Filled when verify_status = `REJECTED`            |
| verified_by    | NUMBER        | YES      | FK → staff.id — who approved or rejected          |
| verified_at    | TIMESTAMP     | YES      | When the verification decision was made           |
| created_at     | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                         |
| updated_at     | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                         |

**Constraints:** `uq_vehicle_plate`, `chk_vehicle_status`, `chk_vehicle_type`, `chk_vehicle_ownership`, `chk_vehicle_verify`, `fk_vehicle_verified`

**Verify flow:** `PENDING` → `APPROVED` or `REJECTED` (with reject_reason filled on rejection)

> **Note (2026-05-22):** Document columns (`vehicle_document`, `road_tax_expiry`, `road_tax_document`, `insurance_expiry`, `insurance_document`, `lease_expiry`, `lease_document`) were dropped and moved to the `vehicle_documents` table.

---

### vehicle_documents

| Column        | Type          | Nullable | Notes                                              |
|---------------|---------------|----------|----------------------------------------------------|
| id            | NUMBER        | NO       | Primary key, auto-increment                        |
| vehicle_id    | NUMBER        | NO       | FK → vehicles.id (cascade delete)                  |
| document_name | VARCHAR2(150) | NO       | e.g. "Registration", "Road Tax", "Insurance"       |
| issued_date   | DATE          | YES      | Date the document was issued                       |
| expiry_date   | DATE          | YES      | Document expiry date                               |
| file_path     | VARCHAR2(500) | YES      | Uploaded image or document file path               |
| uploaded_by   | NUMBER        | YES      | FK → staff.id — who uploaded the document          |
| created_at    | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                          |
| updated_at    | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                          |

**Constraints:** `fk_vd_vehicle` (cascade delete), `fk_vd_uploaded`

**Index:** `idx_vd_vehicle_id` on vehicle_id for fast lookup

---

### vehicle_requests

| Column              | Type          | Nullable | Notes                                                        |
|---------------------|---------------|----------|--------------------------------------------------------------|
| id                  | NUMBER        | NO       | Primary key, auto-increment                                  |
| request_number      | VARCHAR2(30)  | NO       | Unique human-readable ID — auto-generated as `REQ-YYYYMMDD-NNNN` |
| vehicle_id          | NUMBER        | NO       | FK → vehicles.id                                             |
| staff_id            | NUMBER        | NO       | FK → staff.id — who made the request                         |
| driver_id           | NUMBER        | YES      | FK → staff.id — assigned driver (optional)                   |
| purpose             | VARCHAR2(255) | YES      | Reason for the trip                                          |
| destination         | VARCHAR2(255) | YES      | Trip destination                                             |
| passenger_count     | NUMBER(3)     | NO       | Number of passengers — default 0                             |
| request_date        | TIMESTAMP     | NO       | When the request was submitted                               |
| requested_time_out  | TIMESTAMP     | NO       | Planned departure datetime                                   |
| requested_time_in   | TIMESTAMP     | NO       | Planned return datetime                                      |
| actual_time_out     | TIMESTAMP     | YES      | Actual departure datetime (filled on departure)              |
| actual_time_in      | TIMESTAMP     | YES      | Actual return datetime — compare vs requested to track late  |
| meter_before        | NUMBER(10,1)  | YES      | Odometer reading before departure (km)                       |
| meter_after         | NUMBER(10,1)  | YES      | Odometer reading after return (km)                           |
| meter_image_before  | VARCHAR2(500) | YES      | File path — meter photo before going out                     |
| meter_image_after   | VARCHAR2(500) | YES      | File path — meter photo after returning                      |
| approved_by         | NUMBER        | YES      | FK → staff.id — checker who approved                         |
| approved_at         | TIMESTAMP     | YES      | When approved                                                |
| rejected_by         | NUMBER        | YES      | FK → staff.id — checker who rejected                         |
| rejected_at         | TIMESTAMP     | YES      | When rejected                                                |
| reject_reason       | VARCHAR2(500) | YES      | Reason for rejection                                         |
| status              | VARCHAR2(15)  | NO       | `PENDING` / `APPROVED` / `REJECTED` / `IN_USE` / `COMPLETED` / `CANCELLED` |
| notes               | VARCHAR2(500) | YES      | Additional notes                                             |
| created_by          | NUMBER        | YES      | FK → staff.id                                                |
| updated_by          | NUMBER        | YES      | FK → staff.id                                                |
| created_at          | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                                    |
| updated_at          | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                                    |

**Status flow:** `PENDING` → `APPROVED` → `IN_USE` → `COMPLETED`

**Late return tracking:** compare `actual_time_in` vs `requested_time_in` — if `actual_time_in > requested_time_in`, the staff returned late.

---

### vehicle_request_passengers

| Column     | Type      | Nullable | Notes                                          |
|------------|-----------|----------|------------------------------------------------|
| id         | NUMBER    | NO       | Primary key, auto-increment                    |
| request_id | NUMBER    | NO       | FK → vehicle_requests.id                       |
| staff_id   | NUMBER    | NO       | FK → staff.id — the passenger                  |
| created_at | TIMESTAMP | NO       | Default CURRENT_TIMESTAMP                      |

**Constraints:** `uq_vr_passenger` (request_id + staff_id unique — no duplicate passenger per request)

**Note:** `passenger_count` in `vehicle_requests` is updated to match the count of rows in this table per request.

---

## Naming Conventions

- Tables: plural lowercase (e.g. `users`, `products`)
- Columns: snake_case (e.g. `first_name`, `created_at`)
- Primary key: `id`
- Timestamps: `created_at`, `updated_at`

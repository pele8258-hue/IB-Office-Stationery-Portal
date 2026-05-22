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

| Column             | Type          | Nullable | Notes                                             |
|--------------------|---------------|----------|---------------------------------------------------|
| id                 | NUMBER        | NO       | Primary key, auto-increment                       |
| plate_number       | VARCHAR2(20)  | NO       | Unique vehicle plate number                       |
| part_number        | VARCHAR2(100) | YES      | Internal part reference number                    |
| engine_number      | VARCHAR2(100) | YES      | Engine number                                     |
| frame_number       | VARCHAR2(100) | YES      | Chassis / frame number                            |
| brand              | VARCHAR2(100) | YES      | Vehicle brand (e.g. Toyota)                       |
| model              | VARCHAR2(100) | YES      | Vehicle model (e.g. Hilux)                        |
| color              | VARCHAR2(50)  | YES      | Vehicle color                                     |
| year               | NUMBER(4)     | YES      | Manufacturing year                                |
| type               | VARCHAR2(20)  | YES      | SEDAN / VAN / TRUCK / SUV / PICKUP / OTHER        |
| ownership_type     | VARCHAR2(10)  | NO       | `OWN` or `LEASE` — default `OWN`                  |
| vehicle_document   | VARCHAR2(500) | YES      | File path — vehicle registration / grant          |
| parking_lot        | VARCHAR2(50)  | YES      | Parking lot identifier                            |
| parking_floor      | VARCHAR2(10)  | YES      | Parking floor                                     |
| road_tax_expiry    | DATE          | YES      | Road tax expiry date                              |
| road_tax_document  | VARCHAR2(500) | YES      | File path — road tax document                     |
| insurance_expiry   | DATE          | YES      | Insurance expiry date                             |
| insurance_document | VARCHAR2(500) | YES      | File path — insurance document                    |
| lease_expiry       | DATE          | YES      | Lease agreement expiry date (LEASE only)          |
| lease_document     | VARCHAR2(500) | YES      | File path — lease agreement document              |
| owner_name         | VARCHAR2(150) | YES      | Vehicle owner full name                           |
| owner_email        | VARCHAR2(150) | YES      | Vehicle owner email                               |
| owner_phone        | VARCHAR2(20)  | YES      | Vehicle owner phone                               |
| owner_dob          | DATE          | YES      | Vehicle owner date of birth                       |
| branch_id          | NUMBER        | NO       | FK → branches.id                                  |
| status             | VARCHAR2(20)  | NO       | `AVAILABLE` / `IN_USE` / `MAINTENANCE` / `LEASE_EXPIRED` |
| created_by         | NUMBER        | YES      | FK → staff.id                                     |
| updated_by         | NUMBER        | YES      | FK → staff.id                                     |
| created_at         | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                         |
| updated_at         | TIMESTAMP     | NO       | Default CURRENT_TIMESTAMP                         |

**Constraints:** `uq_vehicle_plate`, `chk_vehicle_status`, `chk_vehicle_type`, `chk_vehicle_ownership`

---

### vehicle_requests

| Column              | Type          | Nullable | Notes                                                        |
|---------------------|---------------|----------|--------------------------------------------------------------|
| id                  | NUMBER        | NO       | Primary key, auto-increment                                  |
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

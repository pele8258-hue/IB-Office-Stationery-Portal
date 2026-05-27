# Admin_SVS — API Documentation

This file must be updated every time a new API is created, changed, or fixed.

---

## API List

| No | Module        | Method | URL                                | Auth | Description                                       |
|----|---------------|--------|------------------------------------|------|---------------------------------------------------|
| 1  | Health        | GET    | /api/health                        | No   | Test DB connection                                |
| 2  | Auth          | POST   | /api/auth/login                    | No   | Login and get JWT token                           |
| 3  | Staff         | GET    | /api/staff                         | Yes  | List staff with pagination                        |
| 4  | Staff         | POST   | /api/staff                         | Yes  | Register new staff account                        |
| 5  | Branches      | GET    | /api/branches                      | Yes  | List all active branches                          |
| 6  | Departments   | GET    | /api/departments                   | Yes  | List all active departments                       |
| 7  | Roles         | GET    | /api/roles                         | Yes  | List all active roles                             |
| 8  | Vehicles      | GET    | /api/vehicles                      | Yes  | List vehicles (supports `verify_status` filter)   |
| 9  | Vehicles      | POST   | /api/vehicles/:id/verify           | Yes  | Approve or reject a vehicle (ADMIN/SUPER_ADMIN/CHECKER) |
| 10 | Notifications | POST   | /api/notifications/expiry-check              | Yes  | Manually trigger document expiry email check (SUPER_ADMIN) |
| 11 | Documents     | POST   | /api/vehicles/documents/:id/notify           | Yes  | Send expiry notification email for a specific document     |
| 12 | Notifications | GET    | /api/notifications/email-logs                | Yes  | List paginated email notification history                  |
| 13 | Documents     | GET    | /api/vehicles/documents/expired-count        | Yes  | Get count of currently expired vehicle documents           |
| 14 | Bookings      | GET    | /api/bookings                                | Yes  | List vehicle requests with pagination, search, status filter |
| 15 | Bookings      | POST   | /api/bookings                                | Yes  | Create new vehicle request with passengers. Admin can pass requester_id to submit on behalf of another staff. Fires email notification to all active ADMIN/CHECKER/SUPER_ADMIN. |
| 16 | Bookings      | GET    | /api/bookings/:id                            | Yes  | Get single vehicle request detail (owner or admin only)    |
| 17 | Bookings      | PUT    | /api/bookings/:id                            | Yes  | Update request status: approve/reject/cancel/dispatch/complete. Reject → email to requester. Cancel → email to all ADMIN/CHECKER/SUPER_ADMIN. |
| 18 | Bookings      | POST   | /api/bookings/:id/dispatch                   | Yes  | Record actual departure: actual_time_out, meter_before, photo (APPROVED → IN_USE) |
| 19 | Bookings      | POST   | /api/bookings/:id/complete                   | Yes  | Record actual return: actual_time_in, meter_after, photo (IN_USE → COMPLETED)     |
| 20 | Vehicles      | POST   | /api/vehicles/:id/status                     | Yes  | Manually change vehicle status — ADMIN/CHECKER/SUPER_ADMIN only                   |

---

---

## 1. Health Check — Test DB Connection

**Module:** Health  
**Method:** `GET`  
**URL:** `/api/health`  
**Auth Required:** No  
**File:** `server/api/health.get.js`

### How to Test

**Browser:**
```
http://localhost:3000/api/health
```

**cURL:**
```bash
curl http://localhost:3000/api/health
```

**Postman / Thunder Client:**
- Method: `GET`
- URL: `http://localhost:3000/api/health`
- No headers or body needed

---

### Success Response

```json
{
  "success": true,
  "code": 200,
  "message": "Database connection is healthy",
  "data": {
    "database": "Oracle",
    "status": "connected"
  },
  "timestamp": "2026-05-20T11:30:00.000Z"
}
```

### Error Response (DB down or wrong credentials)

```json
{
  "statusCode": 500,
  "message": "Database connection failed: ORA-01017: invalid username/password"
}
```

---

### Test Cases

| Case                  | Expected Status | Expected Result              |
|-----------------------|-----------------|------------------------------|
| DB is running         | 200             | `status: connected`          |
| Wrong credentials     | 500             | ORA-01017 error message      |
| DB server unreachable | 500             | connection timeout error     |

---

## 2. Login

**Module:** Auth
**Method:** `POST`
**URL:** `/api/auth/login`
**Auth Required:** No
**File:** `server/api/auth/login.post.js`

### Request Body
```json
{
  "email":    "admin@adminsvs.com",
  "password": "Admin@1234"
}
```

### Success Response (200)
```json
{
  "success": true,
  "code": 200,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "user": {
      "id": 1,
      "name": "Super Admin",
      "email": "admin@adminsvs.com",
      "role": "SUPER_ADMIN",
      "branch_id": 1,
      "status": "A"
    }
  },
  "meta": {
    "login_at": "2026-05-20T11:30:00.000Z",
    "require_change": false
  }
}
```

**Note:** If `require_change: true` (status = N), frontend must redirect to `/auth/change-password`.

### Error Responses
**401 — Wrong credentials:** `"Invalid email or password"`
**403 — Inactive account:** `"Account is inactive"`
**422 — Missing fields:** Validation errors

### Test Cases
| Case               | Expected | Notes                              |
|--------------------|----------|------------------------------------|
| Valid credentials  | 200      | Returns token                      |
| Wrong password     | 401      | Same message as wrong email        |
| First login (N)    | 200      | `require_change: true`             |
| Inactive staff     | 403      | Forbidden                          |

---

## 3. Register Staff

**Module:** Staff
**Method:** `POST`
**URL:** `/api/staff`
**Auth Required:** Yes (Bearer Token — SUPER_ADMIN)
**File:** `server/api/staff/index.post.js`

### Request Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body
```json
{
  "name":          "Johndoe",
  "email":         "Johndoe@example.com",
  "phone":         "0123456789",
  "position":      "IT-Dev",
  "job_title":     "Manager",
  "branch_id":     1,
  "department_id": 3,
  "role_id":       2
}
```

### Required Fields
| Field         | Type   | Required |
|---------------|--------|----------|
| name          | String | Yes      |
| email         | String | Yes      |
| branch_id     | Number | Yes      |
| department_id | Number | Yes      |
| role_id       | Number | Yes      |
| phone         | String | No       |
| position      | String | No       |
| job_title     | String | No       |

### Success Response (201)
```json
{
  "success": true,
  "code": 201,
  "message": "Staff registered successfully",
  "data": {
    "staff_id": 1,
    "name": "Ahmad Bin Ali",
    "email": "ahmad@example.com",
    "temp_password": "Xk3@mNpQ2!",
    "status": "N"
  },
  "meta": {
    "created_by": 1,
    "created_at": "2026-05-20T11:30:00.000Z",
    "note": "Staff must change password on first login"
  },
  "timestamp": "2026-05-20T11:30:00.000Z"
}
```

### Error Responses

**422 — Validation Failed**
```json
{
  "success": false,
  "code": 422,
  "message": "Validation failed",
  "errors": {
    "email": ["email is required"],
    "branch_id": ["branch_id is required"]
  },
  "timestamp": "2026-05-20T11:30:00.000Z"
}
```

**409 — Duplicate Email**
```json
{
  "success": false,
  "code": 409,
  "message": "Email already registered",
  "errors": {
    "email": ["This email is already in use"]
  },
  "timestamp": "2026-05-20T11:30:00.000Z"
}
```

### Test Cases
| Case               | Expected Status | Notes                          |
|--------------------|-----------------|--------------------------------|
| Valid data         | 201             | Returns temp_password          |
| Missing email      | 422             | Validation error               |
| Duplicate email    | 409             | Conflict error                 |
| Unauthorized       | 401             | No / invalid token             |

---

## 3. List Branches

**Module:** Branches
**Method:** `GET`
**URL:** `/api/branches`
**Auth Required:** Yes (Bearer Token)
**File:** `server/api/branches/index.get.js`

### Success Response (200)
```json
{
  "success": true,
  "code": 200,
  "message": "Branches retrieved successfully",
  "data": [
    { "id": 1, "name": "Main Branch", "code": "010", "type": "HEAD" }
  ],
  "timestamp": "2026-05-20T11:30:00.000Z"
}
```

---

## 4. List Departments

**Module:** Departments
**Method:** `GET`
**URL:** `/api/departments`
**Auth Required:** Yes (Bearer Token)
**File:** `server/api/departments/index.get.js`

### Success Response (200)
```json
{
  "success": true,
  "code": 200,
  "message": "Departments retrieved successfully",
  "data": [
    { "id": 1, "name": "Administration", "code": "ADMINISTRATION" },
    { "id": 2, "name": "IT Operation",   "code": "IT_OPERATION" }
  ],
  "timestamp": "2026-05-20T11:30:00.000Z"
}
```

---

## DELETE Vehicle Document (Soft Delete)

**Module:** Vehicles – Documents
**Method:** `DELETE`
**URL:** `/api/vehicles/documents/:id`
**Auth Required:** Yes (Bearer Token)
**File:** `server/api/vehicles/documents/[id].delete.js`

### Notes
- Soft delete only: sets `deleted = 'Y'`, `deleted_by`, `deleted_at`. Record stays in DB.
- Documents with `deleted = 'Y'` are excluded from all system queries.
- Run `database/010_vehicle_documents_soft_delete.sql` to add the required columns.

### Success Response (200)
```json
{
  "success": true,
  "code": 200,
  "message": "Document deleted successfully",
  "data": { "id": 5 },
  "timestamp": "2026-05-22T10:00:00.000Z"
}
```

### Error Responses
- `400` — Invalid document ID
- `404` — Document not found (already deleted or never existed)
- `401` — Unauthorized

---

## GET Vehicles (with verify_status filter)

**Module:** Vehicles
**Method:** `GET`
**URL:** `/api/vehicles`
**Auth Required:** Yes (Bearer Token)
**File:** `server/api/vehicles/index.get.js`

### Query Parameters

| Param           | Type   | Required | Description                                        |
|-----------------|--------|----------|----------------------------------------------------|
| page            | number | No       | Page number (default: 1)                           |
| limit           | number | No       | Items per page (default: 10, max: 500)             |
| search          | string | No       | Search by plate, brand, or model                   |
| status          | string | No       | Filter by status (AVAILABLE, IN_USE, etc.)         |
| type            | string | No       | Filter by vehicle type (SEDAN, VAN, etc.)          |
| verify_status   | string | No       | Filter by verify status (PENDING, APPROVED, REJECTED) |

### Example — Pending Vehicles
```
GET /api/vehicles?verify_status=PENDING
```

### Success Response (200)
```json
{
  "success": true,
  "code": 200,
  "message": "Vehicles retrieved successfully",
  "data": [ { "ID": 1, "PLATE_NUMBER": "ກຂ 1234", "VERIFY_STATUS": "PENDING" } ],
  "pagination": { "current_page": 1, "per_page": 10, "total_data": 5, "total_page": 1 },
  "timestamp": "2026-05-25T10:00:00.000Z"
}
```

---

## POST Vehicle Verify (Approve / Reject)

**Module:** Vehicles – Verification
**Method:** `POST`
**URL:** `/api/vehicles/:id/verify`
**Auth Required:** Yes (Bearer Token)
**Allowed Roles:** `ADMIN`, `SUPER_ADMIN`, `CHECKER`
**File:** `server/api/vehicles/[id]/verify.post.js`

### Request Body
```json
{ "action": "APPROVED" }
```
```json
{ "action": "REJECTED", "reject_reason": "Missing chassis number" }
```

| Field         | Type   | Required          | Description                        |
|---------------|--------|-------------------|------------------------------------|
| action        | string | Yes               | `APPROVED` or `REJECTED`           |
| reject_reason | string | If REJECTED       | Reason for rejection               |

### Success Response (200)
```json
{
  "success": true,
  "code": 200,
  "message": "Vehicle approved successfully",
  "data": { "id": 1, "verify_status": "APPROVED" },
  "timestamp": "2026-05-25T10:00:00.000Z"
}
```

### Error Responses
- `400` — Invalid vehicle ID
- `403` — Role not allowed (not ADMIN / SUPER_ADMIN / CHECKER)
- `404` — Vehicle not found
- `422` — action is invalid, or reject_reason missing when REJECTED

---

## POST Notifications — Manual Expiry Check

**Module:** Notifications  
**Method:** `POST`  
**URL:** `/api/notifications/expiry-check`  
**Auth Required:** Yes (Bearer Token — `SUPER_ADMIN` only)  
**File:** `server/api/notifications/expiry-check.post.js`

### Description

Manually triggers the same job that runs automatically every day at 08:00.
The system queries `vehicle_documents` for records near expiry and sends
warning emails to the vehicle owner's email address (`vehicles.owner_email`).

Notification windows:

| Type     | Trigger Condition           | Email Subject Prefix |
|----------|-----------------------------|----------------------|
| 2_MONTHS | 57–63 days before expiry    | [Reminder]           |
| 1_MONTH  | 27–33 days before expiry    | [Notice]             |
| 1_WEEK   | 5–9 days before expiry      | [Urgent]             |
| EXPIRED  | Expired within last 2 days  | [EXPIRED]            |

**Deduplication:** Once a notification type is sent for a document, it will
not be sent again unless the document record is updated (e.g., expiry_date renewed).

### Request Headers
```
Authorization: Bearer <token>
```

### Request Body
None required.

### Success Response (200)
```json
{
  "success": true,
  "code": 200,
  "message": "Expiry notification check completed",
  "data": {
    "2_MONTHS": { "sent": 3, "failed": 0 },
    "1_MONTH":  { "sent": 1, "failed": 0 },
    "1_WEEK":   { "sent": 2, "failed": 1 },
    "EXPIRED":  { "sent": 0, "failed": 0 }
  },
  "timestamp": "2026-05-25T08:00:00.000Z"
}
```

---

## 12. Email Notification Logs — List History

**Module:** Notifications  
**Method:** `GET`  
**URL:** `/api/notifications/email-logs`  
**Auth Required:** Yes (any authenticated staff)

### Query Parameters

| Parameter         | Type   | Required | Description                                         |
|-------------------|--------|----------|-----------------------------------------------------|
| page              | number | No       | Page number (default: 1)                            |
| limit             | number | No       | Records per page (default: 20, max: 100)            |
| search            | string | No       | Search by email, plate number, or document name     |
| status            | string | No       | Filter by status: `SENT` or `FAILED`                |
| notification_type | string | No       | Filter by type: `2_MONTHS`, `1_MONTH`, `1_WEEK`, `EXPIRED` |

### Success Response (200)
```json
{
  "success": true,
  "code": 200,
  "message": "Email logs retrieved successfully",
  "data": [
    {
      "ID": 1,
      "NOTIFICATION_TYPE": "1_WEEK",
      "SENT_TO": "owner@example.com",
      "STATUS": "SENT",
      "ERROR_MESSAGE": null,
      "SENT_AT": "2026-05-25T08:00:00.000Z",
      "VEHICLE_ID": 3,
      "PLATE_NUMBER": "ABC 1234",
      "BRAND": "Toyota",
      "MODEL": "Hilux",
      "OWNER_NAME": "John Doe",
      "DOCUMENT_ID": 7,
      "DOCUMENT_NAME": "Road Tax",
      "EXPIRY_DATE": "2026-06-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_data": 45,
    "total_page": 3,
    "has_next_page": true,
    "has_previous_page": false
  },
  "timestamp": "2026-05-25T10:00:00.000Z"
}
```

### Error Response (401)
```json
{ "success": false, "message": "Unauthorized" }
```

### Error Responses
- `401` — Missing or invalid token
- `403` — Not SUPER_ADMIN
- `500` — Task execution error (e.g. SMTP not configured)

### Test Cases
| Case                      | Expected | Notes                                 |
|---------------------------|----------|---------------------------------------|
| Valid SUPER_ADMIN token   | 200      | Returns sent/failed counts per type   |
| MAKER or CHECKER token    | 403      | Forbidden                             |
| No token                  | 401      | Unauthorized                          |
| SMTP not configured       | 200      | Count shows failed emails             |

---

## POST Document — Send Notification Email

**Module:** Documents  
**Method:** `POST`  
**URL:** `/api/vehicles/documents/:id/notify`  
**Auth Required:** Yes (any authenticated staff)  
**File:** `server/api/vehicles/documents/[id].notify.post.js`

### Description
Sends a one-off expiry notification email for a single document directly to the vehicle's `owner_email`.
Independent from the auto scheduler — always sends, no deduplication check.
The email type (2_MONTHS / 1_MONTH / 1_WEEK / EXPIRED) is automatically determined from the current expiry date.

### Request Headers
```
Authorization: Bearer <token>
```

### Success Response (200)
```json
{
  "success": true,
  "code": 200,
  "message": "Notification sent to owner@example.com",
  "data": {
    "sent_to": "owner@example.com",
    "notification_type": "EXPIRED"
  },
  "timestamp": "2026-05-25T10:00:00.000Z"
}
```

### Error Responses
- `401` — Not authenticated
- `404` — Document not found or already deleted
- `422` — Vehicle has no owner email, or document has no expiry date
- `500` — SMTP send failure

---

## Database Changes — Migration 011

**Table Added:** `email_notifications`  
**Migration File:** `database/011_email_notifications_table.sql`  
**Runner:** `database/migrate11.mjs`

Run with:
```bash
node database/migrate11.mjs
```

### Table: email_notifications

| Column            | Type           | Notes                                      |
|-------------------|----------------|--------------------------------------------|
| id                | NUMBER (PK)    | Auto-generated identity                    |
| vehicle_id        | NUMBER         | FK → vehicles(id) ON DELETE CASCADE        |
| document_id       | NUMBER         | FK → vehicle_documents(id) ON DELETE CASCADE |
| notification_type | VARCHAR2(10)   | 2_MONTHS / 1_MONTH / 1_WEEK / EXPIRED      |
| sent_to           | VARCHAR2(255)  | Recipient email address                    |
| status            | VARCHAR2(10)   | SENT or FAILED (default: SENT)             |
| error_message     | VARCHAR2(1000) | SMTP error details (nullable)              |
| sent_at           | TIMESTAMP      | Default: SYSTIMESTAMP                      |

### New Environment Variables (`.env`)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=Admin SVS <your_email@gmail.com>
```

### Scheduled Task
The system automatically runs `document:expiry-check` every day at **08:00**
using Nitro's built-in scheduler (no external cron required).

---

## 17. PUT Booking — Update Request Status

**Module:** Bookings  
**Method:** PUT  
**URL:** `/api/bookings/:id`  
**Auth Required:** Yes (Bearer Token)  
**File:** `server/api/bookings/[id].put.js`

Handles all status transitions for a vehicle request via the `action` field.

| Action          | From Status         | To Status   | Allowed Roles                        | Email Sent                                                         |
|-----------------|---------------------|-------------|--------------------------------------|--------------------------------------------------------------------|
| approve         | PENDING             | APPROVED    | ADMIN / CHECKER / SUPER_ADMIN        | Requester — approval + vehicle details                             |
| reject          | PENDING             | REJECTED    | ADMIN / CHECKER / SUPER_ADMIN        | **Requester** — rejection reason                                   |
| cancel          | PENDING / REJECTED  | CANCELLED   | Owner only                           | **All active ADMIN / CHECKER / SUPER_ADMIN** — cancellation notice |
| resubmit        | REJECTED            | PENDING     | Owner only                           | —                                                                  |
| dispatch        | APPROVED            | IN_USE      | ADMIN / CHECKER / SUPER_ADMIN        | —                                                                  |
| complete        | IN_USE              | COMPLETED   | ADMIN / CHECKER / SUPER_ADMIN        | —                                                                  |
| revert          | APPROVED            | PENDING     | ADMIN / CHECKER / SUPER_ADMIN        | —                                                                  |
| revert_dispatch | IN_USE              | APPROVED    | ADMIN / CHECKER / SUPER_ADMIN        | —                                                                  |
| change_vehicle  | APPROVED / IN_USE   | (same)      | ADMIN / SUPER_ADMIN                  | —                                                                  |
| update_details  | PENDING / REJECTED  | (same)      | Owner or ADMIN                       | —                                                                  |

### Request Body Examples

**Approve:**
```json
{ "action": "approve", "vehicle_id": 3 }
```

**Reject:**
```json
{ "action": "reject", "reject_reason": "Vehicle not available for requested time" }
```

**Cancel:**
```json
{ "action": "cancel" }
```

### Request Fields

| Field         | Type   | Required                    | Description                        |
|---------------|--------|-----------------------------|------------------------------------|
| action        | string | Yes                         | One of the actions listed above    |
| vehicle_id    | number | If approve / change_vehicle | Vehicle to assign                  |
| reject_reason | string | If reject                   | Reason shown to requester in email |

### Success Response (200)
```json
{
  "success": true,
  "code": 200,
  "message": "Request approvedd successfully",
  "data": { "id": 5 },
  "meta": { "updated_by": 1, "updated_at": "2026-05-27T08:00:00.000Z" },
  "timestamp": "2026-05-27T08:00:00.000Z"
}
```

### Error Responses
- `400` — Invalid ID or unknown action
- `401` — Not authenticated
- `403` — Role not allowed for this action
- `404` — Request not found
- `422` — Status transition not allowed, or required field missing

### Email Notifications (updated 2026-05-27)
- **reject** → sends email to the **requester** with rejection reason and request details
- **cancel** → sends email to all **active ADMIN / CHECKER / SUPER_ADMIN** with cancellation notice

---

## 18. POST Booking Dispatch — Record Trip Departure

**Module:** Bookings  
**Method:** POST  
**URL:** `/api/bookings/:id/dispatch`  
**Auth Required:** Yes (any authenticated staff)

Transitions a booking from `APPROVED` → `IN_USE`. Records the actual departure time and starting meter reading. Accessible by all roles (maker, checker, admin, super admin).

### Request (multipart/form-data)

| Field            | Type   | Required | Notes                              |
|------------------|--------|----------|------------------------------------|
| actual_time_out  | string | Yes      | Format: `YYYY-MM-DDTHH:MM`         |
| meter_before     | number | Yes      | Starting odometer reading in km    |
| photo            | file   | No       | jpg/jpeg/png/webp — departure photo |

### Sample Response

```json
{
  "success": true,
  "code": 200,
  "message": "Trip departure recorded successfully",
  "data": { "id": 5, "status": "IN_USE" },
  "meta": { "recorded_by": 3, "recorded_at": "2026-05-25T08:30:00.000Z" },
  "timestamp": "2026-05-25T08:30:00.000Z"
}
```

### Error Responses

| Code | Message |
|------|---------|
| 401  | Unauthorized |
| 404  | Request not found |
| 422  | Only APPROVED requests can be dispatched |
| 422  | Validation failed (actual_time_out / meter_before required) |

---

## 19. POST Booking Complete — Record Trip Return

**Module:** Bookings  
**Method:** POST  
**URL:** `/api/bookings/:id/complete`  
**Auth Required:** Yes (any authenticated staff)

Transitions a booking from `IN_USE` → `COMPLETED`. Records the actual return time and ending meter reading. Also sets the assigned vehicle back to `AVAILABLE`. Accessible by all roles.

### Request (multipart/form-data)

| Field          | Type   | Required | Notes                              |
|----------------|--------|----------|------------------------------------|
| actual_time_in | string | Yes      | Format: `YYYY-MM-DDTHH:MM`         |
| meter_after    | number | Yes      | Ending odometer reading in km      |
| photo          | file   | No       | jpg/jpeg/png/webp — return photo    |

### Sample Response

```json
{
  "success": true,
  "code": 200,
  "message": "Trip return recorded successfully",
  "data": { "id": 5, "status": "COMPLETED" },
  "meta": { "recorded_by": 3, "recorded_at": "2026-05-25T11:45:00.000Z" },
  "timestamp": "2026-05-25T11:45:00.000Z"
}
```

### Error Responses

| Code | Message |
|------|---------|
| 401  | Unauthorized |
| 404  | Request not found |
| 422  | Only IN_USE requests can be completed |
| 422  | Validation failed (actual_time_in / meter_after required) |

---

## Database Changes — Migration 014

**Columns Added to:** `vehicle_requests`  
**Migration File:** `database/migrate14.mjs`

Run with:
```bash
node database/migrate14.mjs
```

### Columns Added

| Column         | Type           | Notes                              |
|----------------|----------------|------------------------------------|
| meter_before   | NUMBER         | Odometer at trip start (km)        |
| meter_after    | NUMBER         | Odometer at trip end (km)          |
| time_out_photo | VARCHAR2(500)  | File path for departure photo      |
| time_in_photo  | VARCHAR2(500)  | File path for return photo         |

---

## 20. POST Vehicle Status — Manual Override

**Module:** Vehicles  
**Method:** POST  
**URL:** `/api/vehicles/:id/status`  
**Auth Required:** Yes — ADMIN, CHECKER, SUPER_ADMIN only

Allows privileged users to manually override a vehicle's operational status. Useful for correcting status discrepancies or marking a vehicle under maintenance.

### Request Body (JSON)

| Field  | Type   | Required | Notes                                               |
|--------|--------|----------|-----------------------------------------------------|
| status | string | Yes      | AVAILABLE / IN_USE / MAINTENANCE / LEASE_EXPIRED    |

### Test Data

```json
{ "status": "MAINTENANCE" }
```

### Sample Response

```json
{
  "success": true,
  "code": 200,
  "message": "Vehicle status updated successfully",
  "data": { "id": 3, "status": "MAINTENANCE" },
  "meta": { "updated_by": 1, "updated_at": "2026-05-25T10:00:00.000Z" },
  "timestamp": "2026-05-25T10:00:00.000Z"
}
```

### Error Responses

| Code | Message |
|------|---------|
| 401  | Unauthorized |
| 403  | Permission denied — only Admin/Checker/Super Admin |
| 404  | Vehicle not found |
| 422  | Status must be one of: AVAILABLE, IN_USE, MAINTENANCE, LEASE_EXPIRED |
| 422  | Vehicle is already {status} |

---

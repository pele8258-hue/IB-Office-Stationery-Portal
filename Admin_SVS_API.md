# Admin_SVS — API Documentation

This file must be updated every time a new API is created, changed, or fixed.

---

## API List

| No | Module      | Method | URL                | Auth | Description                    |
|----|-------------|--------|--------------------|------|--------------------------------|
| 1  | Health      | GET    | /api/health        | No   | Test DB connection             |
| 2  | Auth        | POST   | /api/auth/login    | No   | Login and get JWT token        |
| 3  | Staff       | GET    | /api/staff         | Yes  | List staff with pagination     |
| 4  | Staff       | POST   | /api/staff         | Yes  | Register new staff account     |
| 5  | Branches    | GET    | /api/branches      | Yes  | List all active branches       |
| 6  | Departments | GET    | /api/departments   | Yes  | List all active departments    |
| 7  | Roles       | GET    | /api/roles         | Yes  | List all active roles          |

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

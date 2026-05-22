# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Build for production
npm run generate   # Static site generation
npm run preview    # Preview production build locally
```

## Architecture

This is a **Nuxt 4** application with Vue 3, using the `app/` directory layout (Nuxt 4 default). TypeScript is configured via Nuxt's auto-generated `.nuxt/tsconfig.*.json` files — do not edit `tsconfig.json` directly.

**Key dependency:** `oracledb` is included for Oracle Database connectivity. Server-side DB logic belongs in `server/` (API routes, utilities, middleware). OracleDB calls must run server-side only — never import `oracledb` in Vue components or `app/` code.

**Nuxt 4 conventions:**
- Pages go in `app/pages/`, components in `app/components/`, composables in `app/composables/`
- Server API routes go in `server/api/`, server utilities in `server/utils/`
- Auto-imports are active for Vue, Nuxt composables, and anything in `app/composables/` and `app/utils/`
- `nuxt.config.ts` has devtools enabled — this is intentional for development
## Tech Stack

**Frontend:** Nuxt 4, Vue 3, TailwindCSS, Pinia  
**Backend:** Nuxt Nitro server routes (no separate Express server)  
**Database:** Oracle (via `oracledb`)

## Project Structure

```
admin-svs/
├── app/
│   ├── app.vue               # Root layout
│   ├── pages/                # File-based routing
│   ├── components/           # Vue components (auto-imported)
│   ├── composables/          # Shared composables (auto-imported)
│   ├── stores/               # Pinia stores
│   └── assets/               # Static assets (CSS, images)
├── server/
│   ├── api/                  # REST API endpoints (e.g. /api/users.get.ts)
│   ├── utils/                # Server-only utilities (DB connection pool, helpers)
│   └── middleware/           # Server middleware
├── public/                   # Served as-is (favicon, robots.txt)
└── nuxt.config.ts
```

**Key conventions:**
- `server/utils/db.js` holds the OracleDB connection pool — imported only by server code
- API routes follow Nitro naming: `server/api/[resource].[method].js` (e.g. `users.get.js`, `users.post.js`)
- Pinia stores live in `app/stores/` and are auto-imported via Nuxt modules
- TailwindCSS is configured via `@nuxtjs/tailwindcss` module in `nuxt.config.ts`

## Database Connection

**Oracle DB** — connected via `oracledb` v6+ in **thin mode** (no Oracle Instant Client required).

| Setting        | Value                          |
|----------------|--------------------------------|
| Host           | 10.10.200.112                  |
| Port           | 1521                           |
| SID            | testdb                         |
| User           | PELAY                          |

Connection string format (used in `.env`):
```
(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=10.10.200.112)(PORT=1521))(CONNECT_DATA=(SID=testdb)))
```

Credentials are loaded from `.env` (gitignored). See `.env.example` for the required variables:
```
DB_USER=
DB_PASSWORD=
DB_CONNECT_STRING=
```

The pool is initialized lazily on first use via `server/utils/db.js`. Use `query()` for SELECT and `execute()` for INSERT/UPDATE/DELETE. All results are returned as plain objects (`OUT_FORMAT_OBJECT`).

# Coding Rules

## General Rules

- Use clean and readable code
- Use async/await
- Use camelCase naming
- Keep functions small
- Separate controller and route logic
- Use reusable components
- Avoid duplicated code
- Do not delete without permission

# Frontend Rules

## Nuxt Rules

- Use Composition API
- Use `<script setup>`
- Keep pages clean
- Reusable UI in components
- Use Pinia for state management
- Use TailwindCSS for styling
- Responsive to mobile Ipad and Desktop

# Backend Rules

## Express Rules

- Routes only handle endpoints
- Controllers handle logic
- Services handle business logic
- Database queries separated
- Always use try/catch

# Database Rules

## Naming Convention

### Tables
- plural lowercase

### Columns
- snake_case

### Primary Key
- id

### Timestamp
- created_at
- updated_at

# Authentication Rules

- JWT Authentication
- Password must be hashed
- Use middleware protection
- Never expose password

# Upload Rules

## Upload Folder

```txt
/backend/uploads
```

## Image Upload 
- must be webp and low size

## Allowed File Types

- jpg
- jpeg
- png
- pdf
- webp

# Security Rules

- Validate all request data
- Use environment variables
- Never hardcode passwords
- Sanitize user input
- Enable CORS properly

# Git Rules

## Branch Naming

```txt
feature/module-name
fix/bug-name
```

## Commit Style

```txt
feat: add login api
fix: resolve auth middleware
update: improve dashboard ui
```

---

# Recommended Packages

## Frontend

```bash
npm install @pinia/nuxt
npm install @nuxtjs/tailwindcss
```

## Backend

```bash
npm install express cors dotenv mysql2
npm install jsonwebtoken bcryptjs multer joi
```

---

# Development Commands

## Frontend

```bash
npm run dev
```

## Backend

```bash
npm run dev
```

---

# API Standard

## GET

```txt
GET /users
```

## POST

```txt
POST /users
```

## PUT

```txt
PUT /users/:id
```

## DELETE

```txt
DELETE /users/:id
```

---

# Project Goals

- Clean architecture
- Scalable system
- Easy maintenance
- Fast API response
- Modern UI
- Secure authentication
- Reusable components

---

# Notes

- Always check API response structure
- Keep frontend and backend separated
- Write modular code
- Optimize database queries
- Use pagination for large data
- Keep UI responsive
```

# Database Change Rules

## Important Rule

Every time the database is changed, updated, fixed, or modified, you MUST update:

```txt
/Admin_SVS.md
```

---

# Changes That Must Be Recorded

## Table Changes
- Create table
- Drop table
- Rename table

## Column Changes
- Add column
- Remove column
- Rename column
- Change datatype
- Change default value

## Data Changes
- Update important records
- Bulk update
- Data migration
- Status changes

## SQL Changes
- New query
- Query optimization
- Stored procedure changes
- Trigger changes

## Bug Fixes
- Fix relation issue
- Fix foreign key issue
- Fix duplicate data
- Fix constraint issue

# API Documentation Rules

## Important Rule

Every time a new API is created, updated, fixed, or changed:

You MUST:

1. Create API in separate route/controller file
2. Add clear comments in code
3. Update:

```txt
/Admin_SVS_API.md
```

This is required so testers and developers can test APIs easily.

---

# API File Structure Rules

## Backend Structure

# API Code Comment Rules

## Every API must include:

- API purpose
- Request method
- Required parameters
- Response example
- Author or module note

# Admin_SVS_API.md Rules

## Important

Every API MUST be documented in:

```txt
/Admin_SVS_API.md
```

---

# Required API Documentation

## Must Include

- API Name
- Method
- URL
- Request Body
- Headers
- Test Data
- Sample Response
- Error Response
- Notes
- Module Name
- Authentication Requirement

---
# API Development Rules

## Every API must have

- Validation
- try/catch
- Status code
- Error handling
- Clear response format
- Comments
- Documentation

---

# Testing Rules

## Tester must be able to

- Copy API URL directly
- Copy request body directly
- See expected response
- Test error cases
- Understand auth requirement quickly

---

# Required Test Cases

## GET API
- Normal request
- Unauthorized request
- Invalid parameter

## POST API
- Success create
- Empty field
- Invalid field
- Duplicate data

## PUT API
- Success update
- Invalid ID
- Missing field

## DELETE API
- Success delete
- Invalid ID
- Already deleted

---

# API Response Standard

# Success Response Standard

## Basic Success

```json
{
  "success": true,
  "code": 200,
  "message": "Request completed successfully",
  "data": {},
  "timestamp": "2026-05-20T11:30:00Z"
}
```

---

# Success Response With Pagination

## Example: Users List

```json
{
  "success": true,
  "code": 200,
  "message": "Users retrieved successfully",
  "data": [
    {
      "user_id": 1,
      "name": "Pele",
      "email": "pele@example.com",
      "status": "ACTIVE"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total_data": 100,
    "total_page": 10,
    "has_next_page": true,
    "has_previous_page": false
  },
  "timestamp": "2026-05-20T11:30:00Z"
}
```

---

# Success Response For Create API

## Example: Create User

```json
{
  "success": true,
  "code": 201,
  "message": "User created successfully",
  "data": {
    "user_id": 15,
    "name": "Test User",
    "email": "test@example.com"
  },
  "meta": {
    "created_by": "ADMIN",
    "created_at": "2026-05-20T11:30:00Z"
  }
}
```

---

# Success Response For Update API

```json
{
  "success": true,
  "code": 200,
  "message": "User updated successfully",
  "data": {
    "user_id": 15,
    "updated_fields": [
      "name",
      "email",
      "status"
    ]
  },
  "meta": {
    "updated_by": "ADMIN",
    "updated_at": "2026-05-20T11:35:00Z"
  }
}
```

---

# Success Response For Delete API

## Soft Delete

```json
{
  "success": true,
  "code": 200,
  "message": "User deleted successfully",
  "data": {
    "user_id": 15,
    "deleted_status": true
  },
  "meta": {
    "deleted_by": "ADMIN",
    "deleted_at": "2026-05-20T11:40:00Z"
  }
}
```

---

# Login Success Response

## JWT Authentication

```json
{
  "success": true,
  "code": 200,
  "message": "Login successful",
  "data": {
    "access_token": "jwt_token_here",
    "refresh_token": "refresh_token_here",
    "token_type": "Bearer",
    "expires_in": 86400,
    "user": {
      "user_id": 1,
      "name": "Pele",
      "email": "pele@example.com",
      "role": "ADMIN"
    }
  },
  "meta": {
    "login_at": "2026-05-20T11:45:00Z",
    "ip_address": "127.0.0.1"
  }
}
```

---

# Validation Error Response

## Example

```json
{
  "success": false,
  "code": 422,
  "message": "Validation failed",
  "errors": {
    "email": [
      "Email is required",
      "Email format is invalid"
    ],
    "password": [
      "Password must be at least 8 characters"
    ]
  },
  "timestamp": "2026-05-20T11:50:00Z"
}
```

---

# Unauthorized Response

```json
{
  "success": false,
  "code": 401,
  "message": "Unauthorized access",
  "errors": {
    "token": [
      "Invalid token"
    ]
  }
}
```

---

# Forbidden Response

```json
{
  "success": false,
  "code": 403,
  "message": "Permission denied",
  "errors": {
    "permission": [
      "You do not have permission to access this module"
    ]
  }
}
```

---

# Not Found Response

```json
{
  "success": false,
  "code": 404,
  "message": "User not found",
  "errors": {
    "user_id": [
      "No user found with this ID"
    ]
  }
}
```

---

# Database Error Response

```json
{
  "success": false,
  "code": 500,
  "message": "Database error occurred",
  "errors": {
    "database": [
      "Duplicate entry found"
    ]
  },
  "trace_id": "ERR-DB-20260520-001"
}
```

---

# Recommended HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Server Error |

---

# Advanced API Rules

## Required In Every Response

- success
- code
- message
- timestamp

---

# Optional Advanced Fields

## meta

Used for:
- created_by
- updated_by
- request_id
- execution_time

---

# pagination

Used for:
- list API
- search API
- filter API

---

# errors

Used for:
- validation
- system errors
- permission issues

---

# trace_id

Used for:
- backend debugging
- error tracking
- production monitoring

---

# Recommended Naming Convention

## Boolean

```json
"is_active": true
```

## Status

```json
"status": "ACTIVE"
```

## Date Time

```json
"created_at": "2026-05-20T11:30:00Z"
```

---

# Enterprise API Standards

## Every API Should Have

- Request validation
- Authentication
- Authorization
- Pagination
- Search support
- Filter support
- Sorting support
- Logging
- Error handling
- Trace ID
- API documentation
- Test data example
- Response standard

# Important Notes

- Never create all APIs in one file
- Separate module by file
- Keep API modular
- Keep documentation updated
- Keep test data updated
- Add comments for important logic
- Update Admin_SVS_API.md immediately after API changes
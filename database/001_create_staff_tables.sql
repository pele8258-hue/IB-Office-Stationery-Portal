-- ============================================================
-- Migration : 001_create_staff_tables.sql
-- Description: Create branches, departments, roles, permissions,
--              role_permissions, and staff tables
-- Author     : PELAY
-- Date       : 2026-05-20
-- ============================================================


-- ------------------------------------------------------------
-- 1. BRANCHES
-- ------------------------------------------------------------
CREATE TABLE branches (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR2(100)  NOT NULL,
    code        VARCHAR2(20)   NOT NULL,
    type        VARCHAR2(10)   DEFAULT 'BRANCH' NOT NULL,
    status      VARCHAR2(1)    DEFAULT 'A'      NOT NULL,
    created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_code  UNIQUE (code),
    CONSTRAINT chk_branch_type CHECK (type   IN ('HEAD', 'BRANCH')),
    CONSTRAINT chk_branch_status CHECK (status IN ('A', 'I'))
);


-- ------------------------------------------------------------
-- 2. DEPARTMENTS
-- ------------------------------------------------------------
CREATE TABLE departments (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR2(100)  NOT NULL,
    code        VARCHAR2(20)   NOT NULL,
    status      VARCHAR2(1)    DEFAULT 'A' NOT NULL,
    created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept_code    UNIQUE (code),
    CONSTRAINT chk_dept_status CHECK (status IN ('A', 'I'))
);


-- ------------------------------------------------------------
-- 3. ROLES
-- ------------------------------------------------------------
CREATE TABLE roles (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR2(50)   NOT NULL,
    code        VARCHAR2(20)   NOT NULL,
    description VARCHAR2(255),
    status      VARCHAR2(1)    DEFAULT 'A' NOT NULL,
    created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_code    UNIQUE (code),
    CONSTRAINT chk_role_status CHECK (status IN ('A', 'I'))
);


-- ------------------------------------------------------------
-- 4. PERMISSIONS
-- ------------------------------------------------------------
CREATE TABLE permissions (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module      VARCHAR2(50)   NOT NULL,
    action      VARCHAR2(20)   NOT NULL,
    description VARCHAR2(255),
    created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_module_action UNIQUE (module, action)
);


-- ------------------------------------------------------------
-- 5. ROLE_PERMISSIONS  (which role can do what)
-- ------------------------------------------------------------
CREATE TABLE role_permissions (
    id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id       NUMBER NOT NULL,
    permission_id NUMBER NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rp_role       FOREIGN KEY (role_id)       REFERENCES roles(id),
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id),
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);


-- ------------------------------------------------------------
-- 6. STAFF
-- ------------------------------------------------------------
CREATE TABLE staff (
    id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR2(150)  NOT NULL,
    email         VARCHAR2(150)  NOT NULL,
    password      VARCHAR2(255)  NOT NULL,
    phone         VARCHAR2(20),
    position      VARCHAR2(100),
    job_title     VARCHAR2(100),
    branch_id     NUMBER         NOT NULL,
    department_id NUMBER         NOT NULL,
    role_id       NUMBER         NOT NULL,
    -- N = New (must change password on first login)
    -- A = Active
    -- I = Inactive
    status        VARCHAR2(1)    DEFAULT 'N' NOT NULL,
    created_by    NUMBER,
    created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_staff_email       UNIQUE (email),
    CONSTRAINT chk_staff_status     CHECK (status IN ('N', 'A', 'I')),
    CONSTRAINT fk_staff_branch      FOREIGN KEY (branch_id)     REFERENCES branches(id),
    CONSTRAINT fk_staff_department  FOREIGN KEY (department_id) REFERENCES departments(id),
    CONSTRAINT fk_staff_role        FOREIGN KEY (role_id)       REFERENCES roles(id),
    CONSTRAINT fk_staff_created_by  FOREIGN KEY (created_by)    REFERENCES staff(id)
);


-- ============================================================
-- SEED DATA
-- ============================================================

-- Roles
INSERT INTO roles (name, code, description) VALUES ('Super Admin', 'SUPER_ADMIN', 'IT team - full access to everything');
INSERT INTO roles (name, code, description) VALUES ('Maker',       'MAKER',       'Can create and edit records');
INSERT INTO roles (name, code, description) VALUES ('Checker',     'CHECKER',     'Can view and approve records');

-- Permissions (module + action pairs)
-- STORE module
INSERT INTO permissions (module, action, description) VALUES ('STORE', 'VIEW',    'View store data');
INSERT INTO permissions (module, action, description) VALUES ('STORE', 'CREATE',  'Create store record');
INSERT INTO permissions (module, action, description) VALUES ('STORE', 'EDIT',    'Edit store record');
INSERT INTO permissions (module, action, description) VALUES ('STORE', 'DELETE',  'Delete store record');
INSERT INTO permissions (module, action, description) VALUES ('STORE', 'APPROVE', 'Approve store record');

-- VEHICLE module
INSERT INTO permissions (module, action, description) VALUES ('VEHICLE', 'VIEW',    'View vehicle data');
INSERT INTO permissions (module, action, description) VALUES ('VEHICLE', 'CREATE',  'Create vehicle record');
INSERT INTO permissions (module, action, description) VALUES ('VEHICLE', 'EDIT',    'Edit vehicle record');
INSERT INTO permissions (module, action, description) VALUES ('VEHICLE', 'DELETE',  'Delete vehicle record');
INSERT INTO permissions (module, action, description) VALUES ('VEHICLE', 'APPROVE', 'Approve vehicle record');

-- STAFF module
INSERT INTO permissions (module, action, description) VALUES ('STAFF', 'VIEW',   'View staff data');
INSERT INTO permissions (module, action, description) VALUES ('STAFF', 'CREATE', 'Create staff account');
INSERT INTO permissions (module, action, description) VALUES ('STAFF', 'EDIT',   'Edit staff account');
INSERT INTO permissions (module, action, description) VALUES ('STAFF', 'DELETE', 'Delete staff account');

COMMIT;

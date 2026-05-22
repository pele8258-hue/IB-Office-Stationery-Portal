-- ============================================================
-- Migration : 002_add_resources_tables.sql
-- Description: Add resources and staff_resources tables for
--              per-user page/tab access control
-- Author     : PELAY
-- Date       : 2026-05-20
-- ============================================================


-- ------------------------------------------------------------
-- 1. RESOURCES  (pages / tabs in the system)
-- ------------------------------------------------------------
CREATE TABLE resources (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR2(100)  NOT NULL,
    code        VARCHAR2(50)   NOT NULL,
    module      VARCHAR2(50)   NOT NULL,
    description VARCHAR2(255),
    status      VARCHAR2(1)    DEFAULT 'A' NOT NULL,
    created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_resource_code    UNIQUE (code),
    CONSTRAINT chk_resource_status CHECK (status IN ('A', 'I'))
);


-- ------------------------------------------------------------
-- 2. STAFF_RESOURCES  (per-user resource access config)
-- ------------------------------------------------------------
CREATE TABLE staff_resources (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    staff_id    NUMBER      NOT NULL,
    resource_id NUMBER      NOT NULL,
    can_view    VARCHAR2(1) DEFAULT 'N' NOT NULL,
    can_create  VARCHAR2(1) DEFAULT 'N' NOT NULL,
    can_edit    VARCHAR2(1) DEFAULT 'N' NOT NULL,
    can_approve VARCHAR2(1) DEFAULT 'N' NOT NULL,
    created_by  NUMBER,
    created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_staff_resource      UNIQUE (staff_id, resource_id),
    CONSTRAINT chk_sr_can_view        CHECK (can_view    IN ('Y', 'N')),
    CONSTRAINT chk_sr_can_create      CHECK (can_create  IN ('Y', 'N')),
    CONSTRAINT chk_sr_can_edit        CHECK (can_edit    IN ('Y', 'N')),
    CONSTRAINT chk_sr_can_approve     CHECK (can_approve IN ('Y', 'N')),
    CONSTRAINT fk_sr_staff            FOREIGN KEY (staff_id)    REFERENCES staff(id),
    CONSTRAINT fk_sr_resource         FOREIGN KEY (resource_id) REFERENCES resources(id),
    CONSTRAINT fk_sr_created_by       FOREIGN KEY (created_by)  REFERENCES staff(id)
);

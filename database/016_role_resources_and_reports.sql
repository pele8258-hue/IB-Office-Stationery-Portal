-- ============================================================
-- Migration : 016_role_resources_and_reports.sql
-- Description: Create role_resources table (role-based resource
--              access matrix) and seed the REPORTS resource
-- Author     : PELAY
-- Date       : 2026-05-26
-- ============================================================

-- ------------------------------------------------------------
-- 1. ROLE_RESOURCES  (role → resource permission matrix)
-- ------------------------------------------------------------
CREATE TABLE role_resources (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id     NUMBER    NOT NULL,
    resource_id NUMBER    NOT NULL,
    can_view    NUMBER(1) DEFAULT 0 NOT NULL,
    can_create  NUMBER(1) DEFAULT 0 NOT NULL,
    can_edit    NUMBER(1) DEFAULT 0 NOT NULL,
    can_delete  NUMBER(1) DEFAULT 0 NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_resource  UNIQUE (role_id, resource_id),
    CONSTRAINT fk_rr_role        FOREIGN KEY (role_id)     REFERENCES roles(id),
    CONSTRAINT fk_rr_resource    FOREIGN KEY (resource_id) REFERENCES resources(id),
    CONSTRAINT chk_rr_view       CHECK (can_view   IN (0, 1)),
    CONSTRAINT chk_rr_create     CHECK (can_create IN (0, 1)),
    CONSTRAINT chk_rr_edit       CHECK (can_edit   IN (0, 1)),
    CONSTRAINT chk_rr_delete     CHECK (can_delete IN (0, 1))
);

-- ------------------------------------------------------------
-- 2. Seed REPORTS resource
-- ------------------------------------------------------------
INSERT INTO resources (name, code, module, description)
VALUES ('Vehicle Reports', 'REPORTS', 'ADMIN', 'Access to vehicle request and department reports');

COMMIT;

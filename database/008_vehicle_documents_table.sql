-- ============================================================
-- Migration : 008_vehicle_documents_table.sql
-- Description: Remove inline document columns from vehicles and
--              move to a dedicated vehicle_documents table so
--              multiple documents (with name, issued date,
--              expiry date, image, uploaded_by) can be attached
--              per vehicle.
-- Author     : PELAY
-- Date       : 2026-05-22
-- ============================================================


-- ------------------------------------------------------------
-- 1. Drop old document columns from vehicles
-- ------------------------------------------------------------
ALTER TABLE vehicles DROP (
    vehicle_document,
    road_tax_expiry,
    road_tax_document,
    insurance_expiry,
    insurance_document,
    lease_expiry,
    lease_document
);


-- ------------------------------------------------------------
-- 2. Create vehicle_documents table
-- ------------------------------------------------------------
CREATE TABLE vehicle_documents (
    id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id    NUMBER         NOT NULL,
    document_name VARCHAR2(150)  NOT NULL,
    issued_date   DATE,
    expiry_date   DATE,
    file_path     VARCHAR2(500),
    uploaded_by   NUMBER,
    created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vd_vehicle    FOREIGN KEY (vehicle_id)  REFERENCES vehicles(id) ON DELETE CASCADE,
    CONSTRAINT fk_vd_uploaded   FOREIGN KEY (uploaded_by) REFERENCES staff(id)
);

CREATE INDEX idx_vd_vehicle_id ON vehicle_documents (vehicle_id);

COMMIT;

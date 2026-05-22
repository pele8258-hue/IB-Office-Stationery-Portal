-- ============================================================
-- Migration : 003_create_vehicles_table.sql
-- Description: Create vehicles table (includes owner details)
-- Author     : PELAY
-- Date       : 2026-05-20
-- ============================================================

CREATE TABLE vehicles (
    id                   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Vehicle details
    plate_number         VARCHAR2(20)   NOT NULL,
    part_number          VARCHAR2(100),
    engine_number        VARCHAR2(100),
    frame_number         VARCHAR2(100),
    brand                VARCHAR2(100),
    model                VARCHAR2(100),
    color                VARCHAR2(50),
    year                 NUMBER(4),
    type                 VARCHAR2(20),
    ownership_type       VARCHAR2(10)   DEFAULT 'OWN' NOT NULL,

    -- Vehicle registration document
    vehicle_document     VARCHAR2(500),

    -- Parking location
    parking_lot          VARCHAR2(50),
    parking_floor        VARCHAR2(10),

    -- Road tax
    road_tax_expiry      DATE,
    road_tax_document    VARCHAR2(500),

    -- Insurance
    insurance_expiry     DATE,
    insurance_document   VARCHAR2(500),

    -- Lease agreement
    lease_expiry         DATE,
    lease_document       VARCHAR2(500),

    -- Owner details
    owner_name           VARCHAR2(150),
    owner_email          VARCHAR2(150),
    owner_phone          VARCHAR2(20),
    owner_dob            DATE,

    -- Branch
    branch_id            NUMBER         NOT NULL,

    -- Status
    status               VARCHAR2(20)   DEFAULT 'AVAILABLE' NOT NULL,

    -- Audit
    created_by           NUMBER,
    updated_by           NUMBER,
    created_at           TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_vehicle_plate        UNIQUE (plate_number),
    CONSTRAINT chk_vehicle_status      CHECK (status         IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'LEASE_EXPIRED')),
    CONSTRAINT chk_vehicle_type        CHECK (type           IN ('SEDAN', 'VAN', 'TRUCK', 'SUV', 'PICKUP', 'OTHER')),
    CONSTRAINT chk_vehicle_ownership   CHECK (ownership_type IN ('OWN', 'LEASE')),
    CONSTRAINT fk_vehicle_branch       FOREIGN KEY (branch_id)  REFERENCES branches(id),
    CONSTRAINT fk_vehicle_created      FOREIGN KEY (created_by) REFERENCES staff(id),
    CONSTRAINT fk_vehicle_updated      FOREIGN KEY (updated_by) REFERENCES staff(id)
);

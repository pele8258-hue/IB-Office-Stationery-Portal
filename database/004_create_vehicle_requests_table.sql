-- ============================================================
-- Migration : 004_create_vehicle_requests_table.sql
-- Description: Create vehicle_requests table for booking/request
--              tracking including meter readings and late return
-- Author     : PELAY
-- Date       : 2026-05-20
-- ============================================================

CREATE TABLE vehicle_requests (
    id                   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Relations
    vehicle_id           NUMBER         NOT NULL,
    staff_id             NUMBER         NOT NULL,
    driver_id            NUMBER,

    -- Trip details
    purpose              VARCHAR2(255),
    destination          VARCHAR2(255),
    passenger_count      NUMBER(3)      DEFAULT 0,

    -- Request datetime
    request_date         TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,

    -- Planned time
    requested_time_out   TIMESTAMP      NOT NULL,
    requested_time_in    TIMESTAMP      NOT NULL,

    -- Actual time (filled on departure / return)
    actual_time_out      TIMESTAMP,
    actual_time_in       TIMESTAMP,

    -- Meter / odometer
    meter_before         NUMBER(10,1),
    meter_after          NUMBER(10,1),
    meter_image_before   VARCHAR2(500),
    meter_image_after    VARCHAR2(500),

    -- Approval
    approved_by          NUMBER,
    approved_at          TIMESTAMP,
    rejected_by          NUMBER,
    rejected_at          TIMESTAMP,
    reject_reason        VARCHAR2(500),

    -- Status
    -- PENDING   = waiting for checker approval
    -- APPROVED  = approved, not yet taken
    -- REJECTED  = rejected by checker
    -- IN_USE    = vehicle currently out
    -- COMPLETED = vehicle returned
    -- CANCELLED = cancelled by requester
    status               VARCHAR2(15)   DEFAULT 'PENDING' NOT NULL,

    -- Notes
    notes                VARCHAR2(500),

    -- Audit
    created_by           NUMBER,
    updated_by           NUMBER,
    created_at           TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_vr_status       CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'IN_USE', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT fk_vr_vehicle       FOREIGN KEY (vehicle_id)   REFERENCES vehicles(id),
    CONSTRAINT fk_vr_staff         FOREIGN KEY (staff_id)     REFERENCES staff(id),
    CONSTRAINT fk_vr_driver        FOREIGN KEY (driver_id)    REFERENCES staff(id),
    CONSTRAINT fk_vr_approved_by   FOREIGN KEY (approved_by)  REFERENCES staff(id),
    CONSTRAINT fk_vr_rejected_by   FOREIGN KEY (rejected_by)  REFERENCES staff(id),
    CONSTRAINT fk_vr_created_by    FOREIGN KEY (created_by)   REFERENCES staff(id),
    CONSTRAINT fk_vr_updated_by    FOREIGN KEY (updated_by)   REFERENCES staff(id)
);

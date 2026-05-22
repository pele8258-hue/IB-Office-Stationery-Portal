-- ============================================================
-- Migration : 005_create_vehicle_request_passengers.sql
-- Description: Create vehicle_request_passengers table to track
--              which staff members are passengers in each request
-- Author     : PELAY
-- Date       : 2026-05-20
-- ============================================================

CREATE TABLE vehicle_request_passengers (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id  NUMBER    NOT NULL,
    staff_id    NUMBER    NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_vr_passenger       UNIQUE (request_id, staff_id),
    CONSTRAINT fk_vrp_request        FOREIGN KEY (request_id) REFERENCES vehicle_requests(id),
    CONSTRAINT fk_vrp_staff          FOREIGN KEY (staff_id)   REFERENCES staff(id)
);

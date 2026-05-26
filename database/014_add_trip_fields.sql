-- Migration 014: Add trip recording fields to vehicle_requests
ALTER TABLE vehicle_requests ADD (
  meter_before   NUMBER,
  meter_after    NUMBER,
  time_out_photo VARCHAR2(500),
  time_in_photo  VARCHAR2(500)
);

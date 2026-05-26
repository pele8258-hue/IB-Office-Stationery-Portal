-- ============================================================
-- Migration : 015_fix_meter_precision.sql
-- Description: Remove NUMBER(10,1) precision constraint on
--              meter_before and meter_after. Migration 014
--              skipped these because 004 already created them
--              as NUMBER(10,1), causing ORA-01438 on insert.
-- Author     : PELAY
-- Date       : 2026-05-26
-- ============================================================

ALTER TABLE vehicle_requests MODIFY (
    meter_before NUMBER,
    meter_after  NUMBER
);

COMMIT;

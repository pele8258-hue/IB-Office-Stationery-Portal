-- ============================================================
-- Migration : 009_add_request_number.sql
-- Description: Add request_number to vehicle_requests table.
--              Format: REQ-YYYYMMDD-NNNN (e.g. REQ-20260522-0001)
--              Auto-generated via sequence + trigger on INSERT.
-- Author     : PELAY
-- Date       : 2026-05-22
-- ============================================================


-- 1. Add column (nullable so existing rows are not broken)
ALTER TABLE vehicle_requests ADD (
    request_number VARCHAR2(30)
);


-- 2. Sequence for the numeric part (global, keeps incrementing across dates)
CREATE SEQUENCE vehicle_request_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;


-- 3. Trigger — fires before every INSERT to populate request_number
CREATE OR REPLACE TRIGGER trg_vr_request_number
BEFORE INSERT ON vehicle_requests
FOR EACH ROW
BEGIN
    :NEW.request_number := 'REQ-'
        || TO_CHAR(SYSDATE, 'YYYYMMDD')
        || '-'
        || LPAD(vehicle_request_seq.NEXTVAL, 4, '0');
END;
/


-- 4. Back-fill existing rows (if any) with generated numbers
UPDATE vehicle_requests
SET    request_number = 'REQ-'
           || TO_CHAR(created_at, 'YYYYMMDD')
           || '-'
           || LPAD(vehicle_request_seq.NEXTVAL, 4, '0')
WHERE  request_number IS NULL;


-- 5. Now enforce NOT NULL + unique
ALTER TABLE vehicle_requests MODIFY (request_number VARCHAR2(30) NOT NULL);
ALTER TABLE vehicle_requests ADD CONSTRAINT uq_vr_request_number UNIQUE (request_number);


COMMIT;

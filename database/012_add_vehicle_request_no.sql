-- ============================================================
-- Migration : 012_add_vehicle_request_no.sql
-- Description: Add request_no to vehicle_requests table.
--              Format: VR-DDMMYYYYHHMM (e.g. VR-250520261430)
--              Auto-generated via trigger on INSERT.
-- Author     : PELAY
-- Date       : 2026-05-25
-- ============================================================


-- 1. Add column (nullable so existing rows are not broken)
ALTER TABLE vehicle_requests ADD (
    request_no VARCHAR2(20)
);


-- 2. Trigger — fires before every INSERT to populate request_no
CREATE OR REPLACE TRIGGER trg_vrequest_request_no
BEFORE INSERT ON vehicle_requests
FOR EACH ROW
BEGIN
    :NEW.request_no := 'VR-' || TO_CHAR(SYSDATE, 'DDMMYYYYHH24MI');
END;
/


-- 3. Back-fill existing rows
UPDATE vehicle_requests
SET request_no = 'VR-' || TO_CHAR(created_at, 'DDMMYYYYHH24MI') || LPAD(ROWNUM, 2, '0')
WHERE request_no IS NULL;


-- 4. Enforce NOT NULL
ALTER TABLE vehicle_requests MODIFY (request_no VARCHAR2(20) NOT NULL);


COMMIT;

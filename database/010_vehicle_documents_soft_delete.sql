-- Migration: Add soft-delete columns to vehicle_documents
-- Run once on the target database

ALTER TABLE vehicle_documents ADD (
  deleted    VARCHAR2(1)  DEFAULT 'N' NOT NULL,
  deleted_by NUMBER,
  deleted_at TIMESTAMP
);

ALTER TABLE vehicle_documents
  ADD CONSTRAINT fk_vd_deleted_by FOREIGN KEY (deleted_by) REFERENCES staff(id);

-- Back-fill any existing rows (already 'N' via DEFAULT, this is defensive)
UPDATE vehicle_documents SET deleted = 'N' WHERE deleted IS NULL;
COMMIT;

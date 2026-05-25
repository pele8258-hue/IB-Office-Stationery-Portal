-- ============================================================
-- Migration : 007_rename_branch_management_resource.sql
-- Description: Rename resource "Branch Management" to
--              "Organization Management" to reflect that it
--              now manages both branches and departments.
-- Author     : PELAY
-- Date       : 2026-05-22
-- ============================================================

UPDATE resources
SET    name       = 'Organization Management',
       updated_at = SYSTIMESTAMP
WHERE  code = 'BRANCHES';

COMMIT;

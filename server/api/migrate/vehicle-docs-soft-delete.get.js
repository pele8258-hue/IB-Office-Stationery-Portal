/**
 * GET /api/migrate/vehicle-docs-soft-delete
 * One-time migration: adds deleted, deleted_by, deleted_at to vehicle_documents.
 * Safe to call multiple times — skips columns that already exist.
 */
import { query, execute } from '../../utils/db.js'

export default defineEventHandler(async () => {
  const results = []

  // Check which columns already exist
  const existing = await query(
    `SELECT column_name FROM user_tab_columns
     WHERE table_name = 'VEHICLE_DOCUMENTS'
       AND column_name IN ('DELETED', 'DELETED_BY', 'DELETED_AT')`
  )
  const existingCols = existing.map(r => r.COLUMN_NAME)

  // Add each missing column
  if (!existingCols.includes('DELETED')) {
    await execute(`ALTER TABLE vehicle_documents ADD (deleted VARCHAR2(1) DEFAULT 'N' NOT NULL)`)
    results.push('added column: deleted')
  } else {
    results.push('skipped: deleted already exists')
  }

  if (!existingCols.includes('DELETED_BY')) {
    await execute(`ALTER TABLE vehicle_documents ADD (deleted_by NUMBER)`)
    results.push('added column: deleted_by')
  } else {
    results.push('skipped: deleted_by already exists')
  }

  if (!existingCols.includes('DELETED_AT')) {
    await execute(`ALTER TABLE vehicle_documents ADD (deleted_at TIMESTAMP)`)
    results.push('added column: deleted_at')
  } else {
    results.push('skipped: deleted_at already exists')
  }

  // Add FK constraint if deleted_by was just added
  if (!existingCols.includes('DELETED_BY')) {
    try {
      await execute(
        `ALTER TABLE vehicle_documents ADD CONSTRAINT fk_vd_deleted_by FOREIGN KEY (deleted_by) REFERENCES staff(id)`
      )
      results.push('added constraint: fk_vd_deleted_by')
    } catch (e) {
      results.push(`skipped constraint: ${e.message}`)
    }
  }

  return {
    success: true,
    message: 'Migration complete',
    results,
  }
})

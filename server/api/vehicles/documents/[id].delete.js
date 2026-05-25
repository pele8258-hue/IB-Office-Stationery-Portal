/**
 * DELETE /api/vehicles/documents/:id
 * Soft-delete a vehicle document (sets deleted='Y', deleted_by, deleted_at).
 * The document record stays in the DB but is hidden from all system queries.
 */
import { execute, query } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  const docId = Number(getRouterParam(event, 'id'))
  if (!docId) throw createError({ statusCode: 400, data: { success: false, message: 'Invalid document ID' } })

  const existing = await query(
    `SELECT id FROM vehicle_documents WHERE id = :id AND deleted = 'N'`,
    { id: docId }
  )
  if (!existing.length) {
    throw createError({ statusCode: 404, data: { success: false, message: 'Document not found' } })
  }

  await execute(
    `UPDATE vehicle_documents
     SET deleted    = 'Y',
         deleted_by = :deleted_by,
         deleted_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = :id`,
    { deleted_by: event.context.staff?.id || null, id: docId }
  )

  return {
    success: true,
    code: 200,
    message: 'Document deleted successfully',
    data: { id: docId },
    timestamp: new Date().toISOString(),
  }
})

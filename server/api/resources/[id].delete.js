/**
 * DELETE /api/resources/:id
 * Soft-deletes a resource (sets status = 'I')
 */
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const existing = await query(`SELECT id FROM resources WHERE id = :id`, { id })
  if (!existing.length) {
    throw createError({ statusCode: 404, data: { success: false, message: 'Resource not found' } })
  }

  await execute(
    `UPDATE resources SET status = 'I', updated_at = SYSTIMESTAMP WHERE id = :id`,
    { id }
  )

  return {
    success: true,
    code: 200,
    message: 'Resource deactivated successfully',
    timestamp: new Date().toISOString(),
  }
})

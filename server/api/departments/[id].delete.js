/**
 * DELETE /api/departments/:id
 * Soft-delete a department (sets status = 'I')
 */
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const existing = await query(`SELECT id, name FROM departments WHERE id = :id`, { id })
  if (!existing.length) {
    throw createError({
      statusCode: 404,
      data: { success: false, code: 404, message: 'Department not found' },
    })
  }

  await execute(`UPDATE departments SET status = 'I' WHERE id = :id`, { id })

  return {
    success: true,
    code: 200,
    message: 'Department deleted successfully',
    data: { id, deleted_status: true },
    timestamp: new Date().toISOString(),
  }
})

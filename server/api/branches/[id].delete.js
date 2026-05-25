/**
 * DELETE /api/branches/:id
 * Soft-delete a branch (sets status = 'I')
 */
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const existing = await query(`SELECT id, name FROM branches WHERE id = :id`, { id })
  if (!existing.length) {
    throw createError({
      statusCode: 404,
      data: { success: false, code: 404, message: 'Branch not found' },
    })
  }

  await execute(`UPDATE branches SET status = 'I' WHERE id = :id`, { id })

  return {
    success: true,
    code: 200,
    message: 'Branch deleted successfully',
    data: { id, deleted_status: true },
    timestamp: new Date().toISOString(),
  }
})

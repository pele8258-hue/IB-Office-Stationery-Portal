/**
 * GET /api/roles/:id
 * Returns a single role by ID
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const rows = await query(
    `SELECT id, code, name, description, status FROM roles WHERE id = :id`,
    { id }
  )
  if (!rows.length) {
    throw createError({ statusCode: 404, data: { success: false, message: 'Role not found' } })
  }

  return {
    success: true,
    code: 200,
    message: 'Role retrieved successfully',
    data: rows[0],
    timestamp: new Date().toISOString(),
  }
})

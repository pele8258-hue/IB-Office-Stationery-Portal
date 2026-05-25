/**
 * PUT /api/roles/:id
 * Body: { name, description, status }
 */
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = (await readBody(event)) ?? {}

  const existing = await query(`SELECT id FROM roles WHERE id = :id`, { id })
  if (!existing.length) {
    throw createError({ statusCode: 404, data: { success: false, message: 'Role not found' } })
  }

  await execute(
    `UPDATE roles SET name = :name, description = :description, status = :status, updated_at = SYSTIMESTAMP WHERE id = :id`,
    { name: body.name, description: body.description || null, status: body.status || 'A', id }
  )

  return {
    success: true,
    code: 200,
    message: 'Role updated successfully',
    timestamp: new Date().toISOString(),
  }
})

/**
 * PUT /api/resources/:id
 * Body: { name, module, description, status }
 */
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = (await readBody(event)) ?? {}

  const existing = await query(`SELECT id FROM resources WHERE id = :id`, { id })
  if (!existing.length) {
    throw createError({ statusCode: 404, data: { success: false, message: 'Resource not found' } })
  }

  await execute(
    `UPDATE resources
     SET name = :name, module = UPPER(:module), description = :description, status = :status, updated_at = SYSTIMESTAMP
     WHERE id = :id`,
    {
      name:        body.name,
      module:      body.module || 'CUSTOM',
      description: body.description || null,
      status:      body.status || 'A',
      id,
    }
  )

  return {
    success: true,
    code: 200,
    message: 'Resource updated successfully',
    timestamp: new Date().toISOString(),
  }
})

/**
 * PUT /api/departments/:id
 * Update a department
 * Body: { name, code }
 */
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = (await readBody(event)) ?? {}

  const required = ['name', 'code']
  const missing  = required.filter(f => !body[f]?.toString().trim())
  if (missing.length) {
    throw createError({
      statusCode: 422,
      data: {
        success: false,
        code: 422,
        message: 'Validation failed',
        errors: Object.fromEntries(missing.map(f => [f, [`${f} is required`]])),
        timestamp: new Date().toISOString(),
      },
    })
  }

  const existing = await query(`SELECT id FROM departments WHERE id = :id`, { id })
  if (!existing.length) {
    throw createError({
      statusCode: 404,
      data: { success: false, code: 404, message: 'Department not found' },
    })
  }

  const code = body.code.trim().toUpperCase()

  const codeConflict = await query(
    `SELECT id FROM departments WHERE UPPER(code) = :code AND id != :id`,
    { code, id }
  )
  if (codeConflict.length) {
    throw createError({
      statusCode: 409,
      data: {
        success: false,
        code: 409,
        message: 'Department code already in use',
        errors: { code: ['This department code is already in use by another department'] },
        timestamp: new Date().toISOString(),
      },
    })
  }

  await execute(
    `UPDATE departments SET name = :name, code = :code WHERE id = :id`,
    { name: body.name.trim(), code, id }
  )

  return {
    success: true,
    code: 200,
    message: 'Department updated successfully',
    data: { id, name: body.name.trim(), code },
    timestamp: new Date().toISOString(),
  }
})

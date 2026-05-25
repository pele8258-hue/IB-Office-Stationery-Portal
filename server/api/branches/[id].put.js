/**
 * PUT /api/branches/:id
 * Update a branch
 * Body: { name, code, type }
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

  const existing = await query(`SELECT id FROM branches WHERE id = :id`, { id })
  if (!existing.length) {
    throw createError({
      statusCode: 404,
      data: { success: false, code: 404, message: 'Branch not found' },
    })
  }

  const code = body.code.trim().toUpperCase()

  const codeConflict = await query(
    `SELECT id FROM branches WHERE UPPER(code) = :code AND id != :id`,
    { code, id }
  )
  if (codeConflict.length) {
    throw createError({
      statusCode: 409,
      data: {
        success: false,
        code: 409,
        message: 'Branch code already in use',
        errors: { code: ['This branch code is already in use by another branch'] },
        timestamp: new Date().toISOString(),
      },
    })
  }

  await execute(
    `UPDATE branches SET name = :name, code = :code, type = :type WHERE id = :id`,
    { name: body.name.trim(), code, type: body.type?.trim() || 'BRANCH', id }
  )

  return {
    success: true,
    code: 200,
    message: 'Branch updated successfully',
    data: { id, name: body.name.trim(), code, type: body.type?.trim() || 'BRANCH' },
    timestamp: new Date().toISOString(),
  }
})

/**
 * POST /api/roles
 * Body: { name, code, description }
 * Creates a new role
 */
import oracledb from 'oracledb'
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) ?? {}

  const required = ['name', 'code']
  const missing = required.filter(f => !body[f])
  if (missing.length) {
    throw createError({
      statusCode: 422,
      data: {
        success: false,
        message: 'Validation failed',
        errors: Object.fromEntries(missing.map(f => [f, [`${f} is required`]])),
      },
    })
  }

  const dup = await query(
    `SELECT id FROM roles WHERE UPPER(code) = UPPER(:code)`,
    { code: body.code.trim() }
  )
  if (dup.length) {
    throw createError({
      statusCode: 409,
      data: { success: false, message: 'Role code already exists', errors: { code: ['This code is already in use'] } },
    })
  }

  const result = await execute(
    `INSERT INTO roles (name, code, description, status)
     VALUES (:name, UPPER(:code), :description, 'A')
     RETURNING id INTO :new_id`,
    {
      name:        body.name.trim(),
      code:        body.code.trim(),
      description: body.description?.trim() || null,
      new_id:      { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    }
  )

  return {
    success: true,
    code: 201,
    message: 'Role created successfully',
    data: { role_id: result.outBinds?.new_id?.[0] },
    timestamp: new Date().toISOString(),
  }
})

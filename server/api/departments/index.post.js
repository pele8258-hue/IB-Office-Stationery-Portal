/**
 * POST /api/departments
 * Create a new department
 * Body: { name, code }
 */
import oracledb from 'oracledb'
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
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

  const code = body.code.trim().toUpperCase()

  const existing = await query(
    `SELECT id FROM departments WHERE UPPER(code) = :code`,
    { code }
  )
  if (existing.length) {
    throw createError({
      statusCode: 409,
      data: {
        success: false,
        code: 409,
        message: 'Department code already exists',
        errors: { code: ['This department code is already in use'] },
        timestamp: new Date().toISOString(),
      },
    })
  }

  const result = await execute(
    `INSERT INTO departments (name, code, status)
     VALUES (:name, :code, 'A')
     RETURNING id INTO :new_id`,
    {
      name:   body.name.trim(),
      code,
      new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    }
  )

  return {
    success: true,
    code: 201,
    message: 'Department created successfully',
    data: {
      id:   result.outBinds?.new_id?.[0],
      name: body.name.trim(),
      code,
    },
    timestamp: new Date().toISOString(),
  }
})

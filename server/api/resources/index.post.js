/**
 * POST /api/resources
 * Body: { code, name, module, description }
 * Creates a new resource (page/module in the system)
 */
import oracledb from 'oracledb'
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) ?? {}

  const required = ['code', 'name']
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
    `SELECT id FROM resources WHERE UPPER(code) = UPPER(:code)`,
    { code: body.code.trim() }
  )
  if (dup.length) {
    throw createError({
      statusCode: 409,
      data: { success: false, message: 'Resource code already exists', errors: { code: ['This code is already in use'] } },
    })
  }

  const result = await execute(
    `INSERT INTO resources (code, name, module, description, status)
     VALUES (UPPER(:code), :name, UPPER(:module), :description, 'A')
     RETURNING id INTO :new_id`,
    {
      code:        body.code.trim(),
      name:        body.name.trim(),
      module:      body.module?.trim() || 'CUSTOM',
      description: body.description?.trim() || null,
      new_id:      { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    }
  )

  return {
    success: true,
    code: 201,
    message: 'Resource created successfully',
    data: { resource_id: result.outBinds?.new_id?.[0] },
    timestamp: new Date().toISOString(),
  }
})

/**
 * POST /api/staff
 * Register a new staff account
 * Body: { name, email, password, phone, position, branch_id, department_id, role_id }
 * Status is set to N — staff must change password on first login
 */

import bcrypt from 'bcryptjs'
import oracledb from 'oracledb'
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) ?? {}

  // Validation
  const required = ['name', 'email', 'password', 'branch_id', 'department_id', 'role_id']
  const missing  = required.filter(f => !body[f])
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

  if (body.password.length < 6) {
    throw createError({
      statusCode: 422,
      data: {
        success: false,
        code: 422,
        message: 'Validation failed',
        errors: { password: ['Password must be at least 6 characters'] },
        timestamp: new Date().toISOString(),
      },
    })
  }

  // Check duplicate email
  const existing = await query(
    `SELECT id FROM staff WHERE LOWER(email) = LOWER(:email)`,
    { email: body.email.trim() }
  )
  if (existing.length) {
    throw createError({
      statusCode: 409,
      data: {
        success: false,
        code: 409,
        message: 'Email already registered',
        errors: { email: ['This email is already in use'] },
        timestamp: new Date().toISOString(),
      },
    })
  }

  const hashedPassword = await bcrypt.hash(body.password, 12)

  const result = await execute(
    `INSERT INTO staff (name, email, password, phone, position, branch_id, department_id, role_id, status, created_by)
     VALUES (:name, :email, :password, :phone, :position, :branch_id, :department_id, :role_id, :status, :created_by)
     RETURNING id INTO :new_id`,
    {
      name:          body.name,
      email:         body.email.toLowerCase().trim(),
      password:      hashedPassword,
      phone:         body.phone    || null,
      position:      body.position || null,
      branch_id:     body.branch_id,
      department_id: body.department_id,
      role_id:       body.role_id,
      status:        'N',
      created_by:    event.context.staff?.id || null,
      new_id:        { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    }
  )

  const newId = result.outBinds?.new_id?.[0]

  return {
    success: true,
    code: 201,
    message: 'Staff account created successfully',
    data: {
      staff_id: newId,
      name:     body.name,
      email:    body.email.toLowerCase().trim(),
      status:   'N',
    },
    meta: {
      created_by: event.context.staff?.id || null,
      created_at: new Date().toISOString(),
      note: 'Staff must set a new password on first login',
    },
    timestamp: new Date().toISOString(),
  }
})

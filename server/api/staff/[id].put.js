/**
 * PUT /api/staff/:id
 * Body: { name, email, phone, position, branch_id, department_id, role_id, status }
 * Updates staff info
 */
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id   = getRouterParam(event, 'id')
  const body = (await readBody(event)) ?? {}

  const required = ['name', 'email', 'branch_id', 'department_id', 'role_id']
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

  // Check staff exists
  const existing = await query(`SELECT id FROM staff WHERE id = :id`, { id: Number(id) })
  if (!existing.length) {
    throw createError({
      statusCode: 404,
      data: { success: false, message: 'Staff not found' },
    })
  }

  // Check email not taken by another staff
  const emailCheck = await query(
    `SELECT id FROM staff WHERE LOWER(email) = LOWER(:email) AND id != :id`,
    { email: body.email.trim(), id: Number(id) }
  )
  if (emailCheck.length) {
    throw createError({
      statusCode: 409,
      data: {
        success: false,
        code: 409,
        message: 'Email already in use',
        errors: { email: ['This email is already used by another account'] },
        timestamp: new Date().toISOString(),
      },
    })
  }

  await execute(
    `UPDATE staff
     SET name          = :name,
         email         = :email,
         phone         = :phone,
         position      = :position,
         branch_id     = :branch_id,
         department_id = :department_id,
         role_id       = :role_id,
         status        = :status,
         updated_at    = CURRENT_TIMESTAMP
     WHERE id = :id`,
    {
      name:          body.name,
      email:         body.email.toLowerCase().trim(),
      phone:         body.phone     || null,
      position:      body.position  || null,
      branch_id:     body.branch_id,
      department_id: body.department_id,
      role_id:       body.role_id,
      status:        body.status    || 'A',
      id:            Number(id),
    }
  )

  return {
    success: true,
    code: 200,
    message: 'Staff updated successfully',
    data: { staff_id: Number(id), updated_fields: required },
    meta: {
      updated_by: event.context.staff?.id || null,
      updated_at: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  }
})

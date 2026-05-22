/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns JWT token. If status = N, frontend must redirect to change-password.
 */

import bcrypt from 'bcryptjs'
import { query } from '../../utils/db.js'
import { signToken } from '../../utils/auth.js'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) ?? {}

  // Validation
  if (!body.email || !body.password) {
    throw createError({
      statusCode: 422,
      data: {
        success: false,
        code: 422,
        message: 'Validation failed',
        errors: {
          ...(!body.email    && { email:    ['Email is required'] }),
          ...(!body.password && { password: ['Password is required'] }),
        },
        timestamp: new Date().toISOString(),
      },
    })
  }

  // Find staff by email
  const rows = await query(
    `SELECT s.id, s.name, s.email, s.password, s.status,
            s.branch_id, s.department_id, s.role_id,
            s.position,
            r.code AS role_code, r.name AS role_name,
            d.name AS department_name
     FROM staff s
     JOIN roles r ON r.id = s.role_id
     JOIN departments d ON d.id = s.department_id
     WHERE LOWER(s.email) = LOWER(:email)`,
    { email: body.email.trim() }
  )

  if (!rows.length) {
    throw createError({
      statusCode: 401,
      data: {
        success: false,
        code: 401,
        message: 'Invalid email or password',
        timestamp: new Date().toISOString(),
      },
    })
  }

  const staff = rows[0]

  // Check account is not inactive
  if (staff.STATUS === 'I') {
    throw createError({
      statusCode: 403,
      data: {
        success: false,
        code: 403,
        message: 'Account is inactive. Contact your administrator.',
        timestamp: new Date().toISOString(),
      },
    })
  }

  // Verify password
  const valid = await bcrypt.compare(body.password, staff.PASSWORD)
  if (!valid) {
    throw createError({
      statusCode: 401,
      data: {
        success: false,
        code: 401,
        message: 'Invalid email or password',
        timestamp: new Date().toISOString(),
      },
    })
  }

  // Sign JWT
  const token = signToken({
    id:            staff.ID,
    email:         staff.EMAIL,
    role:          staff.ROLE_CODE,
    branch_id:     staff.BRANCH_ID,
    department_id: staff.DEPARTMENT_ID,
    status:        staff.STATUS,
  })

  return {
    success: true,
    code: 200,
    message: 'Login successful',
    data: {
      access_token: token,
      token_type:   'Bearer',
      expires_in:   86400,
      user: {
        id:              staff.ID,
        name:            staff.NAME,
        email:           staff.EMAIL,
        role:            staff.ROLE_NAME,
        role_code:       staff.ROLE_CODE,
        position:        staff.POSITION,
        department:      staff.DEPARTMENT_NAME,
        branch_id:       staff.BRANCH_ID,
        department_id:   staff.DEPARTMENT_ID,
        status:          staff.STATUS,
      },
    },
    meta: {
      login_at:       new Date().toISOString(),
      require_change: staff.STATUS === 'N',
    },
    timestamp: new Date().toISOString(),
  }
})

/**
 * POST /api/auth/change-password
 * Body: { password, confirm_password }
 * Requires: valid JWT (staff with status = N)
 * Updates password and sets status to A
 */
import bcrypt from 'bcryptjs'
import { execute } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const staff = event.context.staff
  if (!staff) {
    throw createError({ statusCode: 401, data: { success: false, message: 'Unauthorized' } })
  }

  const body = (await readBody(event)) ?? {}

  if (!body.password || !body.confirm_password) {
    throw createError({
      statusCode: 422,
      data: {
        success: false,
        code: 422,
        message: 'Validation failed',
        errors: {
          ...(!body.password         && { password:         ['Password is required'] }),
          ...(!body.confirm_password && { confirm_password: ['Please confirm your password'] }),
        },
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
      },
    })
  }

  if (body.password !== body.confirm_password) {
    throw createError({
      statusCode: 422,
      data: {
        success: false,
        code: 422,
        message: 'Validation failed',
        errors: { confirm_password: ['Passwords do not match'] },
      },
    })
  }

  const hashed = await bcrypt.hash(body.password, 12)

  await execute(
    `UPDATE staff SET password = :password, status = 'A', updated_at = CURRENT_TIMESTAMP WHERE id = :id`,
    { password: hashed, id: staff.id }
  )

  return {
    success: true,
    code: 200,
    message: 'Password changed successfully',
    timestamp: new Date().toISOString(),
  }
})

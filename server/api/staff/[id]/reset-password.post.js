/**
 * POST /api/staff/:id/reset-password
 * Body: { password }
 * Admin sets a new password for a staff member — resets status to N
 */
import bcrypt from 'bcryptjs'
import oracledb from 'oracledb'
import { transaction, query } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id      = getRouterParam(event, 'id')
  const body    = (await readBody(event)) ?? {}
  const staffId = Number(id)

  if (!body.password) {
    throw createError({
      statusCode: 422,
      data: {
        success: false,
        message: 'Validation failed',
        errors: { password: ['New password is required'] },
      },
    })
  }

  if (body.password.length < 6) {
    throw createError({
      statusCode: 422,
      data: {
        success: false,
        message: 'Validation failed',
        errors: { password: ['Password must be at least 6 characters'] },
      },
    })
  }

  const existing = await query(`SELECT id FROM staff WHERE id = :id`, { id: staffId })
  if (!existing.length) {
    throw createError({ statusCode: 404, data: { success: false, message: 'Staff not found' } })
  }

  const hashed = await bcrypt.hash(body.password, 12)

  // Use ONE connection so we see post-trigger state in the same Oracle session
  await transaction(async (conn) => {
    const upd = await conn.execute(
      `UPDATE staff
       SET    password   = :pwd,
              status     = :newstatus,
              updated_at = SYSDATE
       WHERE  id         = :id`,
      { pwd: hashed, newstatus: 'N', id: staffId },
      { autoCommit: false }
    )

    if (!upd.rowsAffected) {
      throw createError({ statusCode: 500, data: { success: false, message: 'Update affected 0 rows' } })
    }

    // Read back on same session to detect trigger interference
    const chk = await conn.execute(
      `SELECT status FROM staff WHERE id = :id`,
      { id: staffId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )

    const statusAfter = chk.rows?.[0]?.STATUS
    console.log(`[reset-password] id=${staffId} status_after_update=${statusAfter}`)

    if (statusAfter !== 'N') {
      throw createError({
        statusCode: 500,
        data: {
          success: false,
          message: `Oracle trigger is reverting the status (got "${statusAfter}" not "N"). Run: SELECT trigger_name FROM all_triggers WHERE table_name='STAFF' to find it.`,
        },
      })
    }
  })

  return {
    success: true,
    code: 200,
    message: 'Password reset successfully. Staff must set a new password on next login.',
    data: { status: 'N' },
    timestamp: new Date().toISOString(),
  }
})

/**
 * POST /api/vehicles/:id/verify
 * Approve or reject a vehicle. Only CHECKER and SUPER_ADMIN may call this.
 * Body: { action: 'APPROVED' | 'REJECTED', reject_reason? }
 */
import { execute, query } from '../../../utils/db.js'

const ALLOWED_ROLES = ['CHECKER', 'ADMIN', 'SUPER_ADMIN']

export default defineEventHandler(async (event) => {
  const role = event.context.staff?.role
  if (!ALLOWED_ROLES.includes(role)) {
    throw createError({ statusCode: 403, data: { success: false, code: 403, message: 'Only Checker or Super Admin can verify vehicles' } })
  }

  const id   = Number(getRouterParam(event, 'id'))
  const body = (await readBody(event)) ?? {}

  if (!id) throw createError({ statusCode: 400, data: { success: false, message: 'Invalid ID' } })

  const action = (body.action || '').toUpperCase()
  if (!['APPROVED', 'REJECTED'].includes(action)) {
    throw createError({ statusCode: 422, data: { success: false, message: 'action must be APPROVED or REJECTED' } })
  }
  if (action === 'REJECTED' && !body.reject_reason?.trim()) {
    throw createError({ statusCode: 422, data: { success: false, message: 'reject_reason is required when rejecting' } })
  }

  const existing = await query(`SELECT id FROM vehicles WHERE id = :id`, { id })
  if (!existing.length) throw createError({ statusCode: 404, data: { success: false, message: 'Vehicle not found' } })

  await execute(
    `UPDATE vehicles SET
       verify_status = :verify_status,
       reject_reason = :reject_reason,
       verified_by   = :verified_by,
       verified_at   = CURRENT_TIMESTAMP,
       updated_at    = CURRENT_TIMESTAMP
     WHERE id = :id`,
    {
      verify_status: action,
      reject_reason: action === 'REJECTED' ? body.reject_reason.trim() : null,
      verified_by:   event.context.staff?.id,
      id,
    }
  )

  return {
    success: true,
    code: 200,
    message: `Vehicle ${action.toLowerCase()} successfully`,
    data: { id, verify_status: action },
    timestamp: new Date().toISOString(),
  }
})

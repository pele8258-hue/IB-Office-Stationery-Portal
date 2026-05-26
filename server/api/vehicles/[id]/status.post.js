/**
 * POST /api/vehicles/:id/status
 * Manually override vehicle operational status
 * Allowed statuses: AVAILABLE, IN_USE, MAINTENANCE, LEASE_EXPIRED
 * Restricted to ADMIN, SUPER_ADMIN, CHECKER
 */
import { execute, query } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  if (!event.context.staff) {
    throw createError({ statusCode: 401, data: { success: false, message: 'Unauthorized' } })
  }

  const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CHECKER']
  if (!ALLOWED_ROLES.includes(event.context.staff.role)) {
    throw createError({ statusCode: 403, data: { success: false, message: 'Permission denied. Only Admin, Checker, or Super Admin can change vehicle status.' } })
  }

  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!id) throw createError({ statusCode: 400, data: { success: false, message: 'Invalid ID' } })

  const VALID_STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'LEASE_EXPIRED']
  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    throw createError({
      statusCode: 422,
      data: {
        success: false,
        message: 'Validation failed',
        errors: { status: [`Status must be one of: ${VALID_STATUSES.join(', ')}`] },
      },
    })
  }

  const existing = await query(`SELECT id, status FROM vehicles WHERE id = :id`, { id })
  if (!existing.length) throw createError({ statusCode: 404, data: { success: false, message: 'Vehicle not found' } })

  if (existing[0].STATUS === body.status) {
    throw createError({ statusCode: 422, data: { success: false, message: `Vehicle is already ${body.status}` } })
  }

  // If vehicle is IN_USE, block the change if there's still an active booking using it
  if (existing[0].STATUS === 'IN_USE') {
    const activeBookings = await query(
      `SELECT vr.id, vr.request_no, vr.status
       FROM   vehicle_requests vr
       WHERE  vr.vehicle_id = :id
         AND  vr.status NOT IN ('COMPLETED', 'CANCELLED')
       FETCH FIRST 1 ROWS ONLY`,
      { id }
    )
    if (activeBookings.length) {
      const b = activeBookings[0]
      throw createError({
        statusCode: 422,
        data: {
          success: false,
          message: `Cannot change status — vehicle is currently assigned to booking ${b.REQUEST_NO} (${b.STATUS}). Complete or cancel that booking first.`,
          errors: {
            status: [`Booking ${b.REQUEST_NO} is still ${b.STATUS}. Complete or cancel it before changing the vehicle status.`],
          },
        },
      })
    }
  }

  await execute(
    `UPDATE vehicles
     SET    status     = :status,
            updated_by = :updated_by,
            updated_at = CURRENT_TIMESTAMP
     WHERE  id = :id`,
    { status: body.status, updated_by: event.context.staff.id, id }
  )

  return {
    success: true,
    code: 200,
    message: 'Vehicle status updated successfully',
    data: { id, status: body.status },
    meta: { updated_by: event.context.staff.id, updated_at: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  }
})

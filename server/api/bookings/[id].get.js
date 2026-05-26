/**
 * GET /api/bookings/:id
 * Returns a single vehicle request with passengers.
 * Non-admin users can only view their own requests.
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  if (!event.context.staff) {
    throw createError({ statusCode: 401, data: { success: false, message: 'Unauthorized' } })
  }

  const id = parseInt(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, data: { success: false, message: 'Invalid ID' } })

  const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CHECKER']
  const isAdmin     = ADMIN_ROLES.includes(event.context.staff.role)

  const rows = await query(
    `SELECT vr.id, vr.request_no, vr.status, vr.destination, vr.purpose,
            vr.requested_time_out, vr.requested_time_in,
            vr.actual_time_out, vr.actual_time_in,
            vr.passenger_count, vr.notes, vr.reject_reason, vr.created_at,
            vr.meter_before, vr.meter_after, vr.time_out_photo, vr.time_in_photo,
            vr.staff_id,
            v.id AS vehicle_id, v.plate_number, v.brand, v.model, v.color, v.type,
            v.parking_lot, v.parking_floor,
            s.id   AS requester_id,   s.name  AS requester_name,  s.email AS requester_email,
            sd.name AS requester_dept, sb.name AS requester_branch,
            dr.id  AS driver_id,      dr.name AS driver_name,
            drd.name AS driver_dept,  drb.name AS driver_branch,
            ap.id  AS approved_by_id, ap.name AS approved_by_name
     FROM   vehicle_requests vr
     LEFT JOIN vehicles   v   ON v.id   = vr.vehicle_id
     JOIN      staff      s   ON s.id   = vr.staff_id
     LEFT JOIN departments sd ON sd.id  = s.department_id
     LEFT JOIN branches    sb ON sb.id  = s.branch_id
     LEFT JOIN staff       dr  ON dr.id = vr.driver_id
     LEFT JOIN departments drd ON drd.id = dr.department_id
     LEFT JOIN branches    drb ON drb.id = dr.branch_id
     LEFT JOIN staff       ap  ON ap.id = vr.approved_by
     WHERE  vr.id = :id`,
    { id }
  )

  if (!rows.length) {
    throw createError({ statusCode: 404, data: { success: false, message: 'Request not found' } })
  }

  const booking = rows[0]

  // Non-admin can only view their own request
  if (!isAdmin && booking.STAFF_ID !== event.context.staff.id) {
    throw createError({ statusCode: 403, data: { success: false, message: 'You do not have permission to view this request' } })
  }

  const passengers = await query(
    `SELECT vrp.staff_id, s.name, s.position,
            d.name AS department, b.name AS branch
     FROM   vehicle_request_passengers vrp
     JOIN   staff       s ON s.id  = vrp.staff_id
     LEFT JOIN departments d ON d.id = s.department_id
     LEFT JOIN branches    b ON b.id = s.branch_id
     WHERE  vrp.request_id = :id`,
    { id }
  )

  return {
    success: true,
    code: 200,
    message: 'Booking retrieved successfully',
    data: { ...booking, PASSENGERS: passengers },
    timestamp: new Date().toISOString(),
  }
})

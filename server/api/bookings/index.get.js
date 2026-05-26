/**
 * GET /api/bookings
 * Returns paginated vehicle request list.
 * Query: page, limit, search, status
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  if (!event.context.staff) {
    throw createError({ statusCode: 401, data: { success: false, message: 'Unauthorized' } })
  }

  const q      = getQuery(event)
  const page   = Math.max(1, parseInt(q.page)  || 1)
  const limit  = Math.min(100, parseInt(q.limit) || 20)
  const offset = (page - 1) * limit
  const search       = (q.search || '').trim()
  const status       = q.status || ''
  const pendingFirst = q.pending_first === '1'

  const ADMIN_ROLES   = ['ADMIN', 'SUPER_ADMIN', 'CHECKER']
  const isAdmin       = ADMIN_ROLES.includes(event.context.staff.role)
  // own=1 forces filter to current user's requests (used by "My Request" tab for all roles)
  const forceOwn      = q.own === '1'

  const whereParts = ['1=1']
  const bindObj    = {}

  // Non-admin always see only their own; admins can opt-in via ?own=1 (My Request tab)
  if (!isAdmin || forceOwn) {
    bindObj.own_staff_id = event.context.staff.id
    whereParts.push(`vr.staff_id = :own_staff_id`)
  }

  if (search) {
    bindObj.s1 = `%${search.toUpperCase()}%`
    bindObj.s2 = `%${search.toUpperCase()}%`
    bindObj.s3 = `%${search.toUpperCase()}%`
    whereParts.push(`(UPPER(vr.request_no) LIKE :s1 OR UPPER(v.plate_number) LIKE :s2 OR UPPER(vr.destination) LIKE :s3)`)
  }
  if (status) {
    bindObj.status = status
    whereParts.push(`vr.status = :status`)
  }

  const where = 'WHERE ' + whereParts.join(' AND ')

  bindObj.limit  = limit
  bindObj.offset = offset

  const rows = await query(
    `SELECT vr.id, vr.request_no, vr.status, vr.destination, vr.purpose,
            vr.requested_time_out, vr.requested_time_in,
            vr.actual_time_out, vr.actual_time_in,
            vr.passenger_count, vr.notes, vr.reject_reason, vr.created_at,
            v.id AS vehicle_id, v.plate_number, v.brand, v.model, v.color,
            s.id AS requester_id, s.name AS requester_name, s.email AS requester_email,
            dr.id AS driver_id, dr.name AS driver_name,
            ap.name AS approved_by_name
     FROM   vehicle_requests vr
     LEFT JOIN vehicles v ON v.id  = vr.vehicle_id
     JOIN      staff s    ON s.id  = vr.staff_id
     LEFT JOIN staff dr  ON dr.id = vr.driver_id
     LEFT JOIN staff ap  ON ap.id = vr.approved_by
     ${where}
     ORDER  BY ${pendingFirst
       ? `CASE WHEN vr.status = 'PENDING' THEN 0 ELSE 1 END ASC, vr.created_at ASC`
       : `vr.created_at DESC`}
     OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
    bindObj
  )

  const countBind = { ...bindObj }
  delete countBind.limit
  delete countBind.offset

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM vehicle_requests vr
     LEFT JOIN vehicles v ON v.id = vr.vehicle_id
     JOIN      staff s    ON s.id = vr.staff_id
     ${where}`,
    countBind
  )

  const total     = countRows[0]?.TOTAL || 0
  const totalPage = Math.max(1, Math.ceil(total / limit))

  return {
    success: true,
    code: 200,
    message: 'Bookings retrieved successfully',
    data: rows,
    pagination: {
      current_page: page, per_page: limit, total_data: total,
      total_page: totalPage, has_next_page: page < totalPage, has_previous_page: page > 1,
    },
    timestamp: new Date().toISOString(),
  }
})

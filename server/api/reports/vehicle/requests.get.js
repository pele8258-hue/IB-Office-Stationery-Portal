/**
 * GET /api/reports/vehicle/requests
 * Vehicle request report — summary stats + paginated list.
 * Query: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD), status, page, limit
 */
import { query } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  if (!event.context.staff) {
    throw createError({ statusCode: 401, data: { success: false, message: 'Unauthorized' } })
  }

  const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CHECKER']
  if (!ADMIN_ROLES.includes(event.context.staff.role)) {
    throw createError({ statusCode: 403, data: { success: false, message: 'Permission denied' } })
  }

  const q      = getQuery(event)
  const page   = Math.max(1, parseInt(q.page) || 1)
  const limit  = Math.min(200, parseInt(q.limit) || 20)
  const offset = (page - 1) * limit
  const status = q.status || ''

  const now         = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const defaultTo   = now.toISOString().split('T')[0]
  const dateFrom    = q.date_from || defaultFrom
  const dateTo      = q.date_to   || defaultTo

  const detailWhereParts = [`TRUNC(vr.created_at) BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD') AND TO_DATE(:date_to, 'YYYY-MM-DD')`]
  const detailBind       = { date_from: dateFrom, date_to: dateTo }
  if (status) {
    detailBind.status = status
    detailWhereParts.push(`vr.status = :status`)
  }
  const detailWhere = 'WHERE ' + detailWhereParts.join(' AND ')

  const [summaryRows, rows, countRows] = await Promise.all([
    // Summary uses date filter only — always shows full status breakdown
    query(
      `SELECT
         COUNT(*) AS total,
         COUNT(CASE WHEN status = 'PENDING'   THEN 1 END) AS pending,
         COUNT(CASE WHEN status = 'APPROVED'  THEN 1 END) AS approved,
         COUNT(CASE WHEN status = 'IN_USE'    THEN 1 END) AS in_use,
         COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed,
         COUNT(CASE WHEN status = 'REJECTED'  THEN 1 END) AS rejected,
         COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) AS cancelled
       FROM vehicle_requests
       WHERE TRUNC(created_at) BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD') AND TO_DATE(:date_to, 'YYYY-MM-DD')`,
      { date_from: dateFrom, date_to: dateTo }
    ),
    // Detail list
    query(
      `SELECT vr.id, vr.request_no, vr.status, vr.destination, vr.purpose,
              vr.requested_time_out, vr.requested_time_in,
              vr.actual_time_out, vr.actual_time_in, vr.created_at,
              v.plate_number, v.brand, v.model,
              s.name AS requester_name,
              d.name AS department,
              b.name AS branch,
              dr.name AS driver_name
       FROM   vehicle_requests vr
       JOIN   staff s           ON s.id  = vr.staff_id
       LEFT JOIN departments d  ON d.id  = s.department_id
       LEFT JOIN branches    b  ON b.id  = s.branch_id
       LEFT JOIN vehicles    v  ON v.id  = vr.vehicle_id
       LEFT JOIN staff       dr ON dr.id = vr.driver_id
       ${detailWhere}
       ORDER BY vr.created_at DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { ...detailBind, limit, offset }
    ),
    // Count
    query(
      `SELECT COUNT(*) AS total
       FROM vehicle_requests vr
       JOIN staff s ON s.id = vr.staff_id
       ${detailWhere}`,
      detailBind
    ),
  ])

  const total     = countRows[0]?.TOTAL || 0
  const totalPage = Math.max(1, Math.ceil(total / limit))
  const s         = summaryRows[0] || {}

  return {
    success: true,
    code: 200,
    message: 'Report retrieved successfully',
    summary: {
      total:     s.TOTAL     || 0,
      pending:   s.PENDING   || 0,
      approved:  s.APPROVED  || 0,
      in_use:    s.IN_USE    || 0,
      completed: s.COMPLETED || 0,
      rejected:  s.REJECTED  || 0,
      cancelled: s.CANCELLED || 0,
    },
    data: rows,
    pagination: {
      current_page: page, per_page: limit, total_data: total,
      total_page: totalPage, has_next_page: page < totalPage, has_previous_page: page > 1,
    },
    filters: { date_from: dateFrom, date_to: dateTo, status },
    timestamp: new Date().toISOString(),
  }
})

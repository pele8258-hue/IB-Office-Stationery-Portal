/**
 * GET /api/reports/vehicle/department
 * Department-level vehicle request summary grouped by dept + branch.
 * Query: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
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
  const now    = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const defaultTo   = now.toISOString().split('T')[0]
  const dateFrom = q.date_from || defaultFrom
  const dateTo   = q.date_to   || defaultTo

  const [rows, summaryRows] = await Promise.all([
    query(
      `SELECT
         NVL(d.name, 'No Department') AS department,
         NVL(b.name, 'No Branch')     AS branch,
         COUNT(*)                                                 AS total,
         COUNT(CASE WHEN vr.status = 'PENDING'   THEN 1 END)     AS pending,
         COUNT(CASE WHEN vr.status = 'APPROVED'  THEN 1 END)     AS approved,
         COUNT(CASE WHEN vr.status = 'IN_USE'    THEN 1 END)     AS in_use,
         COUNT(CASE WHEN vr.status = 'COMPLETED' THEN 1 END)     AS completed,
         COUNT(CASE WHEN vr.status = 'REJECTED'  THEN 1 END)     AS rejected,
         COUNT(CASE WHEN vr.status = 'CANCELLED' THEN 1 END)     AS cancelled
       FROM   vehicle_requests vr
       JOIN   staff s           ON s.id = vr.staff_id
       LEFT JOIN departments d  ON d.id = s.department_id
       LEFT JOIN branches    b  ON b.id = s.branch_id
       WHERE  TRUNC(vr.created_at) BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD') AND TO_DATE(:date_to, 'YYYY-MM-DD')
       GROUP BY d.name, b.name
       ORDER BY total DESC, d.name ASC NULLS LAST`,
      { date_from: dateFrom, date_to: dateTo }
    ),
    query(
      `SELECT COUNT(*) AS total FROM vehicle_requests
       WHERE TRUNC(created_at) BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD') AND TO_DATE(:date_to, 'YYYY-MM-DD')`,
      { date_from: dateFrom, date_to: dateTo }
    ),
  ])

  return {
    success: true,
    code: 200,
    message: 'Department report retrieved successfully',
    total_requests: summaryRows[0]?.TOTAL || 0,
    data: rows,
    filters: { date_from: dateFrom, date_to: dateTo },
    timestamp: new Date().toISOString(),
  }
})

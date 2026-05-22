/**
 * GET /api/staff
 * Returns paginated staff list with role, department, branch info
 * Query params: page, limit, search, status
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const q      = getQuery(event)
  const page   = Math.max(1, parseInt(q.page)  || 1)
  const limit  = Math.min(100, parseInt(q.limit) || 20)
  const offset = (page - 1) * limit
  const search = (q.search || '').trim()
  const status = q.status || ''

  const whereParts = ['1=1']
  const bindObj    = {}

  if (search) {
    bindObj.search1 = `%${search.toUpperCase()}%`
    bindObj.search2 = `%${search.toUpperCase()}%`
    whereParts.push(`(UPPER(s.name) LIKE :search1 OR UPPER(s.email) LIKE :search2)`)
  }
  if (status) {
    bindObj.status = status
    whereParts.push(`s.status = :status`)
  }

  const where = 'WHERE ' + whereParts.join(' AND ')

  bindObj.limit  = limit
  bindObj.offset = offset

  const rows = await query(
    `SELECT s.id, s.name, s.email, s.phone, s.position,
            s.status, s.created_at,
            r.name AS role_name,  r.code AS role_code,
            d.name AS department_name,
            b.name AS branch_name, b.code AS branch_code
     FROM staff s
     JOIN roles       r ON r.id = s.role_id
     JOIN departments d ON d.id = s.department_id
     JOIN branches    b ON b.id = s.branch_id
     ${where}
     ORDER BY s.created_at DESC
     OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
    bindObj
  )

  const countBindObj = { ...bindObj }
  delete countBindObj.limit
  delete countBindObj.offset

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM staff s
     JOIN roles       r ON r.id = s.role_id
     JOIN departments d ON d.id = s.department_id
     JOIN branches    b ON b.id = s.branch_id
     ${where}`,
    countBindObj
  )

  const total     = countRows[0]?.TOTAL || 0
  const totalPage = Math.ceil(total / limit)

  return {
    success: true,
    code: 200,
    message: 'Staff retrieved successfully',
    data: rows,
    pagination: {
      current_page:      page,
      per_page:          limit,
      total_data:        total,
      total_page:        totalPage,
      has_next_page:     page < totalPage,
      has_previous_page: page > 1,
    },
    timestamp: new Date().toISOString(),
  }
})

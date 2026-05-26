/**
 * GET /api/vehicles
 * Returns paginated vehicle list
 * Query: page, limit, search, status, type
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const q      = getQuery(event)
  const page   = Math.max(1, parseInt(q.page)  || 1)
  const limit  = Math.min(500, parseInt(q.limit) || 10)
  const offset = (page - 1) * limit
  const search       = (q.search || '').trim()
  const status       = q.status        || ''
  const type         = q.type          || ''
  const verifyStatus = q.verify_status || ''

  const whereParts = ['1=1']
  const bindObj    = {}

  if (search) {
    bindObj.s1 = `%${search.toUpperCase()}%`
    bindObj.s2 = `%${search.toUpperCase()}%`
    bindObj.s3 = `%${search.toUpperCase()}%`
    whereParts.push(`(UPPER(v.plate_number) LIKE :s1 OR UPPER(v.brand) LIKE :s2 OR UPPER(v.model) LIKE :s3)`)
  }
  if (status)       { bindObj.status        = status;       whereParts.push(`v.status        = :status`) }
  if (type)         { bindObj.type          = type;         whereParts.push(`v.type          = :type`) }
  if (verifyStatus) { bindObj.verify_status = verifyStatus; whereParts.push(`v.verify_status = :verify_status`) }

  const where = 'WHERE ' + whereParts.join(' AND ')

  bindObj.limit  = limit
  bindObj.offset = offset

  const rows = await query(
    `SELECT v.id, v.plate_number, v.brand, v.model, v.color, v.year,
            v.type, v.ownership_type, v.parking_lot, v.parking_floor,
            v.engine_number, v.frame_number,
            v.owner_name, v.owner_email, v.owner_phone, v.owner_dob,
            v.status, v.verify_status, v.reject_reason,
            v.created_at,
            b.name AS branch_name, b.code AS branch_code,
            (SELECT COUNT(*) FROM vehicle_documents vd WHERE vd.vehicle_id = v.id) AS doc_count
     FROM vehicles v
     JOIN branches b ON b.id = v.branch_id
     ${where}
     ORDER BY v.created_at DESC
     OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
    bindObj
  )

  const countBind = { ...bindObj }
  delete countBind.limit
  delete countBind.offset

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM vehicles v JOIN branches b ON b.id = v.branch_id ${where}`,
    countBind
  )

  const total     = countRows[0]?.TOTAL || 0
  const totalPage = Math.max(1, Math.ceil(total / limit))

  return {
    success: true,
    code: 200,
    message: 'Vehicles retrieved successfully',
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

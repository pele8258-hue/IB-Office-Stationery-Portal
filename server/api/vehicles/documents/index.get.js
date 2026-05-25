/**
 * GET /api/vehicles/documents
 * Returns paginated list of all vehicle documents
 * Query: page, limit, search, vehicle_id
 */
import { query } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  const q         = getQuery(event)
  const page      = Math.max(1, parseInt(q.page)  || 1)
  const limit     = Math.min(100, parseInt(q.limit) || 20)
  const offset    = (page - 1) * limit
  const search    = (q.search || '').trim()
  const vehicleId = q.vehicle_id ? Number(q.vehicle_id) : null
  // expiry: 'expired' | 'soon' (within 30 days) | 'all'
  const expiry    = q.expiry || 'expired'

  const whereParts = ["vd.deleted = 'N'"]
  const bindObj    = {}

  if (search) {
    bindObj.s1 = `%${search.toUpperCase()}%`
    bindObj.s2 = `%${search.toUpperCase()}%`
    whereParts.push(`(UPPER(vd.document_name) LIKE :s1 OR UPPER(v.plate_number) LIKE :s2)`)
  }
  if (vehicleId) {
    bindObj.vehicle_id = vehicleId
    whereParts.push(`vd.vehicle_id = :vehicle_id`)
  }
  if (expiry === 'expired') {
    whereParts.push(`vd.expiry_date IS NOT NULL AND vd.expiry_date < SYSDATE`)
  } else if (expiry === 'soon') {
    whereParts.push(`vd.expiry_date IS NOT NULL AND vd.expiry_date >= SYSDATE AND vd.expiry_date <= SYSDATE + 60`)
  }

  const where = 'WHERE ' + whereParts.join(' AND ')

  bindObj.limit  = limit
  bindObj.offset = offset

  const rows = await query(
    `SELECT vd.id, vd.document_name, vd.issued_date, vd.expiry_date, vd.file_path, vd.created_at,
            v.id AS vehicle_id, v.plate_number, v.brand, v.model,
            s.name AS uploaded_by_name
     FROM   vehicle_documents vd
     JOIN   vehicles v ON v.id = vd.vehicle_id
     LEFT JOIN staff s ON s.id = vd.uploaded_by
     ${where}
     ORDER  BY vd.created_at DESC
     OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
    bindObj
  )

  const countBind = { ...bindObj }
  delete countBind.limit
  delete countBind.offset

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM   vehicle_documents vd
     JOIN   vehicles v ON v.id = vd.vehicle_id
     ${where}`,
    countBind
  )

  const total     = countRows[0]?.TOTAL || 0
  const totalPage = Math.max(1, Math.ceil(total / limit))

  return {
    success: true,
    code: 200,
    message: 'Documents retrieved successfully',
    data: rows,
    pagination: {
      current_page: page, per_page: limit, total_data: total,
      total_page: totalPage, has_next_page: page < totalPage, has_previous_page: page > 1,
    },
    timestamp: new Date().toISOString(),
  }
})

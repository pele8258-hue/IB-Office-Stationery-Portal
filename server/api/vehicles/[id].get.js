/**
 * GET /api/vehicles/:id
 * Returns full vehicle detail including documents
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, data: { success: false, message: 'Invalid ID' } })

  const rows = await query(
    `SELECT v.id, v.plate_number, v.brand, v.model, v.color, v.year,
            v.type, v.ownership_type,
            v.engine_number, v.frame_number,
            v.parking_lot, v.parking_floor,
            v.owner_name, v.owner_email, v.owner_phone, v.owner_dob,
            v.status, v.verify_status, v.reject_reason,
            v.verified_by, v.verified_at,
            v.created_at, v.updated_at,
            b.id AS branch_id, b.name AS branch_name, b.code AS branch_code,
            sc.name AS created_by_name
     FROM   vehicles v
     JOIN   branches b ON b.id = v.branch_id
     LEFT JOIN staff sc ON sc.id = v.created_by
     WHERE  v.id = :id`,
    { id }
  )

  if (!rows.length) {
    throw createError({ statusCode: 404, data: { success: false, code: 404, message: 'Vehicle not found' } })
  }

  const docs = await query(
    `SELECT vd.id, vd.document_name, vd.issued_date, vd.expiry_date, vd.file_path, vd.created_at,
            s.name AS uploaded_by_name
     FROM   vehicle_documents vd
     LEFT JOIN staff s ON s.id = vd.uploaded_by
     WHERE  vd.vehicle_id = :id AND vd.deleted = 'N'
     ORDER  BY vd.created_at DESC`,
    { id }
  )

  return {
    success: true,
    code: 200,
    message: 'Vehicle retrieved successfully',
    data: { ...rows[0], documents: docs },
    timestamp: new Date().toISOString(),
  }
})

/**
 * PUT /api/vehicles/:id
 * Update vehicle info (not verify_status — use /verify for that)
 * Body: { plate_number, branch_id, brand, model, color, year, type,
 *         ownership_type, engine_number, frame_number,
 *         parking_lot, parking_floor,
 *         owner_name, owner_email, owner_phone, owner_dob }
 */
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = (await readBody(event)) ?? {}

  if (!id) throw createError({ statusCode: 400, data: { success: false, message: 'Invalid ID' } })

  const existing = await query(`SELECT id FROM vehicles WHERE id = :id`, { id })
  if (!existing.length) throw createError({ statusCode: 404, data: { success: false, message: 'Vehicle not found' } })

  const required = ['plate_number', 'branch_id']
  const missing  = required.filter(f => !body[f]?.toString().trim())
  if (missing.length) {
    throw createError({
      statusCode: 422,
      data: { success: false, code: 422, message: 'Validation failed', errors: Object.fromEntries(missing.map(f => [f, [`${f} is required`]])) },
    })
  }

  // Duplicate plate check (exclude self)
  const dup = await query(
    `SELECT id FROM vehicles WHERE UPPER(plate_number) = UPPER(:plate) AND id != :id`,
    { plate: body.plate_number.trim(), id }
  )
  if (dup.length) {
    throw createError({ statusCode: 409, data: { success: false, message: 'Plate number already in use by another vehicle' } })
  }

  await execute(
    `UPDATE vehicles SET
       plate_number   = :plate_number,
       branch_id      = :branch_id,
       brand          = :brand,
       model          = :model,
       color          = :color,
       year           = :year,
       type           = :type,
       ownership_type = :ownership_type,
       engine_number  = :engine_number,
       frame_number   = :frame_number,
       parking_lot    = :parking_lot,
       parking_floor  = :parking_floor,
       owner_name     = :owner_name,
       owner_email    = :owner_email,
       owner_phone    = :owner_phone,
       owner_dob      = CASE WHEN :owner_dob IS NOT NULL THEN TO_DATE(:owner_dob, 'YYYY-MM-DD') ELSE NULL END,
       updated_by     = :updated_by,
       updated_at     = CURRENT_TIMESTAMP
     WHERE id = :id`,
    {
      plate_number:   body.plate_number.trim().toUpperCase(),
      branch_id:      Number(body.branch_id),
      brand:          body.brand          || null,
      model:          body.model          || null,
      color:          body.color          || null,
      year:           body.year ? Number(body.year) : null,
      type:           body.type           || null,
      ownership_type: body.ownership_type || 'OWN',
      engine_number:  body.engine_number  || null,
      frame_number:   body.frame_number   || null,
      parking_lot:    body.parking_lot    || null,
      parking_floor:  body.parking_floor  || null,
      owner_name:     body.owner_name     || null,
      owner_email:    body.owner_email    || null,
      owner_phone:    body.owner_phone    || null,
      owner_dob:      body.owner_dob      || null,
      updated_by:     event.context.staff?.id || null,
      id,
    }
  )

  return {
    success: true,
    code: 200,
    message: 'Vehicle updated successfully',
    data: { id, plate_number: body.plate_number.trim().toUpperCase() },
    timestamp: new Date().toISOString(),
  }
})

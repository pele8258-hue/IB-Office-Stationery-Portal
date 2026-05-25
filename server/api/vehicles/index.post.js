/**
 * POST /api/vehicles
 * Create a new vehicle
 * Body: { plate_number, branch_id, brand, model, color, year, type,
 *         ownership_type, engine_number, frame_number,
 *         parking_lot, parking_floor,
 *         owner_name, owner_email, owner_phone, owner_dob }
 */
import oracledb from 'oracledb'
import { execute, query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) ?? {}

  const required = ['plate_number', 'branch_id']
  const missing  = required.filter(f => !body[f]?.toString().trim())
  if (missing.length) {
    throw createError({
      statusCode: 422,
      data: {
        success: false,
        code: 422,
        message: 'Validation failed',
        errors: Object.fromEntries(missing.map(f => [f, [`${f} is required`]])),
        timestamp: new Date().toISOString(),
      },
    })
  }

  const duplicate = await query(
    `SELECT id FROM vehicles WHERE UPPER(plate_number) = UPPER(:plate)`,
    { plate: body.plate_number.trim() }
  )
  if (duplicate.length) {
    throw createError({
      statusCode: 409,
      data: {
        success: false,
        code: 409,
        message: 'Plate number already registered',
        errors: { plate_number: ['This plate number is already in use'] },
        timestamp: new Date().toISOString(),
      },
    })
  }

  const result = await execute(
    `INSERT INTO vehicles (
       plate_number, branch_id, brand, model, color, year, type,
       ownership_type, engine_number, frame_number,
       parking_lot, parking_floor,
       owner_name, owner_email, owner_phone, owner_dob,
       status, verify_status, created_by
     ) VALUES (
       :plate_number, :branch_id, :brand, :model, :color, :year, :type,
       :ownership_type, :engine_number, :frame_number,
       :parking_lot, :parking_floor,
       :owner_name, :owner_email, :owner_phone,
       CASE WHEN :owner_dob IS NOT NULL THEN TO_DATE(:owner_dob, 'YYYY-MM-DD') ELSE NULL END,
       'AVAILABLE', 'PENDING', :created_by
     ) RETURNING id INTO :new_id`,
    {
      plate_number:   body.plate_number.trim().toUpperCase(),
      branch_id:      Number(body.branch_id),
      brand:          body.brand          || null,
      model:          body.model          || null,
      color:          body.color          || null,
      year:           body.year           ? Number(body.year) : null,
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
      created_by:     event.context.staff?.id || null,
      new_id:         { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    }
  )

  return {
    success: true,
    code: 201,
    message: 'Vehicle registered successfully',
    data: {
      id:           result.outBinds?.new_id?.[0],
      plate_number: body.plate_number.trim().toUpperCase(),
      status:       'AVAILABLE',
      verify_status:'PENDING',
    },
    meta: {
      created_by: event.context.staff?.id || null,
      created_at: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  }
})

/**
 * POST /api/bookings/:id/dispatch
 * Record/update departure info: actual_time_out, meter_before, photo — all optional.
 * Transitions APPROVED → IN_USE. Admins can also update after IN_USE or COMPLETED.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { execute, query } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  if (!event.context.staff) {
    throw createError({ statusCode: 401, data: { success: false, message: 'Unauthorized' } })
  }

  const id = parseInt(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, data: { success: false, message: 'Invalid ID' } })

  const rows = await query(
    `SELECT id, status, staff_id, vehicle_id FROM vehicle_requests WHERE id = :id`,
    { id }
  )
  if (!rows.length) throw createError({ statusCode: 404, data: { success: false, message: 'Request not found' } })

  const ADMIN_ROLES     = ['ADMIN', 'SUPER_ADMIN', 'CHECKER']
  const isAdmin         = ADMIN_ROLES.includes(event.context.staff.role)
  const booking         = rows[0]
  const allowedStatuses = isAdmin
    ? ['APPROVED', 'IN_USE', 'COMPLETED']
    : ['APPROVED', 'IN_USE']

  if (!allowedStatuses.includes(booking.STATUS)) {
    throw createError({ statusCode: 422, data: { success: false, message: 'Cannot update departure info for this booking status' } })
  }

  const parts       = await readMultipartFormData(event)
  const get         = (name) => parts?.find(p => p.name === name)?.data?.toString()?.trim() || null
  const actualTimeOut = get('actual_time_out')
  const meterBefore   = get('meter_before')

  // Handle photo upload
  const filePart = parts?.find(p => p.name === 'photo' && p.filename)
  let photoPath  = null
  if (filePart) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp']
    const ext     = extname(filePart.filename).toLowerCase()
    if (!allowed.includes(ext)) {
      throw createError({ statusCode: 422, data: { success: false, message: 'Invalid file type. Allowed: jpg, jpeg, png, webp' } })
    }
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'bookings')
    await mkdir(uploadDir, { recursive: true })
    const fileName = `trip_out_${id}_${Date.now()}${ext}`
    await writeFile(join(uploadDir, fileName), filePart.data)
    photoPath = `/uploads/bookings/${fileName}`
  }

  // NVL keeps existing value when new value is null
  await execute(
    `UPDATE vehicle_requests
     SET    status          = CASE WHEN status = 'APPROVED' THEN 'IN_USE' ELSE status END,
            actual_time_out = NVL(TO_TIMESTAMP(:time_out, 'YYYY-MM-DD"T"HH24:MI'), NVL(actual_time_out, SYSDATE)),
            meter_before    = NVL(:meter_before, meter_before),
            time_out_photo  = NVL(:photo, time_out_photo)
     WHERE  id = :id`,
    {
      time_out:     actualTimeOut || null,
      meter_before: meterBefore   ? parseFloat(meterBefore) : null,
      photo:        photoPath,
      id,
    }
  )

  return {
    success: true,
    code: 200,
    message: 'Trip departure updated successfully',
    data: { id, status: booking.STATUS === 'APPROVED' ? 'IN_USE' : booking.STATUS },
    meta: { recorded_by: event.context.staff.id, recorded_at: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  }
})

/**
 * POST /api/bookings/:id/complete
 * Record/update return info: actual_time_in, meter_after, photo — all optional.
 * Transitions IN_USE → COMPLETED, releases vehicle. Admins can also update after COMPLETED.
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
    ? ['IN_USE', 'COMPLETED']
    : ['IN_USE']

  if (!allowedStatuses.includes(booking.STATUS)) {
    throw createError({ statusCode: 422, data: { success: false, message: 'Cannot update return info for this booking status' } })
  }

  const parts      = await readMultipartFormData(event)
  const get        = (name) => parts?.find(p => p.name === name)?.data?.toString()?.trim() || null
  const actualTimeIn = get('actual_time_in')
  const meterAfter   = get('meter_after')

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
    const fileName = `trip_in_${id}_${Date.now()}${ext}`
    await writeFile(join(uploadDir, fileName), filePart.data)
    photoPath = `/uploads/bookings/${fileName}`
  }

  // NVL keeps existing value when new value is null
  await execute(
    `UPDATE vehicle_requests
     SET    status         = 'COMPLETED',
            actual_time_in = NVL(TO_TIMESTAMP(:time_in, 'YYYY-MM-DD"T"HH24:MI'), NVL(actual_time_in, SYSDATE)),
            meter_after    = NVL(:meter_after, meter_after),
            time_in_photo  = NVL(:photo, time_in_photo)
     WHERE  id = :id`,
    {
      time_in:     actualTimeIn || null,
      meter_after: meterAfter   ? parseFloat(meterAfter) : null,
      photo:       photoPath,
      id,
    }
  )

  // Release vehicle only when transitioning from IN_USE
  if (booking.STATUS === 'IN_USE' && booking.VEHICLE_ID) {
    await execute(
      `UPDATE vehicles SET status = 'AVAILABLE' WHERE id = :vehicle_id`,
      { vehicle_id: booking.VEHICLE_ID }
    )
  }

  return {
    success: true,
    code: 200,
    message: 'Trip return updated successfully',
    data: { id, status: 'COMPLETED' },
    meta: { recorded_by: event.context.staff.id, recorded_at: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  }
})

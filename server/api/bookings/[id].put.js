/**
 * PUT /api/bookings/:id
 * Update booking status.
 * Body: { action, vehicle_id?, reject_reason? }
 *
 * approve  → PENDING  → APPROVED   (admin/checker, vehicle_id required)
 * reject   → PENDING  → REJECTED   (admin/checker, reject_reason required)
 * cancel   → PENDING  → CANCELLED  (owner only)
 * dispatch → APPROVED → IN_USE     (admin/checker, records actual_time_out)
 * complete → IN_USE   → COMPLETED  (admin/checker, records actual_time_in)
 */
import { execute, query } from '../../utils/db.js'
import { sendApprovalEmail } from '../../utils/email.js'

export default defineEventHandler(async (event) => {
  if (!event.context.staff) {
    throw createError({ statusCode: 401, data: { success: false, message: 'Unauthorized' } })
  }

  const id   = parseInt(getRouterParam(event, 'id'))
  const body = await readBody(event) ?? {}

  if (!id) throw createError({ statusCode: 400, data: { success: false, message: 'Invalid ID' } })

  const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CHECKER']
  const isAdmin     = ADMIN_ROLES.includes(event.context.staff.role)

  const rows = await query(
    `SELECT id, status, staff_id, vehicle_id FROM vehicle_requests WHERE id = :id`,
    { id }
  )
  if (!rows.length) {
    throw createError({ statusCode: 404, data: { success: false, message: 'Request not found' } })
  }

  const booking = rows[0]
  const action  = body.action

  if (action === 'approve') {
    if (!isAdmin) throw createError({ statusCode: 403, data: { success: false, message: 'Permission denied' } })
    if (booking.STATUS !== 'PENDING') {
      throw createError({ statusCode: 422, data: { success: false, message: 'Only PENDING requests can be approved' } })
    }
    if (!body.vehicle_id) {
      throw createError({ statusCode: 422, data: { success: false, errors: { vehicle_id: ['Vehicle assignment is required to approve'] }, message: 'Validation failed' } })
    }

    await execute(
      `UPDATE vehicle_requests
       SET    status = 'APPROVED', vehicle_id = :vehicle_id, approved_by = :approved_by
       WHERE  id = :id`,
      { vehicle_id: Number(body.vehicle_id), approved_by: event.context.staff.id, id }
    )

    // Mark the assigned vehicle as in use
    await execute(
      `UPDATE vehicles SET status = 'IN_USE' WHERE id = :vehicle_id`,
      { vehicle_id: Number(body.vehicle_id) }
    )

    // Fire-and-forget approval email to requester
    ;(async () => {
      try {
        const vehicleId = Number(body.vehicle_id)
        const [reqRows, vRows, approverRows] = await Promise.all([
          query(
            `SELECT s.name, s.email, vr.request_no, vr.destination, vr.purpose,
                    vr.requested_time_out, vr.requested_time_in
             FROM   vehicle_requests vr
             JOIN   staff s ON s.id = vr.staff_id
             WHERE  vr.id = :id`,
            { id }
          ),
          query(
            `SELECT plate_number, brand, model, color, parking_lot, parking_floor
             FROM   vehicles WHERE id = :id`,
            { id: vehicleId }
          ),
          query(
            `SELECT name FROM staff WHERE id = :id`,
            { id: event.context.staff.id }
          ),
        ])
        if (!reqRows.length || !vRows.length) return
        const r = reqRows[0]
        const v = vRows[0]
        if (!r.EMAIL) return

        await sendApprovalEmail({
          to:           r.EMAIL,
          requesterName: r.NAME,
          requestNo:    r.REQUEST_NO,
          destination:  r.DESTINATION,
          purpose:      r.PURPOSE,
          timeOut:      r.REQUESTED_TIME_OUT,
          timeIn:       r.REQUESTED_TIME_IN,
          plateNumber:  v.PLATE_NUMBER,
          brand:        v.BRAND,
          model:        v.MODEL,
          color:        v.COLOR,
          parkingLot:   v.PARKING_LOT,
          parkingFloor: v.PARKING_FLOOR,
          approvedBy:   approverRows[0]?.NAME || 'Admin',
        })
      } catch (err) {
        console.error('[email] Failed to send approval notification:', err)
      }
    })()

  } else if (action === 'reject') {
    if (!isAdmin) throw createError({ statusCode: 403, data: { success: false, message: 'Permission denied' } })
    if (booking.STATUS !== 'PENDING') {
      throw createError({ statusCode: 422, data: { success: false, message: 'Only PENDING requests can be rejected' } })
    }
    if (!body.reject_reason?.trim()) {
      throw createError({ statusCode: 422, data: { success: false, errors: { reject_reason: ['Reject reason is required'] }, message: 'Validation failed' } })
    }

    await execute(
      `UPDATE vehicle_requests
       SET    status = 'REJECTED', reject_reason = :reason, approved_by = :approved_by,
              vehicle_id = NULL
       WHERE  id = :id`,
      { reason: body.reject_reason.trim(), approved_by: event.context.staff.id, id }
    )

    // Release vehicle back to available if one was assigned
    if (booking.VEHICLE_ID) {
      await execute(
        `UPDATE vehicles SET status = 'AVAILABLE' WHERE id = :vehicle_id`,
        { vehicle_id: booking.VEHICLE_ID }
      )
    }

  } else if (action === 'update_details') {
    const allowedStatuses = isAdmin
      ? ['PENDING', 'REJECTED', 'APPROVED']
      : ['PENDING', 'REJECTED']

    if (!allowedStatuses.includes(booking.STATUS)) {
      throw createError({ statusCode: 422, data: { success: false, message: 'Trip details cannot be edited at this stage' } })
    }
    if (!isAdmin && booking.STAFF_ID !== event.context.staff.id) {
      throw createError({ statusCode: 403, data: { success: false, message: 'You can only edit your own requests' } })
    }

    const errors = {}
    if (!body.destination?.trim()) errors.destination = ['Destination is required']
    if (!body.purpose?.trim())     errors.purpose     = ['Purpose is required']
    if (Object.keys(errors).length) {
      throw createError({ statusCode: 422, data: { success: false, message: 'Validation failed', errors } })
    }

    await execute(
      `UPDATE vehicle_requests
       SET    destination        = :destination,
              purpose            = :purpose,
              requested_time_out = NVL(TO_TIMESTAMP(:time_out, 'YYYY-MM-DD"T"HH24:MI'), requested_time_out),
              requested_time_in  = NVL(TO_TIMESTAMP(:time_in,  'YYYY-MM-DD"T"HH24:MI'), requested_time_in),
              notes              = :notes,
              updated_by         = :updated_by
       WHERE  id = :id`,
      {
        destination: body.destination.trim(),
        purpose:     body.purpose.trim(),
        time_out:    body.requested_time_out || null,
        time_in:     body.requested_time_in  || null,
        notes:       body.notes?.trim() || null,
        updated_by:  event.context.staff.id,
        id,
      }
    )

  } else if (action === 'resubmit') {
    if (booking.STAFF_ID !== event.context.staff.id) {
      throw createError({ statusCode: 403, data: { success: false, message: 'You can only resubmit your own requests' } })
    }
    if (booking.STATUS !== 'REJECTED') {
      throw createError({ statusCode: 422, data: { success: false, message: 'Only REJECTED requests can be resubmitted' } })
    }

    await execute(
      `UPDATE vehicle_requests
       SET    status = 'PENDING', reject_reason = NULL, approved_by = NULL
       WHERE  id = :id`,
      { id }
    )

  } else if (action === 'cancel') {
    if (booking.STAFF_ID !== event.context.staff.id) {
      throw createError({ statusCode: 403, data: { success: false, message: 'You can only cancel your own requests' } })
    }
    if (!['PENDING', 'REJECTED'].includes(booking.STATUS)) {
      throw createError({ statusCode: 422, data: { success: false, message: 'Only PENDING or REJECTED requests can be cancelled' } })
    }

    await execute(
      `UPDATE vehicle_requests SET status = 'CANCELLED', vehicle_id = NULL WHERE id = :id`,
      { id }
    )

    // Release vehicle back to available if one was assigned
    if (booking.VEHICLE_ID) {
      await execute(
        `UPDATE vehicles SET status = 'AVAILABLE' WHERE id = :vehicle_id`,
        { vehicle_id: booking.VEHICLE_ID }
      )
    }

  } else if (action === 'change_vehicle') {
    if (!isAdmin) throw createError({ statusCode: 403, data: { success: false, message: 'Permission denied' } })
    if (!['APPROVED', 'IN_USE'].includes(booking.STATUS)) {
      throw createError({ statusCode: 422, data: { success: false, message: 'Vehicle can only be changed for APPROVED or IN_USE bookings' } })
    }
    if (!body.vehicle_id) {
      throw createError({ statusCode: 422, data: { success: false, errors: { vehicle_id: ['Please select a new vehicle'] }, message: 'Validation failed' } })
    }

    const newVehicleId = Number(body.vehicle_id)

    // Release old vehicle back to available
    if (booking.VEHICLE_ID && booking.VEHICLE_ID !== newVehicleId) {
      await execute(
        `UPDATE vehicles SET status = 'AVAILABLE' WHERE id = :vehicle_id`,
        { vehicle_id: booking.VEHICLE_ID }
      )
    }

    // Assign new vehicle and mark it IN_USE
    await execute(
      `UPDATE vehicle_requests SET vehicle_id = :vehicle_id WHERE id = :id`,
      { vehicle_id: newVehicleId, id }
    )
    await execute(
      `UPDATE vehicles SET status = 'IN_USE' WHERE id = :vehicle_id`,
      { vehicle_id: newVehicleId }
    )

  } else if (action === 'revert') {
    if (!isAdmin) throw createError({ statusCode: 403, data: { success: false, message: 'Permission denied' } })
    if (booking.STATUS !== 'APPROVED') {
      throw createError({ statusCode: 422, data: { success: false, message: 'Only APPROVED requests can be reverted' } })
    }

    await execute(
      `UPDATE vehicle_requests
       SET    status = 'PENDING', vehicle_id = NULL, approved_by = NULL
       WHERE  id = :id`,
      { id }
    )

    // Release the vehicle back to available
    if (booking.VEHICLE_ID) {
      await execute(
        `UPDATE vehicles SET status = 'AVAILABLE' WHERE id = :vehicle_id`,
        { vehicle_id: booking.VEHICLE_ID }
      )
    }

  } else if (action === 'dispatch') {
    if (!isAdmin) throw createError({ statusCode: 403, data: { success: false, message: 'Permission denied' } })
    if (booking.STATUS !== 'APPROVED') {
      throw createError({ statusCode: 422, data: { success: false, message: 'Only APPROVED requests can be dispatched' } })
    }

    await execute(
      `UPDATE vehicle_requests SET status = 'IN_USE', actual_time_out = SYSDATE WHERE id = :id`,
      { id }
    )

  } else if (action === 'revert_dispatch') {
    if (!isAdmin) throw createError({ statusCode: 403, data: { success: false, message: 'Permission denied' } })
    if (booking.STATUS !== 'IN_USE') {
      throw createError({ statusCode: 422, data: { success: false, message: 'Only IN_USE requests can be reverted to Approved' } })
    }

    // Revert to APPROVED — vehicle stays assigned (no status change needed on vehicle)
    await execute(
      `UPDATE vehicle_requests
       SET    status = 'APPROVED', actual_time_out = NULL
       WHERE  id = :id`,
      { id }
    )

  } else if (action === 'complete') {
    if (!isAdmin) throw createError({ statusCode: 403, data: { success: false, message: 'Permission denied' } })
    if (booking.STATUS !== 'IN_USE') {
      throw createError({ statusCode: 422, data: { success: false, message: 'Only IN_USE requests can be completed' } })
    }

    await execute(
      `UPDATE vehicle_requests SET status = 'COMPLETED', actual_time_in = SYSDATE WHERE id = :id`,
      { id }
    )

    // Release the vehicle back to available
    if (booking.VEHICLE_ID) {
      await execute(
        `UPDATE vehicles SET status = 'AVAILABLE' WHERE id = :vehicle_id`,
        { vehicle_id: booking.VEHICLE_ID }
      )
    }

  } else {
    throw createError({ statusCode: 400, data: { success: false, message: 'Invalid action' } })
  }

  return {
    success: true,
    code: 200,
    message: `Request ${action}d successfully`,
    data: { id },
    meta: { updated_by: event.context.staff.id, updated_at: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  }
})

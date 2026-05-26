/**
 * POST /api/bookings
 * Create a new vehicle request.
 * Body: { vehicle_id, requested_time_out, requested_time_in, destination,
 *         purpose, driver_id, passenger_count, passengers: [staff_id], notes }
 */
import oracledb from 'oracledb'
import { execute, query } from '../../utils/db.js'
import { sendNewRequestEmail } from '../../utils/email.js'

export default defineEventHandler(async (event) => {
  if (!event.context.staff) {
    throw createError({ statusCode: 401, data: { success: false, message: 'Unauthorized' } })
  }

  const body = await readBody(event) ?? {}

  const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CHECKER']
  const isAdmin     = ADMIN_ROLES.includes(event.context.staff.role)
  const staffId     = (isAdmin && body.requester_id) ? Number(body.requester_id) : event.context.staff.id

  const errors = {}
  if (isAdmin && !body.requester_id)  errors.requester_id       = ['Requester is required']
  if (!body.destination?.trim())      errors.destination        = ['Destination is required']
  if (!body.purpose?.trim())          errors.purpose            = ['Purpose is required']
  if (!body.requested_time_out)       errors.requested_time_out = ['Departure date & time is required']
  if (!body.requested_time_in)        errors.requested_time_in  = ['Return date & time is required']
  if (!body.driver_id)                errors.driver_id          = ['Driver is required']

  if (body.requested_time_out && body.requested_time_in) {
    if (new Date(body.requested_time_in) <= new Date(body.requested_time_out)) {
      errors.requested_time_in = ['Return time must be after departure time']
    }
  }

  if (Object.keys(errors).length) {
    throw createError({
      statusCode: 422,
      data: { success: false, code: 422, message: 'Validation failed', errors, timestamp: new Date().toISOString() },
    })
  }

  const passengers = Array.isArray(body.passengers)
    ? body.passengers.map(Number).filter(Boolean)
    : []

  const result = await execute(
    `INSERT INTO vehicle_requests (
       vehicle_id, staff_id, driver_id, purpose, destination,
       passenger_count, requested_time_out, requested_time_in, notes, created_by
     ) VALUES (
       :vehicle_id, :staff_id, :driver_id, :purpose, :destination,
       :passenger_count,
       TO_TIMESTAMP(:time_out, 'YYYY-MM-DD"T"HH24:MI'),
       TO_TIMESTAMP(:time_in,  'YYYY-MM-DD"T"HH24:MI'),
       :notes, :created_by
     ) RETURNING id INTO :new_id`,
    {
      vehicle_id:      body.vehicle_id ? Number(body.vehicle_id) : null,
      staff_id:        staffId,
      driver_id:       body.driver_id ? Number(body.driver_id) : null,
      purpose:         body.purpose?.trim() || null,
      destination:     body.destination.trim(),
      passenger_count: passengers.length,
      time_out:        body.requested_time_out,
      time_in:         body.requested_time_in,
      notes:           body.notes?.trim() || null,
      created_by:      event.context.staff.id,
      new_id:          { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    }
  )

  const newId = result.outBinds?.new_id?.[0]

  for (const staffId of passengers) {
    await execute(
      `INSERT INTO vehicle_request_passengers (request_id, staff_id) VALUES (:rid, :sid)`,
      { rid: newId, sid: staffId }
    ).catch(() => {})
  }

  const newRow = await query(`SELECT request_no FROM vehicle_requests WHERE id = :id`, { id: newId })
  const requestNo = newRow[0]?.REQUEST_NO || String(newId)

  // Fire-and-forget email notification to all CHECKER/ADMIN/SUPER_ADMIN
  ;(async () => {
    try {
      // Requester name + dept + branch
      const requesterRows = await query(
        `SELECT s.name, d.name AS dept, b.name AS branch
         FROM   staff s
         LEFT JOIN departments d ON d.id = s.department_id
         LEFT JOIN branches    b ON b.id = s.branch_id
         WHERE  s.id = :id`,
        { id: staffId }
      )
      const requesterName   = requesterRows[0]?.NAME   || 'Unknown'
      const requesterDept   = requesterRows[0]?.DEPT   || null
      const requesterBranch = requesterRows[0]?.BRANCH || null

      // Driver name + dept + branch
      let driverName = null, driverDept = null, driverBranch = null
      if (body.driver_id) {
        const driverRows = await query(
          `SELECT s.name, d.name AS dept, b.name AS branch
           FROM   staff s
           LEFT JOIN departments d ON d.id = s.department_id
           LEFT JOIN branches    b ON b.id = s.branch_id
           WHERE  s.id = :id`,
          { id: Number(body.driver_id) }
        )
        driverName   = driverRows[0]?.NAME   || null
        driverDept   = driverRows[0]?.DEPT   || null
        driverBranch = driverRows[0]?.BRANCH || null
      }

      // Passenger names + dept + branch
      let passengerList = []
      if (passengers.length) {
        const passengerRows = await query(
          `SELECT s.name, d.name AS dept, b.name AS branch
           FROM   staff s
           LEFT JOIN departments d ON d.id = s.department_id
           LEFT JOIN branches    b ON b.id = s.branch_id
           WHERE  s.id IN (${passengers.map((_, i) => `:p${i}`).join(',')})`,
          Object.fromEntries(passengers.map((id, i) => [`p${i}`, id]))
        )
        passengerList = passengerRows.map(r => ({
          name:   r.NAME,
          dept:   r.DEPT   || null,
          branch: r.BRANCH || null,
        }))
      }

      // All admin/checker/super_admin emails (staff.role_id → roles.code)
      const adminRows = await query(
        `SELECT s.email
         FROM   staff s
         JOIN   roles r ON r.id = s.role_id
         WHERE  r.code IN ('ADMIN', 'SUPER_ADMIN', 'CHECKER')
           AND  s.status = 'A'
           AND  s.email IS NOT NULL`,
        {}
      )
      const toEmails = adminRows.map(r => r.EMAIL).filter(Boolean)
      if (!toEmails.length) return

      await sendNewRequestEmail({
        to:             toEmails.join(','),
        requestNo,
        requesterName,
        requesterDept,
        requesterBranch,
        driverName,
        driverDept,
        driverBranch,
        passengerCount: passengers.length,
        passengers:     passengerList,
        destination:    body.destination.trim(),
        purpose:        body.purpose?.trim() || '',
        timeOut:        body.requested_time_out,
        timeIn:         body.requested_time_in,
        notes:          body.notes?.trim() || null,
      })
    } catch (err) {
      console.error('[email] Failed to send new request notification:', err)
    }
  })()

  return {
    success: true,
    code: 201,
    message: 'Vehicle request submitted successfully',
    data: { id: newId, request_no: requestNo },
    meta: { created_by: event.context.staff.id, created_at: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  }
})

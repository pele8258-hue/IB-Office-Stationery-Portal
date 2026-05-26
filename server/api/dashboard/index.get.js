/**
 * GET /api/dashboard
 * Returns role-appropriate dashboard data.
 * Admin/Checker/SuperAdmin → fleet + pending overview.
 * Staff → personal request stats + upcoming trips.
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  if (!event.context.staff) {
    throw createError({ statusCode: 401, data: { success: false, message: 'Unauthorized' } })
  }

  const staffId     = event.context.staff.id
  const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CHECKER']
  const isAdmin     = ADMIN_ROLES.includes(event.context.staff.role)

  if (isAdmin) {
    const [
      pendingRows,
      vehicleStatusRows,
      todayRows,
      monthStatusRows,
      recentPending,
      inUseRows,
      docAlertRows,
    ] = await Promise.all([
      // Pending count
      query(`SELECT COUNT(*) AS cnt FROM vehicle_requests WHERE status = 'PENDING'`, {}),

      // Vehicle fleet by status
      query(`SELECT status, COUNT(*) AS cnt FROM vehicles GROUP BY status`, {}),

      // New requests submitted today
      query(`SELECT COUNT(*) AS cnt FROM vehicle_requests WHERE TRUNC(created_at) = TRUNC(SYSDATE)`, {}),

      // This month requests by status
      query(
        `SELECT status, COUNT(*) AS cnt
         FROM vehicle_requests
         WHERE TRUNC(created_at) >= TRUNC(SYSDATE, 'MM')
         GROUP BY status`,
        {}
      ),

      // Oldest pending requests first (most urgent)
      query(
        `SELECT vr.id, vr.request_no, vr.destination, vr.requested_time_out, vr.created_at,
                s.name AS requester_name, d.name AS department
         FROM   vehicle_requests vr
         JOIN   staff s          ON s.id = vr.staff_id
         LEFT JOIN departments d ON d.id = s.department_id
         WHERE  vr.status = 'PENDING'
         ORDER  BY vr.created_at ASC
         FETCH FIRST 8 ROWS ONLY`,
        {}
      ),

      // Currently in-use bookings
      query(
        `SELECT vr.id, vr.request_no, vr.destination,
                vr.actual_time_out, vr.requested_time_in,
                v.plate_number, v.brand, v.model,
                s.name AS requester_name
         FROM   vehicle_requests vr
         JOIN   vehicles v ON v.id = vr.vehicle_id
         JOIN   staff s    ON s.id = vr.staff_id
         WHERE  vr.status = 'IN_USE'
         ORDER  BY NVL(vr.actual_time_out, vr.requested_time_out) ASC
         FETCH FIRST 6 ROWS ONLY`,
        {}
      ),

      // Document alerts: expired + expiring within 30 days
      query(
        `SELECT
           COUNT(CASE WHEN expiry_date <  TRUNC(SYSDATE)          THEN 1 END) AS expired,
           COUNT(CASE WHEN expiry_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 30 THEN 1 END) AS expiring_soon
         FROM vehicle_documents
         WHERE deleted_at IS NULL`,
        {}
      ),
    ])

    const vehicleMap  = {}
    vehicleStatusRows.forEach(r => { vehicleMap[r.STATUS] = Number(r.CNT) })
    const monthMap = {}
    monthStatusRows.forEach(r => { monthMap[r.STATUS] = Number(r.CNT) })
    const monthTotal = Object.values(monthMap).reduce((a, b) => a + b, 0)
    const docs = docAlertRows[0] || {}

    return {
      success:  true,
      role:     'admin',
      stats: {
        pending:            Number(pendingRows[0]?.CNT) || 0,
        vehicles_available: vehicleMap['AVAILABLE'] || 0,
        vehicles_in_use:    vehicleMap['IN_USE']    || 0,
        vehicles_total:     Object.values(vehicleMap).reduce((a, b) => a + b, 0),
        today_requests:     Number(todayRows[0]?.CNT) || 0,
        month_total:        monthTotal,
        docs_expired:       Number(docs.EXPIRED)      || 0,
        docs_expiring:      Number(docs.EXPIRING_SOON) || 0,
      },
      vehicle_status:  vehicleMap,
      month_by_status: monthMap,
      recent_pending:  recentPending,
      in_use:          inUseRows,
      timestamp:       new Date().toISOString(),
    }

  } else {
    const [myStatsRows, allTimeRows, recentRows, upcomingRows] = await Promise.all([
      // This month stats
      query(
        `SELECT
           COUNT(*) AS total,
           COUNT(CASE WHEN status = 'PENDING'   THEN 1 END) AS pending,
           COUNT(CASE WHEN status = 'APPROVED'  THEN 1 END) AS approved,
           COUNT(CASE WHEN status = 'IN_USE'    THEN 1 END) AS in_use,
           COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed,
           COUNT(CASE WHEN status = 'REJECTED'  THEN 1 END) AS rejected,
           COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) AS cancelled
         FROM vehicle_requests
         WHERE staff_id = :sid
           AND TRUNC(created_at) >= TRUNC(SYSDATE, 'MM')`,
        { sid: staffId }
      ),

      // All-time total
      query(`SELECT COUNT(*) AS total FROM vehicle_requests WHERE staff_id = :sid`, { sid: staffId }),

      // My last 5 requests
      query(
        `SELECT vr.id, vr.request_no, vr.status, vr.destination,
                vr.requested_time_out, vr.requested_time_in, vr.created_at,
                v.plate_number, v.brand, v.model
         FROM   vehicle_requests vr
         LEFT JOIN vehicles v ON v.id = vr.vehicle_id
         WHERE  vr.staff_id = :sid
         ORDER  BY vr.created_at DESC
         FETCH FIRST 5 ROWS ONLY`,
        { sid: staffId }
      ),

      // My upcoming approved trips
      query(
        `SELECT vr.id, vr.request_no, vr.destination,
                vr.requested_time_out, vr.requested_time_in,
                v.plate_number, v.brand, v.model, v.color
         FROM   vehicle_requests vr
         JOIN   vehicles v ON v.id = vr.vehicle_id
         WHERE  vr.staff_id = :sid
           AND  vr.status = 'APPROVED'
         ORDER  BY vr.requested_time_out ASC
         FETCH FIRST 5 ROWS ONLY`,
        { sid: staffId }
      ),
    ])

    const s = myStatsRows[0] || {}
    return {
      success:  true,
      role:     'staff',
      stats: {
        month_total: Number(s.TOTAL)     || 0,
        pending:     Number(s.PENDING)   || 0,
        approved:    Number(s.APPROVED)  || 0,
        in_use:      Number(s.IN_USE)    || 0,
        completed:   Number(s.COMPLETED) || 0,
        rejected:    Number(s.REJECTED)  || 0,
        cancelled:   Number(s.CANCELLED) || 0,
        all_time:    Number(allTimeRows[0]?.TOTAL) || 0,
      },
      recent:    recentRows,
      upcoming:  upcomingRows,
      timestamp: new Date().toISOString(),
    }
  }
})

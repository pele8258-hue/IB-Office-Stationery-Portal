/**
 * GET /api/notifications/email-logs
 * Returns paginated email notification history from email_notifications table.
 * Query: page, limit, search, status, notification_type
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  if (!event.context.staff) {
    throw createError({ statusCode: 401, data: { success: false, message: 'Unauthorized' } })
  }

  const q      = getQuery(event)
  const page   = Math.max(1, parseInt(q.page)  || 1)
  const limit  = Math.min(100, parseInt(q.limit) || 20)
  const offset = (page - 1) * limit
  const search = (q.search || '').trim()
  const status = q.status || ''
  const type   = q.notification_type || ''

  const whereParts = []
  const binds      = {}

  if (search) {
    binds.s1 = `%${search.toUpperCase()}%`
    binds.s2 = `%${search.toUpperCase()}%`
    binds.s3 = `%${search.toUpperCase()}%`
    whereParts.push(`(UPPER(en.sent_to) LIKE :s1 OR UPPER(v.plate_number) LIKE :s2 OR UPPER(vd.document_name) LIKE :s3)`)
  }
  if (status) {
    binds.status = status
    whereParts.push(`en.status = :status`)
  }
  if (type) {
    binds.notif_type = type
    whereParts.push(`en.notification_type = :notif_type`)
  }

  const where = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : ''

  binds.limit  = limit
  binds.offset = offset

  const rows = await query(
    `SELECT
       en.id,
       en.notification_type,
       en.sent_to,
       en.status,
       en.error_message,
       en.sent_at,
       v.id           AS vehicle_id,
       v.plate_number,
       v.brand,
       v.model,
       v.owner_name,
       vd.id          AS document_id,
       vd.document_name,
       vd.expiry_date
     FROM email_notifications en
     JOIN vehicles v          ON v.id  = en.vehicle_id
     JOIN vehicle_documents vd ON vd.id = en.document_id
     ${where}
     ORDER BY en.sent_at DESC
     OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
    binds
  )

  const countBinds = { ...binds }
  delete countBinds.limit
  delete countBinds.offset

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM email_notifications en
     JOIN vehicles v           ON v.id  = en.vehicle_id
     JOIN vehicle_documents vd ON vd.id = en.document_id
     ${where}`,
    countBinds
  )

  const total     = countRows[0]?.TOTAL || 0
  const totalPage = Math.max(1, Math.ceil(total / limit))

  return {
    success: true,
    code: 200,
    message: 'Email logs retrieved successfully',
    data: rows,
    pagination: {
      current_page: page, per_page: limit, total_data: total,
      total_page: totalPage, has_next_page: page < totalPage, has_previous_page: page > 1,
    },
    timestamp: new Date().toISOString(),
  }
})

/**
 * POST /api/vehicles/documents/notify/:id
 * Manually send an expiry notification email for a specific document.
 * Works independently from the auto scheduler — always sends regardless of history.
 */
import { query, execute } from '../../../../utils/db.js'
import { sendExpiryEmail } from '../../../../utils/email.js'

function resolveNotifType(expiryDate) {
  const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000)
  if (days < 0)   return 'EXPIRED'
  if (days <= 9)  return '1_WEEK'
  if (days <= 33) return '1_MONTH'
  return '2_MONTHS'
}

export default defineEventHandler(async (event) => {
  if (!event.context.staff) {
    throw createError({ statusCode: 401, data: { success: false, code: 401, message: 'Unauthorized' } })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, data: { success: false, message: 'Invalid document ID' } })

  const rows = await query(
    `SELECT
       vd.id            AS document_id,
       vd.document_name,
       vd.expiry_date,
       v.id             AS vehicle_id,
       v.plate_number,
       v.brand,
       v.model,
       v.owner_name,
       v.owner_email,
       v.owner_phone
     FROM vehicle_documents vd
     JOIN vehicles v ON v.id = vd.vehicle_id
     WHERE vd.id = :id AND vd.deleted = 'N'`,
    { id }
  )

  if (!rows.length) {
    throw createError({ statusCode: 404, data: { success: false, message: 'Document not found' } })
  }

  const doc = rows[0]

  if (!doc.OWNER_EMAIL || !doc.OWNER_EMAIL.trim()) {
    throw createError({ statusCode: 422, data: { success: false, message: 'This vehicle has no owner email on record' } })
  }

  if (!doc.EXPIRY_DATE) {
    throw createError({ statusCode: 422, data: { success: false, message: 'Document has no expiry date set' } })
  }

  const notifType     = resolveNotifType(doc.EXPIRY_DATE)
  const daysRemaining = Math.ceil((new Date(doc.EXPIRY_DATE) - new Date()) / 86400000)

  try {
    await sendExpiryEmail({
      to:               doc.OWNER_EMAIL,
      ownerName:        doc.OWNER_NAME || 'Vehicle Owner',
      ownerEmail:       doc.OWNER_EMAIL,
      ownerPhone:       doc.OWNER_PHONE || '',
      documentName:     doc.DOCUMENT_NAME,
      plateNumber:      doc.PLATE_NUMBER,
      brand:            doc.BRAND || '',
      model:            doc.MODEL || '',
      expiryDate:       doc.EXPIRY_DATE,
      daysRemaining,
      notificationType: notifType,
    })

    await execute(
      `INSERT INTO email_notifications (vehicle_id, document_id, notification_type, sent_to, status)
       VALUES (:vehicle_id, :document_id, :notif_type, :sent_to, 'SENT')`,
      { vehicle_id: doc.VEHICLE_ID, document_id: doc.DOCUMENT_ID, notif_type: notifType, sent_to: doc.OWNER_EMAIL }
    )

    return {
      success: true,
      code: 200,
      message: `Notification sent to ${doc.OWNER_EMAIL}`,
      data: { sent_to: doc.OWNER_EMAIL, notification_type: notifType },
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    await execute(
      `INSERT INTO email_notifications (vehicle_id, document_id, notification_type, sent_to, status, error_message)
       VALUES (:vehicle_id, :document_id, :notif_type, :sent_to, 'FAILED', :error_message)`,
      { vehicle_id: doc.VEHICLE_ID, document_id: doc.DOCUMENT_ID, notif_type: notifType, sent_to: doc.OWNER_EMAIL, error_message: err.message?.substring(0, 999) }
    ).catch(() => {})

    throw createError({ statusCode: 500, data: { success: false, message: 'Failed to send email: ' + err.message } })
  }
})

/**
 * Nitro scheduled task: document:expiry-check
 * Runs daily at 08:00 to find documents near expiry and send email notifications.
 *
 * Notification windows:
 *   2_MONTHS — 57-63 days remaining
 *   1_MONTH  — 27-33 days remaining
 *   1_WEEK   —  5-9  days remaining
 *   EXPIRED  — expired within the last 2 days (catches missed runs)
 *
 * Deduplication: won't re-send a notification type for a document
 * unless the document was updated (renewed) after the last send.
 */
import { query, execute } from '../../utils/db.js'
import { sendExpiryEmail } from '../../utils/email.js'

const WINDOWS = [
  { type: '2_MONTHS', minDays: 57, maxDays: 63 },
  { type: '1_MONTH',  minDays: 27, maxDays: 33 },
  { type: '1_WEEK',   minDays: 5,  maxDays: 9  },
]

async function fetchExpiringDocuments(minDays, maxDays, notifType) {
  return query(
    `SELECT
       vd.id            AS document_id,
       vd.document_name,
       vd.expiry_date,
       vd.updated_at,
       v.id             AS vehicle_id,
       v.plate_number,
       v.brand,
       v.model,
       v.owner_name,
       v.owner_email,
       v.owner_phone,
       TRUNC(vd.expiry_date - SYSDATE) AS days_remaining
     FROM vehicle_documents vd
     JOIN vehicles v ON v.id = vd.vehicle_id
     WHERE vd.deleted = 'N'
       AND vd.expiry_date IS NOT NULL
       AND v.owner_email IS NOT NULL
       AND TRIM(v.owner_email) IS NOT NULL
       AND TRUNC(vd.expiry_date - SYSDATE) BETWEEN :min_days AND :max_days
       AND NOT EXISTS (
         SELECT 1 FROM email_notifications en
         WHERE en.document_id      = vd.id
           AND en.notification_type = :notif_type
           AND en.status            = 'SENT'
           AND en.sent_at          >= vd.updated_at
       )`,
    { min_days: minDays, max_days: maxDays, notif_type: notifType }
  )
}

async function fetchExpiredDocuments() {
  return query(
    `SELECT
       vd.id            AS document_id,
       vd.document_name,
       vd.expiry_date,
       vd.updated_at,
       v.id             AS vehicle_id,
       v.plate_number,
       v.brand,
       v.model,
       v.owner_name,
       v.owner_email,
       v.owner_phone,
       TRUNC(SYSDATE - vd.expiry_date) AS days_remaining
     FROM vehicle_documents vd
     JOIN vehicles v ON v.id = vd.vehicle_id
     WHERE vd.deleted = 'N'
       AND vd.expiry_date IS NOT NULL
       AND v.owner_email IS NOT NULL
       AND TRIM(v.owner_email) IS NOT NULL
       AND TRUNC(SYSDATE - vd.expiry_date) BETWEEN 0 AND 1
       AND NOT EXISTS (
         SELECT 1 FROM email_notifications en
         WHERE en.document_id      = vd.id
           AND en.notification_type = 'EXPIRED'
           AND en.status            = 'SENT'
           AND en.sent_at          >= vd.updated_at
       )`,
    {}
  )
}

async function recordNotification({ vehicleId, documentId, notifType, sentTo, status, errorMessage }) {
  await execute(
    `INSERT INTO email_notifications (vehicle_id, document_id, notification_type, sent_to, status, error_message)
     VALUES (:vehicle_id, :document_id, :notif_type, :sent_to, :status, :error_message)`,
    {
      vehicle_id:    vehicleId,
      document_id:   documentId,
      notif_type:    notifType,
      sent_to:       sentTo,
      status,
      error_message: errorMessage || null,
    }
  )
}

async function processWindow(docs, notifType, isExpired = false) {
  let sent = 0
  let failed = 0

  for (const doc of docs) {
    const daysRemaining = isExpired
      ? -Math.abs(doc.DAYS_REMAINING)
      : Math.abs(doc.DAYS_REMAINING)

    try {
      await sendExpiryEmail({
        to:               doc.OWNER_EMAIL,
        ownerName:        doc.OWNER_NAME,
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
      await recordNotification({
        vehicleId:  doc.VEHICLE_ID,
        documentId: doc.DOCUMENT_ID,
        notifType,
        sentTo:     doc.OWNER_EMAIL,
        status:     'SENT',
      })
      sent++
    } catch (err) {
      await recordNotification({
        vehicleId:    doc.VEHICLE_ID,
        documentId:   doc.DOCUMENT_ID,
        notifType,
        sentTo:       doc.OWNER_EMAIL,
        status:       'FAILED',
        errorMessage: err.message?.substring(0, 999),
      }).catch(() => {})
      failed++
      console.error(`[expiry-check] Failed to send ${notifType} to ${doc.OWNER_EMAIL}:`, err.message)
    }
  }

  return { sent, failed }
}

export default defineTask({
  meta: {
    name: 'document:expiry-check',
    description: 'Send expiry warning emails for vehicle documents',
  },
  async run() {
    const results = {}

    for (const window of WINDOWS) {
      const docs = await fetchExpiringDocuments(window.minDays, window.maxDays, window.type)
      results[window.type] = await processWindow(docs, window.type)
    }

    const expiredDocs = await fetchExpiredDocuments()
    results['EXPIRED'] = await processWindow(expiredDocs, 'EXPIRED', true)

    const summary = Object.entries(results)
      .map(([type, r]) => `${type}: ${r.sent} sent, ${r.failed} failed`)
      .join(' | ')

    console.log(`[expiry-check] Done — ${summary}`)

    return { ok: true, results }
  },
})

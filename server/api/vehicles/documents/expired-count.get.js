/**
 * GET /api/vehicles/documents/expired-count
 * Returns the total count of currently expired vehicle documents.
 */
import { query } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  if (!event.context.staff) {
    throw createError({ statusCode: 401, data: { success: false, message: 'Unauthorized' } })
  }

  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM vehicle_documents vd
     WHERE vd.deleted = 'N'
       AND vd.expiry_date IS NOT NULL
       AND vd.expiry_date < SYSDATE`,
    {}
  )

  return {
    success: true,
    count: rows[0]?.TOTAL || 0,
  }
})

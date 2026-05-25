/**
 * GET /api/branches
 * Returns branches. Defaults to active only.
 * Pass ?all=1 to return all statuses (used by management page).
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const all = getQuery(event).all === '1'

  const sql = all
    ? `SELECT id, name, code, type, status FROM branches ORDER BY code`
    : `SELECT id, name, code, type, status FROM branches WHERE status = 'A' ORDER BY code`

  const branches = await query(sql)

  return {
    success: true,
    code: 200,
    message: 'Branches retrieved successfully',
    data: branches,
    timestamp: new Date().toISOString(),
  }
})

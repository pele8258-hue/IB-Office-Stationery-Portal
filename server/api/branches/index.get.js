/**
 * GET /api/branches
 * Returns all active branches (used for dropdowns)
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const branches = await query(
    `SELECT id, name, code, type FROM branches WHERE status = 'A' ORDER BY code`
  )

  return {
    success: true,
    code: 200,
    message: 'Branches retrieved successfully',
    data: branches,
    timestamp: new Date().toISOString(),
  }
})

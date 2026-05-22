/**
 * GET /api/roles
 * Returns all active roles (used for dropdowns)
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async () => {
  const roles = await query(
    `SELECT id, name, code, description FROM roles WHERE status = 'A' ORDER BY name`
  )

  return {
    success: true,
    code: 200,
    message: 'Roles retrieved successfully',
    data: roles,
    timestamp: new Date().toISOString(),
  }
})

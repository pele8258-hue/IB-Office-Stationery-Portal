/**
 * GET /api/resources
 * Returns all resources (modules/pages) for permission management
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async () => {
  const resources = await query(
    `SELECT id, code, name, module, description, status
     FROM resources
     ORDER BY module, name`
  )

  return {
    success: true,
    code: 200,
    message: 'Resources retrieved successfully',
    data: resources,
    timestamp: new Date().toISOString(),
  }
})

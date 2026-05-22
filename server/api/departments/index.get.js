/**
 * GET /api/departments
 * Returns all active departments (used for dropdowns)
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const departments = await query(
    `SELECT id, name, code FROM departments WHERE status = 'A' ORDER BY name`
  )

  return {
    success: true,
    code: 200,
    message: 'Departments retrieved successfully',
    data: departments,
    timestamp: new Date().toISOString(),
  }
})

/**
 * GET /api/departments
 * Returns departments. Defaults to active only.
 * Pass ?all=1 to return all statuses (used by management page).
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const all = getQuery(event).all === '1'

  const sql = all
    ? `SELECT id, name, code, status FROM departments ORDER BY name`
    : `SELECT id, name, code, status FROM departments WHERE status = 'A' ORDER BY name`

  const departments = await query(sql)

  return {
    success: true,
    code: 200,
    message: 'Departments retrieved successfully',
    data: departments,
    timestamp: new Date().toISOString(),
  }
})

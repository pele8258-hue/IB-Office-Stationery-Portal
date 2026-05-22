/**
 * GET /api/staff/:id
 * Returns a single staff member with role, department, branch info
 */
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const rows = await query(
    `SELECT s.id, s.name, s.email, s.phone, s.position,
            s.status, s.created_at, s.updated_at,
            s.branch_id, s.department_id, s.role_id,
            r.name AS role_name, r.code AS role_code,
            d.name AS department_name,
            b.name AS branch_name, b.code AS branch_code,
            c.name AS created_by_name
     FROM staff s
     JOIN roles       r ON r.id = s.role_id
     JOIN departments d ON d.id = s.department_id
     JOIN branches    b ON b.id = s.branch_id
     LEFT JOIN staff  c ON c.id = s.created_by
     WHERE s.id = :id`,
    { id: Number(id) }
  )

  if (!rows.length) {
    throw createError({
      statusCode: 404,
      data: { success: false, message: 'Staff not found' },
    })
  }

  return {
    success: true,
    code: 200,
    message: 'Staff retrieved successfully',
    data: rows[0],
    timestamp: new Date().toISOString(),
  }
})

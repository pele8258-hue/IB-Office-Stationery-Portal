/**
 * GET /api/roles/:id/permissions
 * Returns all active resources with the role's current permission flags
 */
import { query } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  const roleId = Number(getRouterParam(event, 'id'))

  const permissions = await query(
    `SELECT r.id AS resource_id,
            r.code,
            r.name,
            r.module,
            r.description,
            NVL(rr.can_view,   0) AS can_view,
            NVL(rr.can_create, 0) AS can_create,
            NVL(rr.can_edit,   0) AS can_edit,
            NVL(rr.can_delete, 0) AS can_delete
     FROM resources r
     LEFT JOIN role_resources rr
            ON rr.resource_id = r.id AND rr.role_id = :role_id
     WHERE r.status = 'A'
     ORDER BY r.module, r.name`,
    { role_id: roleId }
  )

  return {
    success: true,
    code: 200,
    message: 'Permissions retrieved successfully',
    data: permissions,
    timestamp: new Date().toISOString(),
  }
})

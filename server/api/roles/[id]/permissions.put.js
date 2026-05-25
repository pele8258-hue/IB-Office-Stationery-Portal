/**
 * PUT /api/roles/:id/permissions
 * Body: { permissions: [{ resource_id, can_view, can_create, can_edit, can_delete }] }
 * Replaces all permissions for the role in a single transaction
 */
import { transaction } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  const roleId = Number(getRouterParam(event, 'id'))
  const body   = (await readBody(event)) ?? {}
  const perms  = body.permissions

  if (!Array.isArray(perms)) {
    throw createError({
      statusCode: 422,
      data: { success: false, message: 'permissions array is required' },
    })
  }

  await transaction(async (conn) => {
    await conn.execute(
      `DELETE FROM role_resources WHERE role_id = :role_id`,
      { role_id: roleId },
      { autoCommit: false }
    )

    for (const p of perms) {
      if (!p.can_view && !p.can_create && !p.can_edit && !p.can_delete) continue

      await conn.execute(
        `INSERT INTO role_resources (role_id, resource_id, can_view, can_create, can_edit, can_delete)
         VALUES (:role_id, :resource_id, :can_view, :can_create, :can_edit, :can_delete)`,
        {
          role_id:     roleId,
          resource_id: p.resource_id,
          can_view:    p.can_view    ? 1 : 0,
          can_create:  p.can_create  ? 1 : 0,
          can_edit:    p.can_edit    ? 1 : 0,
          can_delete:  p.can_delete  ? 1 : 0,
        },
        { autoCommit: false }
      )
    }
  })

  return {
    success: true,
    code: 200,
    message: 'Permissions saved successfully',
    timestamp: new Date().toISOString(),
  }
})

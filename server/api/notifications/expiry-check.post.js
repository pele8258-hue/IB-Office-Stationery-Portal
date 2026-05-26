/**
 * POST /api/notifications/expiry-check
 * Manually trigger the document expiry notification task.
 * Restricted to SUPER_ADMIN role.
 *
 * Returns a summary of emails sent per notification type.
 */
export default defineEventHandler(async (event) => {
  const role = event.context.staff?.role
  if (role !== 'SUPER_ADMIN') {
    throw createError({
      statusCode: role ? 403 : 401,
      data: { success: false, code: role ? 403 : 401, message: role ? 'Permission denied' : 'Unauthorized' },
    })
  }

  try {
    const result = await runTask('document:expiry-check')

    return {
      success: true,
      code: 200,
      message: 'Expiry notification check completed',
      data: result.result?.results ?? result,
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    throw createError({
      statusCode: 500,
      data: { success: false, code: 500, message: err.message || 'Task execution failed' },
    })
  }
})

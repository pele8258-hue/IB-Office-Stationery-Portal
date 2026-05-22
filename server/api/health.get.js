import { query } from '../utils/db.js'

export default defineEventHandler(async () => {
  try {
    await query('SELECT 1 FROM DUAL')
    return {
      success: true,
      code: 200,
      message: 'Database connection is healthy',
      data: { database: 'Oracle', status: 'connected' },
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: 'Database connection failed: ' + err.message,
    })
  }
})

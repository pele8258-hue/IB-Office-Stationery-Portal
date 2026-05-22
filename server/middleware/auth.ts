import { verifyToken, getTokenFromEvent } from '../utils/auth'

const PUBLIC_ROUTES = ['/api/auth/login', '/api/health']

export default defineEventHandler((event) => {
  const url = getRequestURL(event).pathname
  if (PUBLIC_ROUTES.includes(url)) return

  if (!url.startsWith('/api/')) return

  const token = getTokenFromEvent(event)
  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized access' })
  }

  try {
    const payload = verifyToken(token)
    event.context.staff = payload
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }
})

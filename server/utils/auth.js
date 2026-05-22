import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'change_this_secret'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' })
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

export function getTokenFromEvent(event) {
  const auth = getHeader(event, 'authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

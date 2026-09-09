import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { SESSION_SECRET, COOKIE_NAME, SESSION_TTL_DAYS, IS_PROD } from './config.mjs'
import { findUser } from './db.mjs'

function setSessionCookie(res, payload) {
  const token = jwt.sign(payload, SESSION_SECRET, { expiresIn: `${SESSION_TTL_DAYS}d` })
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: SESSION_TTL_DAYS * 24 * 3600 * 1000,
    path: '/',
  })
}

export function currentUser(req) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null
  try {
    const payload = jwt.verify(token, SESSION_SECRET)
    return { username: payload.username }
  } catch {
    return null
  }
}

/** Gate for mutations: must be logged in. */
export function requireAuth(req, res, next) {
  const user = currentUser(req)
  if (!user) return res.status(401).json({ error: 'Not authenticated' })
  req.user = user
  next()
}

/**
 * CSRF defence for cookie auth: every mutating request must carry the custom
 * header `X-Requested-With: fetch`. A cross-site attacker's page cannot set a
 * custom header on a simple request, and a fetch that adds one triggers a CORS
 * preflight this server never approves — so forged requests are blocked. This is
 * also proxy-agnostic (works behind the Vite dev proxy, unlike Host comparison)
 * and pairs with the SameSite=Lax session cookie.
 */
export function csrfGuard(req, res, next) {
  if (req.get('x-requested-with') !== 'fetch') {
    return res.status(403).json({ error: 'Missing or invalid X-Requested-With header' })
  }
  next()
}

export const authRouter = express.Router()

authRouter.post('/login', csrfGuard, (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }
  const user = findUser(String(username))
  // Always run a compare to keep timing roughly constant.
  const hash = user?.password_hash || '$2a$12$0000000000000000000000000000000000000000000000000000'
  const ok = bcrypt.compareSync(String(password), hash)
  if (!user || !ok) {
    return res.status(401).json({ error: 'Wrong username or password' })
  }
  setSessionCookie(res, { username: user.username })
  res.json({ user: { username: user.username } })
})

authRouter.post('/logout', csrfGuard, (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

authRouter.get('/me', (req, res) => {
  const user = currentUser(req)
  if (!user) return res.status(401).json({ error: 'Not authenticated' })
  res.json({ user })
})

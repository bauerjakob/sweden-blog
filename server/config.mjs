import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data')
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
export const DB_PATH = path.join(DATA_DIR, 'sweden-blog.db')

export const DIST_DIR = path.join(ROOT, 'dist')
export const SEED_PHOTOS_DIR = path.join(ROOT, 'public', 'photos')
export const ENTRIES_SEED_DIR = path.join(ROOT, 'content', 'entries')
export const ABOUT_SEED_PATH = path.join(ROOT, 'content', 'about.md')
export const MANIFEST_PATH = path.join(ROOT, 'src', 'content', 'photos.manifest.json')

// Dev default avoids the common :3000 clash (e.g. OrbStack). Production sets
// PORT explicitly (Docker uses 3000).
export const PORT = Number(process.env.PORT || 5178)
export const IS_PROD = process.env.NODE_ENV === 'production'

// Signing secret for the session cookie. Required in production; in dev we fall
// back to a random per-boot secret (which simply invalidates sessions on restart).
export const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (IS_PROD
    ? (() => {
        throw new Error('SESSION_SECRET must be set in production')
      })()
    : crypto.randomBytes(32).toString('hex'))

export const COOKIE_NAME = 'sweden_session'
export const SESSION_TTL_DAYS = 7

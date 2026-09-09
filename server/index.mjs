import express from 'express'
import cookieParser from 'cookie-parser'
import { existsSync } from 'node:fs'
import path from 'node:path'
import {
  PORT,
  DIST_DIR,
  SEED_PHOTOS_DIR,
  UPLOADS_DIR,
  IS_PROD,
} from './config.mjs'
import { authRouter } from './auth.mjs'
import { entriesRouter } from './entries.mjs'
import { photosRouter } from './photos.mjs'
import { htmlForRequest, sitemapXml, baseUrl } from './render.mjs'

const app = express()
app.set('trust proxy', true)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// ---- API -----------------------------------------------------------------
app.use('/api/auth', authRouter)
app.use('/api/entries', entriesRouter)
app.use('/api/photos', photosRouter)
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// ---- Media ----------------------------------------------------------------
// Seed photos (committed) and uploaded photos (writable volume). Stable names,
// so cache them for a good while.
const mediaCache = { maxAge: '30d', immutable: false }
app.use('/photos', express.static(SEED_PHOTOS_DIR, mediaCache))
app.use('/uploads', express.static(UPLOADS_DIR, mediaCache))

// ---- Static build ---------------------------------------------------------
if (existsSync(DIST_DIR)) {
  // Hashed assets — cache forever.
  app.use(
    '/assets',
    express.static(path.join(DIST_DIR, 'assets'), { maxAge: '1y', immutable: true }),
  )
  // Other static files (favicon, fonts already under /assets) but NOT index.html
  // (we template that per-request for OG tags).
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }))
}

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').send(sitemapXml(req))
})
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl(req)}/sitemap.xml\n`)
})

// ---- SPA + SSR Open Graph -------------------------------------------------
app.get(/^\/(?!api\/).*/, (req, res, next) => {
  if (req.method !== 'GET') return next()
  const html = htmlForRequest(req)
  if (html == null) {
    return res
      .status(200)
      .send('Frontend not built yet. Run `npm run build`, or use the Vite dev server.')
  }
  res.set('Cache-Control', 'no-cache').type('html').send(html)
})

// ---- Errors ---------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({ error: err.message || 'Server error' })
})

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}  (${IS_PROD ? 'production' : 'development'})`)
})

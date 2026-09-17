import express from 'express'
import { requireAuth, csrfGuard } from './auth.mjs'
import { getAbout, setAbout } from './db.mjs'
import { normaliseAboutInput, toApiAbout } from './content.mjs'

export const aboutRouter = express.Router()

// The About page as the site shows it. Null before the first seed, which the
// page renders as an empty state rather than an error.
aboutRouter.get('/', (_req, res) => {
  res.json({ about: toApiAbout(getAbout()) })
})

// Raw Markdown source, for the editor. Auth only — same shape as an entry's
// /source, so the editor loads what it will send back.
aboutRouter.get('/source', requireAuth, (_req, res) => {
  const doc = getAbout()
  res.json({ about: { title: doc?.title ?? '', bodyMd: doc?.bodyMd ?? '' } })
})

// Replace it. There is only one About page, so this is a PUT with no id.
aboutRouter.put('/', csrfGuard, requireAuth, (req, res, next) => {
  try {
    const doc = setAbout(normaliseAboutInput(req.body || {}))
    res.json({ about: toApiAbout(doc) })
  } catch (e) {
    next(e)
  }
})

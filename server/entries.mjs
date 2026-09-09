import express from 'express'
import { currentUser, requireAuth, csrfGuard } from './auth.mjs'
import {
  listEntries,
  getEntryBySlug,
  insertEntry,
  updateEntry,
  deleteEntry,
  uniqueSlug,
} from './db.mjs'
import { normaliseEntryInput, toApiEntry, makeSlug, slugify } from './content.mjs'

export const entriesRouter = express.Router()

function toRow(n, slug) {
  return {
    slug,
    date: n.dateISO,
    title: n.title,
    location: n.location,
    tags: JSON.stringify(n.tags),
    unlisted: n.unlisted ? 1 : 0,
    body_md: n.bodyMd,
    body_html: n.bodyHtml,
    has_body: n.hasBody ? 1 : 0,
    excerpt: n.excerpt,
    photos: JSON.stringify(n.photos),
  }
}

// List. Public sees listed entries only; an authenticated editor can request all.
entriesRouter.get('/', (req, res) => {
  const user = currentUser(req)
  const includeUnlisted = !!user && req.query.all === '1'
  const rows = listEntries({ includeUnlisted })
  res.json({ entries: rows.map(toApiEntry) })
})

// Raw Markdown source of an entry, for the editor. Auth only.
entriesRouter.get('/:slug/source', requireAuth, (req, res) => {
  const row = getEntryBySlug(req.params.slug)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json({ bodyMd: row.body_md })
})

// Single entry — reachable by direct slug even when unlisted.
entriesRouter.get('/:slug', (req, res) => {
  const row = getEntryBySlug(req.params.slug)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json({ entry: toApiEntry(row) })
})

// Create.
entriesRouter.post('/', csrfGuard, requireAuth, (req, res, next) => {
  try {
    const n = normaliseEntryInput(req.body || {})
    const base = req.body.slug ? slugify(req.body.slug) : makeSlug(n.dateISO, n.title)
    const slug = uniqueSlug(base)
    const row = insertEntry(toRow(n, slug))
    res.status(201).json({ entry: toApiEntry(row) })
  } catch (e) {
    next(e)
  }
})

// Update. Slug stays stable (permalinks are shareable) unless explicitly changed.
entriesRouter.put('/:slug', csrfGuard, requireAuth, (req, res, next) => {
  try {
    const existing = getEntryBySlug(req.params.slug)
    if (!existing) return res.status(404).json({ error: 'Not found' })
    const n = normaliseEntryInput(req.body || {})
    let slug = existing.slug
    if (req.body.slug && slugify(req.body.slug) !== existing.slug) {
      slug = uniqueSlug(slugify(req.body.slug), existing.id)
    }
    const row = updateEntry(existing.id, toRow(n, slug))
    res.json({ entry: toApiEntry(row) })
  } catch (e) {
    next(e)
  }
})

// Delete.
entriesRouter.delete('/:slug', csrfGuard, requireAuth, (req, res) => {
  const existing = getEntryBySlug(req.params.slug)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  deleteEntry(req.params.slug)
  res.json({ ok: true })
})

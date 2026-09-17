import Database from 'better-sqlite3'
import { mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import bcrypt from 'bcryptjs'
import {
  DATA_DIR,
  UPLOADS_DIR,
  DB_PATH,
  ENTRIES_SEED_DIR,
  ABOUT_SEED_PATH,
  MANIFEST_PATH,
} from './config.mjs'
import { renderMarkdown, makeSlug, excerptFromHtml } from './content.mjs'

mkdirSync(DATA_DIR, { recursive: true })
mkdirSync(UPLOADS_DIR, { recursive: true })

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    title TEXT,
    location TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    unlisted INTEGER NOT NULL DEFAULT 0,
    has_page INTEGER NOT NULL DEFAULT 1,
    body_md TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    has_body INTEGER NOT NULL DEFAULT 0,
    excerpt TEXT NOT NULL DEFAULT '',
    photos TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date DESC);

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`)

/*
  Migration. `CREATE TABLE IF NOT EXISTS` above does nothing to a table that
  already exists, so a column added after the first release needs its own route
  in. Defaulting to 1 is what makes this safe: every entry written before the
  option existed keeps the page it already had.
*/
const entryColumns = db.prepare('PRAGMA table_info(entries)').all().map((c) => c.name)
if (!entryColumns.includes('has_page')) {
  db.exec('ALTER TABLE entries ADD COLUMN has_page INTEGER NOT NULL DEFAULT 1')
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

function slugsInUse(set, base) {
  let slug = base
  if (set.has(slug)) {
    let n = 2
    while (set.has(`${slug}-${n}`)) n++
    slug = `${slug}-${n}`
  }
  set.add(slug)
  return slug
}

/** One-time seed of entries from the committed Markdown files. */
function seedEntries() {
  const already = db.prepare('SELECT COUNT(*) AS n FROM entries').get().n
  const seeded = db.prepare("SELECT value FROM meta WHERE key = 'entries_seeded'").get()
  if (already > 0 || seeded) return

  if (!existsSync(ENTRIES_SEED_DIR)) return
  const manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
    : {}

  const files = readdirSync(ENTRIES_SEED_DIR).filter((f) => f.endsWith('.md'))
  const parsed = []

  for (const file of files) {
    const raw = readFileSync(path.join(ENTRIES_SEED_DIR, file), 'utf8')
    const m = raw.match(FRONTMATTER_RE)
    if (!m) continue
    const fm = yaml.load(m[1]) ?? {}
    const dateISO =
      fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : String(fm.date).slice(0, 10)
    const { html, isEmpty } = renderMarkdown(m[2])

    const photos = (Array.isArray(fm.photos) ? fm.photos : [])
      .map((p) => {
        const name = String(p.src || '').replace(/^\.?\/?(photos\/)?/, '').replace(/\.[a-z]+$/i, '')
        const item = manifest[name]
        if (!item) return null
        return {
          name,
          alt: p.alt || '',
          caption: p.caption || undefined,
          w: item.w,
          h: item.h,
          widths: [...item.widths].sort((a, b) => a - b),
          dir: 'photos',
        }
      })
      .filter(Boolean)

    parsed.push({
      dateISO,
      title: fm.title ? String(fm.title).trim() : null,
      location: fm.location ? String(fm.location).trim() : null,
      tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
      unlisted: fm.unlisted === true,
      bodyMd: m[2].trim(),
      bodyHtml: html,
      hasBody: !isEmpty,
      excerpt: isEmpty ? photos[0]?.caption || photos[0]?.alt || '' : excerptFromHtml(html),
      photos,
      rawSlug: fm.slug ? String(fm.slug).trim() : null,
    })
  }

  parsed.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
  const used = new Set()
  const insert = db.prepare(`
    INSERT INTO entries (slug, date, title, location, tags, unlisted, body_md, body_html, has_body, excerpt, photos)
    VALUES (@slug, @date, @title, @location, @tags, @unlisted, @body_md, @body_html, @has_body, @excerpt, @photos)
  `)
  const tx = db.transaction((rows) => {
    for (const p of rows) {
      const slug = slugsInUse(used, p.rawSlug || makeSlug(p.dateISO, p.title))
      insert.run({
        slug,
        date: p.dateISO,
        title: p.title,
        location: p.location,
        tags: JSON.stringify(p.tags),
        unlisted: p.unlisted ? 1 : 0,
        body_md: p.bodyMd,
        body_html: p.bodyHtml,
        has_body: p.hasBody ? 1 : 0,
        excerpt: p.excerpt,
        photos: JSON.stringify(p.photos),
      })
    }
  })
  tx(parsed)
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('entries_seeded', datetime('now'))").run()
  console.log(`[db] seeded ${parsed.length} entries from Markdown`)
}

/**
 * One-time seed of the About page from the committed Markdown file. Once it is
 * in the database the site owns it: edits happen in the editor, and this file
 * is never read again (which is why an edit here won't show up on a database
 * that has already been seeded).
 */
function seedAbout() {
  if (getAbout()) return
  if (!existsSync(ABOUT_SEED_PATH)) {
    console.warn('[db] no content/about.md to seed the About page from')
    return
  }
  const raw = readFileSync(ABOUT_SEED_PATH, 'utf8')
  const m = raw.match(FRONTMATTER_RE)
  const fm = m ? (yaml.load(m[1]) ?? {}) : {}
  const body = m ? m[2] : raw
  const { html, isEmpty } = renderMarkdown(body)
  if (isEmpty) return

  setAbout({
    title: String(fm.title || 'About').trim(),
    bodyMd: body.trim(),
    bodyHtml: html,
    excerpt: excerptFromHtml(html),
    updatedAt: new Date().toISOString(),
  })
  console.log('[db] seeded the About page from Markdown')
}

/** Seed an admin user from env on first boot, if none exists yet. */
function seedAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n
  if (count > 0) return
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  if (!username || !password) {
    console.warn(
      '[db] no admin user yet. Set ADMIN_USERNAME and ADMIN_PASSWORD, or run `npm run seed:admin`.',
    )
    return
  }
  const hash = bcrypt.hashSync(password, 12)
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash)
  console.log(`[db] created admin user "${username}"`)
}

seedEntries()
seedAbout()
seedAdmin()

// ---- Query helpers -------------------------------------------------------

export function listEntries({ includeUnlisted = false } = {}) {
  const rows = db
    .prepare(
      `SELECT * FROM entries ${includeUnlisted ? '' : 'WHERE unlisted = 0'} ORDER BY date DESC, id DESC`,
    )
    .all()
  return rows
}

export function getEntryBySlug(slug) {
  return db.prepare('SELECT * FROM entries WHERE slug = ?').get(slug)
}

export function slugExists(slug, exceptId = null) {
  const row = exceptId
    ? db.prepare('SELECT id FROM entries WHERE slug = ? AND id != ?').get(slug, exceptId)
    : db.prepare('SELECT id FROM entries WHERE slug = ?').get(slug)
  return !!row
}

export function uniqueSlug(base, exceptId = null) {
  let slug = base
  let n = 2
  while (slugExists(slug, exceptId)) {
    slug = `${base}-${n}`
    n++
  }
  return slug
}

export function insertEntry(e) {
  const info = db
    .prepare(
      `INSERT INTO entries (slug, date, title, location, tags, unlisted, has_page, body_md, body_html, has_body, excerpt, photos)
       VALUES (@slug, @date, @title, @location, @tags, @unlisted, @has_page, @body_md, @body_html, @has_body, @excerpt, @photos)`,
    )
    .run(e)
  return db.prepare('SELECT * FROM entries WHERE id = ?').get(info.lastInsertRowid)
}

export function updateEntry(id, e) {
  db.prepare(
    `UPDATE entries SET slug=@slug, date=@date, title=@title, location=@location, tags=@tags,
       unlisted=@unlisted, has_page=@has_page, body_md=@body_md, body_html=@body_html,
       has_body=@has_body, excerpt=@excerpt, photos=@photos, updated_at=datetime('now')
     WHERE id=@id`,
  ).run({ ...e, id })
  return db.prepare('SELECT * FROM entries WHERE id = ?').get(id)
}

export function deleteEntry(slug) {
  return db.prepare('DELETE FROM entries WHERE slug = ?').run(slug)
}

/**
 * The About page, stored as one JSON document under a single `meta` key —
 * there is only ever one of it, and a blob means no migration when it grows a
 * field. Returns null before the first seed.
 */
export function getAbout() {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'about'").get()
  if (!row?.value) return null
  try {
    return JSON.parse(row.value)
  } catch {
    return null
  }
}

export function setAbout(doc) {
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('about', ?)").run(
    JSON.stringify(doc),
  )
  return getAbout()
}

export function findUser(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username)
}

import MarkdownIt from 'markdown-it'

// Same Markdown settings as the (former) build-time plugin: safe HTML off,
// typographic quotes/dashes on.
const md = new MarkdownIt({ html: false, linkify: true, typographer: true, breaks: false })

export function renderMarkdown(bodyMd) {
  const body = (bodyMd || '').trim()
  return { html: body ? md.render(body) : '', isEmpty: body.length === 0 }
}

export function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/å|ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é|è|ê/g, 'e')
    .replace(/ü/g, 'u')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function makeSlug(dateISO, title) {
  return `${dateISO}-${title ? slugify(title) : 'note'}`
}

export function excerptFromHtml(html) {
  const firstPara = html.match(/<p>([\s\S]*?)<\/p>/)
  const text = (firstPara ? firstPara[1] : html)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 180 ? text.slice(0, 177).trimEnd() + '…' : text
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Normalise + validate the editable fields of an entry. Throws on bad input. */
export function normaliseEntryInput(input) {
  const dateISO =
    input.date instanceof Date
      ? input.date.toISOString().slice(0, 10)
      : String(input.date || '').trim().slice(0, 10)
  if (!ISO_DATE.test(dateISO)) {
    const err = new Error('`date` is required and must be YYYY-MM-DD')
    err.status = 400
    throw err
  }

  const photos = Array.isArray(input.photos) ? input.photos : []
  const cleanPhotos = photos.map((p, i) => {
    if (!p || !p.name) {
      const err = new Error(`photo #${i + 1} is missing a name`)
      err.status = 400
      throw err
    }
    if (!p.alt || !String(p.alt).trim()) {
      const err = new Error(`photo "${p.name}" needs alt text`)
      err.status = 400
      throw err
    }
    const widths = Array.isArray(p.widths) ? p.widths.map(Number).filter(Boolean).sort((a, b) => a - b) : []
    if (!widths.length) {
      const err = new Error(`photo "${p.name}" has no rendered widths`)
      err.status = 400
      throw err
    }
    return {
      name: String(p.name),
      alt: String(p.alt).trim(),
      caption: p.caption ? String(p.caption).trim() : undefined,
      w: Number(p.w) || widths[widths.length - 1],
      h: Number(p.h) || widths[widths.length - 1],
      widths,
      dir: p.dir === 'photos' ? 'photos' : 'uploads',
    }
  })

  const bodyMd = typeof input.bodyMd === 'string' ? input.bodyMd : ''
  const { html, isEmpty } = renderMarkdown(bodyMd)

  if (isEmpty && cleanPhotos.length === 0) {
    const err = new Error('An entry needs either body text or at least one photo.')
    err.status = 400
    throw err
  }

  const tags = Array.isArray(input.tags)
    ? input.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
    : typeof input.tags === 'string'
      ? input.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      : []

  return {
    dateISO,
    title: input.title ? String(input.title).trim() : null,
    location: input.location ? String(input.location).trim() : null,
    tags,
    unlisted: input.unlisted === true || input.unlisted === 1 || input.unlisted === 'true',
    // Opt *out*, not in: an entry gets a page unless the editor says otherwise,
    // so a client that doesn't know about the option can't silently take pages
    // away from entries that have them.
    hasPage: !(input.hasPage === false || input.hasPage === 0 || input.hasPage === 'false'),
    bodyMd,
    bodyHtml: html,
    excerpt: isEmpty ? cleanPhotos[0]?.caption || cleanPhotos[0]?.alt || '' : excerptFromHtml(html),
    hasBody: !isEmpty,
    photos: cleanPhotos,
  }
}

/**
 * Normalise + validate the About page. Two fields only: a heading (plain text,
 * where a line break is a line break) and a Markdown body.
 */
export function normaliseAboutInput(input) {
  const title = String(input.title ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
  if (!title) {
    const err = new Error('The About page needs a heading.')
    err.status = 400
    throw err
  }

  const bodyMd = typeof input.bodyMd === 'string' ? input.bodyMd : ''
  const { html, isEmpty } = renderMarkdown(bodyMd)
  if (isEmpty) {
    const err = new Error('The About page needs some text.')
    err.status = 400
    throw err
  }

  return {
    title,
    bodyMd: bodyMd.trim(),
    bodyHtml: html,
    excerpt: excerptFromHtml(html),
    updatedAt: new Date().toISOString(),
  }
}

/** The public shape: rendered HTML, never the Markdown source. */
export function toApiAbout(doc) {
  if (!doc) return null
  return {
    title: doc.title,
    bodyHtml: doc.bodyHtml,
    excerpt: doc.excerpt,
    updatedAt: doc.updatedAt,
  }
}

/** The public JSON shape the frontend consumes. */
export function toApiEntry(row) {
  return {
    slug: row.slug,
    dateISO: row.date,
    title: row.title || undefined,
    location: row.location || undefined,
    tags: JSON.parse(row.tags || '[]'),
    unlisted: !!row.unlisted,
    hasPage: !!row.has_page,
    bodyHtml: row.body_html,
    excerpt: row.excerpt,
    hasBody: !!row.has_body,
    photos: JSON.parse(row.photos || '[]'),
  }
}

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { DIST_DIR } from './config.mjs'
import { listEntries, getEntryBySlug } from './db.mjs'
import { toApiEntry } from './content.mjs'

const SITE_NAME = 'Ett halvår i Sverige'
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html')

let cachedTemplate = null
function template() {
  if (cachedTemplate && process.env.NODE_ENV === 'production') return cachedTemplate
  cachedTemplate = existsSync(TEMPLATE_PATH) ? readFileSync(TEMPLATE_PATH, 'utf8') : null
  return cachedTemplate
}

export function baseUrl(req) {
  return (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function photoOgImage(entry, base) {
  const p = entry.photos?.[0]
  if (!p) return null
  const largest = [...p.widths].sort((a, b) => a - b).pop()
  return {
    url: `${base}/${p.dir}/${p.name}-${largest}.webp`,
    w: largest,
    h: Math.round((largest * p.h) / p.w),
    alt: p.alt || '',
  }
}

function injectHead(html, meta) {
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta[^>]+name="description"[^>]*>/gi, '')
    .replace(/<meta[^>]+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta[^>]+name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<link[^>]+rel="canonical"[^>]*>/gi, '')

  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  ]
  if (meta.image) {
    tags.push(
      `<meta property="og:image" content="${escapeHtml(meta.image.url)}" />`,
      `<meta property="og:image:width" content="${meta.image.w}" />`,
      `<meta property="og:image:height" content="${meta.image.h}" />`,
      `<meta property="og:image:alt" content="${escapeHtml(meta.image.alt)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(meta.image.url)}" />`,
    )
  }
  return out.replace(/<\/head>/i, `  ${tags.join('\n  ')}\n</head>`)
}

/** Build the HTML for a page request, with per-entry OG tags where relevant. */
export function htmlForRequest(req) {
  const tpl = template()
  if (!tpl) return null
  const base = baseUrl(req)
  const p = decodeURIComponent(req.path)

  const entryMatch = p.match(/^\/entry\/([^/]+)\/?$/)
  if (entryMatch) {
    const row = getEntryBySlug(entryMatch[1])
    if (row) {
      const e = toApiEntry(row)
      const label = e.title ?? e.dateISO
      return injectHead(tpl, {
        title: `${label} — ${SITE_NAME}`,
        description: e.excerpt || `A note from ${e.location ?? 'Sweden'}.`,
        url: `${base}/entry/${e.slug}`,
        type: 'article',
        image: photoOgImage(e, base),
      })
    }
  }

  const tagMatch = p.match(/^\/tags\/([^/]+)\/?$/)
  if (tagMatch) {
    const tag = tagMatch[1]
    return injectHead(tpl, {
      title: `#${tag} — ${SITE_NAME}`,
      description: `Entries tagged “${tag}” from a semester in Göteborg.`,
      url: `${base}/tags/${tag}`,
      type: 'website',
      image: null,
    })
  }

  if (p === '/about') {
    return injectHead(tpl, {
      title: `About — ${SITE_NAME}`,
      description:
        'Who I am, where I am, and why this site exists: a photo journal from an exchange semester in Göteborg.',
      url: `${base}/about`,
      type: 'website',
      image: null,
    })
  }

  // Home / everything else.
  return injectHead(tpl, {
    title: `${SITE_NAME} — a semester in Sweden`,
    description:
      'A photo journal from an exchange semester in Göteborg. A photo and a few sentences at a time, newest first.',
    url: `${base}/`,
    type: 'website',
    image: null,
  })
}

export function sitemapXml(req) {
  const base = baseUrl(req)
  const rows = listEntries({ includeUnlisted: false })
  const tags = [...new Set(rows.flatMap((r) => JSON.parse(r.tags || '[]')))]
  const urls = [
    `${base}/`,
    `${base}/about`,
    ...tags.map((t) => `${base}/tags/${t}`),
    ...rows.map((r) => `${base}/entry/${r.slug}`),
  ]
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${escapeHtml(u)}</loc></url>`).join('\n') +
    `\n</urlset>\n`
  )
}

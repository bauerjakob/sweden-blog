import { onMounted } from 'vue'

export interface DocumentMeta {
  title: string
  description?: string
  image?: string // absolute or root-relative URL
  url?: string
  type?: 'website' | 'article'
}

const SITE_NAME = 'Ett halvår i Sverige'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Client-side title + Open Graph updates so in-app navigation keeps the tab
 * label and shared-link previews correct. The build-time prerender bakes the
 * same tags into static HTML for crawlers that don't run JS (WhatsApp, etc.).
 */
export function applyDocumentMeta(meta: DocumentMeta) {
  document.title = meta.title
  const url = meta.url ?? window.location.href

  if (meta.description) {
    upsertMeta('name', 'description', meta.description)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('name', 'twitter:description', meta.description)
  }
  upsertMeta('property', 'og:title', meta.title)
  upsertMeta('name', 'twitter:title', meta.title)
  upsertMeta('property', 'og:site_name', SITE_NAME)
  upsertMeta('property', 'og:type', meta.type ?? 'website')
  upsertMeta('property', 'og:url', url)
  upsertCanonical(url)

  if (meta.image) {
    const abs = meta.image.startsWith('http')
      ? meta.image
      : window.location.origin + meta.image
    upsertMeta('property', 'og:image', abs)
    upsertMeta('name', 'twitter:image', abs)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
  }
}

export function useDocumentMeta(meta: DocumentMeta) {
  onMounted(() => applyDocumentMeta(meta))
}

import { ref, computed } from 'vue'
import { getTheme } from '@/lib/daylight'
import { api, type ApiEntry, type ApiPhoto } from '@/api/client'
import type { Entry, Photo } from './types'

function toPhoto(p: ApiPhoto): Photo {
  const widths = [...p.widths].sort((a, b) => a - b)
  const largest = widths[widths.length - 1]
  const r = p.w / p.h
  return {
    src: p.name,
    alt: p.alt,
    caption: p.caption || undefined,
    w: p.w,
    h: p.h,
    widths,
    srcset: widths.map((w) => `/${p.dir}/${p.name}-${w}.webp ${w}w`).join(', '),
    url: `/${p.dir}/${p.name}-${largest}.webp`,
    orientation: r > 1.05 ? 'landscape' : r < 0.95 ? 'portrait' : 'square',
  }
}

/** Turn the API's JSON into a fully-formed Entry (adds Daylight + photo srcsets). */
export function apiToEntry(a: ApiEntry): Entry {
  const date = new Date(`${a.dateISO}T12:00:00`)
  return {
    slug: a.slug,
    date,
    dateISO: a.dateISO,
    monthKey: a.dateISO.slice(0, 7),
    title: a.title || undefined,
    location: a.location || undefined,
    tags: a.tags ?? [],
    unlisted: a.unlisted,
    bodyHtml: a.bodyHtml,
    excerpt: a.excerpt,
    hasBody: a.hasBody,
    photos: (a.photos ?? []).map(toPhoto),
    daylight: getTheme(date),
  }
}

// ---- Reactive store -------------------------------------------------------

const entries = ref<Entry[]>([])
const loaded = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

/**
 * Load the timeline. When `includeUnlisted` (an authenticated editor), unlisted
 * entries come back too so the owner can find and edit them.
 */
export async function loadEntries(includeUnlisted = false): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const { entries: list } = await api.listEntries(includeUnlisted)
    entries.value = list.map(apiToEntry)
    loaded.value = true
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

export function useContent() {
  return { entries, loaded, loading, error }
}

/** Everything currently loaded (includes unlisted only when an editor loaded it). */
export const allLoaded = computed(() => entries.value)

/** Entries shown on the public timeline. */
export const publicEntries = computed(() => entries.value.filter((e) => !e.unlisted))

export function getLoadedEntry(slug: string): Entry | undefined {
  return entries.value.find((e) => e.slug === slug)
}

export interface MonthGroup {
  key: string
  label: string
  year: number
  entries: Entry[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function groupByMonth(list: Entry[]): MonthGroup[] {
  const groups = new Map<string, Entry[]>()
  for (const e of list) {
    const arr = groups.get(e.monthKey) ?? []
    arr.push(e)
    groups.set(e.monthKey, arr)
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, es]) => {
      const [year, month] = key.split('-').map(Number)
      return { key, label: `${MONTHS[month - 1]} ${year}`, year, entries: es }
    })
}

export function allTags(list: Entry[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const e of list) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

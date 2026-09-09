import type { DaylightTheme } from '@/lib/daylight'

export interface Photo {
  /** Base name, matches a source file in /photos-src and the manifest. */
  src: string
  alt: string
  caption?: string
  /** Intrinsic dimensions of the source, for width/height attrs (no CLS). */
  w: number
  h: number
  /** Generated responsive widths, ascending. */
  widths: number[]
  /** Ready-to-use srcset string of webp variants. */
  srcset: string
  /** A sensible default `src` (largest variant). */
  url: string
  orientation: 'landscape' | 'portrait' | 'square'
}

export interface Entry {
  slug: string
  /** Local date at Göteborg; time is irrelevant. */
  date: Date
  dateISO: string // YYYY-MM-DD
  /** e.g. "2026-02" — used to group the timeline by month. */
  monthKey: string
  title?: string
  location?: string
  tags: string[]
  unlisted: boolean
  bodyHtml: string
  /** Plain-text first line, for excerpts and Open Graph descriptions. */
  excerpt: string
  hasBody: boolean
  photos: Photo[]
  /** Precomputed Daylight palette for this entry's date. */
  daylight: DaylightTheme
}

export interface PhotoManifestItem {
  w: number
  h: number
  widths: number[]
}

export type PhotoManifest = Record<string, PhotoManifestItem>

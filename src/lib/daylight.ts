import SunCalc from 'suncalc'

/**
 * DAYLIGHT — the site's one idea.
 *
 * Given an entry's date, compute how much daylight Stockholm actually had that
 * day, then turn it into a palette. Short winter days render the page in deep
 * petrol; long summer days lift it toward a warm off-white. The swing is
 * deliberately damped (see AMPLITUDE) — enough that the season is unmistakable
 * when you scroll a few months, not so much that the page becomes the subject.
 * The reading panel and ink are chosen per mode to always clear WCAG AA
 * (>= 4.5:1), so the mood lives on the page, never on the text.
 *
 * Same module runs in the browser and in the Node prerender script.
 */

// Stockholm, Sweden.
export const STOCKHOLM = { lat: 59.3293, lon: 18.0686 } as const

// Daylight extremes at this latitude (hours), rounded just outside the real
// solstice values (6 h 05 min and 18 h 37 min) so `t` uses its full 0..1 range.
const MIN_HOURS = 6.0 // ~winter solstice
const MAX_HOURS = 18.7 // ~summer solstice

// Below this many hours of daylight, an entry reads as a "dark" (winter) entry.
const DARK_THRESHOLD_HOURS = 10.5

/**
 * How far a page is allowed to travel from its mode's calm mid-tone, 0..1.
 *
 * At 1 the palette runs its full expressive distance — petrol-black in
 * December, bleached near-white at midsummer — which reads as the point of the
 * site rather than as its weather. Pulling the extremes toward the middle keeps
 * a December entry visibly darker than a June one while letting the photos and
 * the writing stay the loudest things on screen. This is the one number to turn
 * if the seasons should breathe more or less.
 */
const AMPLITUDE = 0.55

// The tone each mode collapses toward as AMPLITUDE goes to 0.
const DARK_ANCHOR = '#162932'
const LIGHT_ANCHOR = '#dfe0d6'

/** Pull an expressive endpoint back toward its mode's anchor. */
function damp(hex: string, anchor: string): string {
  return mixHex(anchor, hex, AMPLITUDE)
}

export interface DaylightInfo {
  hours: number
  /** 0 at the shortest day of the year, 1 at the longest. */
  t: number
  mode: 'dark' | 'light'
  sunrise: Date | null
  sunset: Date | null
  /** e.g. "6 h 41 min" */
  label: string
  /** "07:52" or null on polar edge cases. */
  sunriseLabel: string | null
  sunsetLabel: string | null
}

export interface DaylightTheme extends DaylightInfo {
  /** CSS custom properties to spread onto a wrapping element's style. */
  vars: Record<string, string>
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function rgbToHex(rgb: [number, number, number]): string {
  return (
    '#' +
    rgb
      .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
      .join('')
  )
}

export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  return rgbToHex([
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t,
  ])
}

function two(d: number): string {
  return String(d).padStart(2, '0')
}

function timeLabel(d: Date | null): string | null {
  if (!d || Number.isNaN(d.getTime())) return null
  return `${two(d.getHours())}:${two(d.getMinutes())}`
}

export function getDaylightInfo(date: Date): DaylightInfo {
  const times = SunCalc.getTimes(date, STOCKHOLM.lat, STOCKHOLM.lon)
  const sunrise = Number.isNaN(times.sunrise?.getTime()) ? null : times.sunrise
  const sunset = Number.isNaN(times.sunset?.getTime()) ? null : times.sunset

  let hours: number
  if (sunrise && sunset) {
    hours = (sunset.getTime() - sunrise.getTime()) / 3.6e6
  } else {
    // Sun never sets / never rises — approximate from day of year.
    const doy = dayOfYear(date)
    const seasonal = Math.cos(((doy - 172) / 365) * 2 * Math.PI) // 1 at solstice
    hours = MAX_HOURS - ((seasonal + 1) / 2) * (MAX_HOURS - MIN_HOURS)
  }
  hours = clamp(hours, 0, 24)

  const t = clamp((hours - MIN_HOURS) / (MAX_HOURS - MIN_HOURS), 0, 1)
  const mode: 'dark' | 'light' = hours < DARK_THRESHOLD_HOURS ? 'dark' : 'light'

  let whole = Math.floor(hours)
  let mins = Math.round((hours - whole) * 60)
  if (mins === 60) {
    whole += 1
    mins = 0
  }

  return {
    hours,
    t,
    mode,
    sunrise,
    sunset,
    label: `${whole} h ${two(mins)} min`,
    sunriseLabel: timeLabel(sunrise),
    sunsetLabel: timeLabel(sunset),
  }
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000)
}

export function getTheme(date: Date): DaylightTheme {
  const info = getDaylightInfo(date)

  let vars: Record<string, string>

  if (info.mode === 'dark') {
    // How deep into winter, 0 (near the threshold) .. 1 (solstice).
    const depth = clamp((DARK_THRESHOLD_HOURS - info.hours) / (DARK_THRESHOLD_HOURS - MIN_HOURS), 0, 1)
    // grey-blue -> deep petrol, both ends pulled toward DARK_ANCHOR.
    const page = mixHex(damp('#182f38', DARK_ANCHOR), damp('#0a141b', DARK_ANCHOR), depth)
    vars = {
      '--day-page': page,
      '--day-page-2': mixHex(page, '#05090d', 0.6 * AMPLITUDE),
      // Sits just above the whole damped dark range, so the reading surface
      // always reads as lifted off the page rather than crossing it mid-winter.
      '--day-panel': '#1a2e36',
      '--day-ink': '#f2ede1',
      '--day-ink-muted': '#adc0c4',
      '--day-hairline': 'color-mix(in srgb, #f2ede1 16%, transparent)',
      '--day-accent': 'var(--color-ochre)',
      '--day-scheme': 'dark',
      '--day-shadow': '0 1px 0 rgba(255,255,255,0.04), 0 30px 60px -40px rgba(0,0,0,0.7)',
    }
  } else {
    // How deep into summer, 0 (near the threshold) .. 1 (solstice).
    const bright = clamp((info.hours - DARK_THRESHOLD_HOURS) / (MAX_HOURS - DARK_THRESHOLD_HOURS), 0, 1)
    // cold grey-blue -> warm birch, both ends pulled toward LIGHT_ANCHOR.
    const page = mixHex(damp('#ccd6d6', LIGHT_ANCHOR), damp('#f6f2e6', LIGHT_ANCHOR), bright)
    vars = {
      '--day-page': page,
      '--day-page-2': mixHex(page, '#b9c6c5', 0.5 * AMPLITUDE),
      '--day-panel': '#fbf8f0',
      '--day-ink': '#17282a',
      '--day-ink-muted': '#566863',
      '--day-hairline': 'color-mix(in srgb, #17282a 14%, transparent)',
      '--day-accent': 'var(--color-ochre)',
      '--day-scheme': 'light',
      '--day-shadow': '0 1px 0 rgba(255,255,255,0.6), 0 30px 60px -42px rgba(20,40,45,0.35)',
    }
  }

  return { ...info, vars }
}

/**
 * SCENE — the palette the page *chrome* reads.
 *
 * `getTheme` dresses one entry. The header, footer and month tabs instead
 * float above whatever entry you happen to be scrolled to, so they need the
 * same palette as a set of plain values they can blend between. Entries
 * publish this as data-attributes; useAmbientDaylight interpolates between the
 * two nearest and writes the result to <html> as `--scene-*`.
 *
 * `lum` is 0 for a winter scene and 1 for a summer one — the chrome uses it to
 * decide how bright its specular highlight and glass tint should be.
 */
export interface Scene {
  page: string
  page2: string
  panel: string
  ink: string
  inkMuted: string
  lum: number
}

/** Data-attributes an element publishes so the ambient chrome can read it. */
export function sceneAttrs(theme: DaylightTheme): Record<string, string> {
  const v = theme.vars
  return {
    'data-scene': '',
    'data-scene-page': v['--day-page'],
    'data-scene-page-2': v['--day-page-2'],
    'data-scene-panel': v['--day-panel'],
    'data-scene-ink': v['--day-ink'],
    'data-scene-ink-muted': v['--day-ink-muted'],
    'data-scene-lum': theme.mode === 'light' ? '1' : '0',
  }
}

/** Read a Scene back off an element that carries `sceneAttrs`. */
export function readScene(el: HTMLElement): Scene | null {
  const d = el.dataset
  if (!d.scenePage || !d.sceneInk) return null
  return {
    page: d.scenePage,
    page2: d.scenePage2 ?? d.scenePage,
    panel: d.scenePanel ?? d.scenePage,
    ink: d.sceneInk,
    inkMuted: d.sceneInkMuted ?? d.sceneInk,
    lum: Number(d.sceneLum ?? 0),
  }
}

/** Blend two scenes. `t` 0 → a, 1 → b. */
export function blendScenes(a: Scene, b: Scene, t: number): Scene {
  return {
    page: mixHex(a.page, b.page, t),
    page2: mixHex(a.page2, b.page2, t),
    panel: mixHex(a.panel, b.panel, t),
    ink: mixHex(a.ink, b.ink, t),
    inkMuted: mixHex(a.inkMuted, b.inkMuted, t),
    lum: a.lum + (b.lum - a.lum) * t,
  }
}

/** The `--scene-*` custom properties for a scene. */
export function sceneVars(s: Scene): Record<string, string> {
  return {
    '--scene-page': s.page,
    '--scene-page-2': s.page2,
    '--scene-panel': s.panel,
    '--scene-ink': s.ink,
    '--scene-ink-muted': s.inkMuted,
    '--scene-lum': s.lum.toFixed(3),
  }
}

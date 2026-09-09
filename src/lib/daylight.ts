import SunCalc from 'suncalc'

/**
 * DAYLIGHT — the site's one idea.
 *
 * Given an entry's date, compute how much daylight Göteborg actually had that
 * day, then turn it into a palette. Short winter days render the page in deep
 * petrol-black; long summer days bleach it toward birch-white. The reading
 * panel and ink are chosen per mode to always clear WCAG AA (>= 4.5:1), so the
 * mood lives on the page, never on the text.
 *
 * Same module runs in the browser and in the Node prerender script.
 */

// Göteborg, Sweden.
export const GOTHENBURG = { lat: 57.7089, lon: 11.9746 } as const

// Empirical daylight extremes for this latitude (hours).
const MIN_HOURS = 6.4 // ~winter solstice
const MAX_HOURS = 18.4 // ~summer solstice

// Below this many hours of daylight, an entry reads as a "dark" (winter) entry.
const DARK_THRESHOLD_HOURS = 10.5

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

function mix(a: string, b: string, t: number): string {
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
  const times = SunCalc.getTimes(date, GOTHENBURG.lat, GOTHENBURG.lon)
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
    const page = mix('#182f38', '#0a141b', depth) // grey-blue -> near-black petrol
    vars = {
      '--day-page': page,
      '--day-page-2': mix(page, '#05090d', 0.6),
      '--day-panel': '#12242c',
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
    const page = mix('#ccd6d6', '#f6f2e6', bright) // cold grey-blue -> bleached birch
    vars = {
      '--day-page': page,
      '--day-page-2': mix(page, '#b9c6c5', 0.5),
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

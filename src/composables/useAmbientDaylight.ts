import { onMounted, onUnmounted, type Ref } from 'vue'
import {
  blendScenes,
  readScene,
  sceneVars,
  type DaylightTheme,
  type Scene,
} from '@/lib/daylight'

/**
 * Ambient mood: as you scroll the timeline, the page eases toward the daylight
 * colour of the entry you're reading — deep petrol behind a December note,
 * warm off-white behind a June one.
 *
 * It doesn't snap to the nearest entry. It finds the two entries the focus line
 * sits between and *blends* them, so scrolling the timeline plays the semester
 * as one continuous fade rather than a series of steps. The result is written
 * to <html> as `--scene-*`, which the body background and all the glass chrome
 * (header, month tabs, footer) read.
 *
 * Decorative only. Every piece of text lives on a solid `.panel`, so legibility
 * never depends on where this happens to be mid-blend.
 */

// The focus line sits a little above centre — you read the thing you're looking
// at slightly above the middle of the screen, not dead centre.
const FOCUS = 0.42

function applyScene(s: Scene) {
  const root = document.documentElement
  for (const [k, v] of Object.entries(sceneVars(s))) root.style.setProperty(k, v)
  // Let native UI (scrollbars, form controls) follow the season too.
  root.style.colorScheme = s.lum > 0.5 ? 'light' : 'dark'
}

export function useAmbientDaylight(container: Ref<HTMLElement | null>) {
  let raf = 0
  let ticking = false

  function apply() {
    ticking = false
    const host = container.value
    if (!host) return

    const focus = window.innerHeight * FOCUS
    const marks: { center: number; scene: Scene }[] = []

    host.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
      const scene = readScene(el)
      if (!scene) return
      const r = el.getBoundingClientRect()
      marks.push({ center: r.top + r.height / 2, scene })
    })

    if (!marks.length) return
    marks.sort((a, b) => a.center - b.center)

    // Before the first / after the last entry there is nothing to blend with.
    if (focus <= marks[0].center) return applyScene(marks[0].scene)
    const last = marks[marks.length - 1]
    if (focus >= last.center) return applyScene(last.scene)

    // Blend across the pair the focus line falls between.
    let i = 0
    while (i < marks.length - 2 && marks[i + 1].center <= focus) i++
    const a = marks[i]
    const b = marks[i + 1]
    const span = b.center - a.center
    const t = span > 0 ? (focus - a.center) / span : 0
    applyScene(blendScenes(a.scene, b.scene, Math.min(1, Math.max(0, t))))
  }

  function onScroll() {
    if (ticking) return
    ticking = true
    raf = requestAnimationFrame(apply)
  }

  onMounted(() => {
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    cancelAnimationFrame(raf)
    // Leave the last scene in place; pages that need a fixed mood set it themselves.
  })
}

/**
 * Set a single fixed page mood (entry detail, about, login).
 *
 * Accepts a full DaylightTheme or a partial `--day-*` bag; anything the caller
 * leaves out falls back to the winter defaults, so a page that only wants to
 * name its two background colours doesn't have to restate the whole palette.
 */
export function setSceneVars(theme: DaylightTheme | Record<string, string>) {
  // A plain `'vars' in theme` can't narrow against an index signature, so ask
  // the value itself which shape it is.
  const isTheme = (t: typeof theme): t is DaylightTheme =>
    typeof (t as DaylightTheme).vars === 'object'

  const vars = isTheme(theme) ? theme.vars : theme
  const light = (isTheme(theme) ? theme.mode : vars['--day-scheme']) === 'light'
  const page = vars['--day-page'] ?? (light ? '#e4e2d6' : '#112129')
  applyScene({
    page,
    page2: vars['--day-page-2'] ?? page,
    panel: vars['--day-panel'] ?? (light ? '#fbf8f0' : '#1a2e36'),
    ink: vars['--day-ink'] ?? (light ? '#17282a' : '#f2ede1'),
    inkMuted: vars['--day-ink-muted'] ?? (light ? '#566863' : '#adc0c4'),
    lum: light ? 1 : 0,
  })
}

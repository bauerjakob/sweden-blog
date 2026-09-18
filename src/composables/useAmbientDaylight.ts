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

/**
 * The last scene written to <html>, as its own serialised vars.
 *
 * Every write here invalidates the style of the whole document and forces the
 * glass chrome to re-composite its backdrop blur — the single most expensive
 * thing this file can do, and it was happening on every scroll frame even when
 * the blend had not moved far enough to change a single hex digit. Comparing
 * first turns most frames into no work at all.
 */
let written = ''

function applyScene(s: Scene) {
  const vars = sceneVars(s)
  const key = Object.values(vars).join('|')
  if (key === written) return
  written = key

  const root = document.documentElement
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  // Let native UI (scrollbars, form controls) follow the season too.
  root.style.colorScheme = s.lum > 0.5 ? 'light' : 'dark'
}

export function useAmbientDaylight(container: Ref<HTMLElement | null>) {
  let raf = 0
  let ticking = false

  /**
   * Entry centres in *document* space, measured once and reused.
   *
   * The scroll handler used to call getBoundingClientRect() on every entry in
   * the timeline, every frame. That is a forced layout per frame whose cost
   * grows with the length of the semester, on the main thread, competing with
   * exactly the reveal transitions it runs alongside — which is what made a
   * card look like it snapped into place instead of fading. An entry's position
   * in the document does not change as you scroll, so it is measured when the
   * page changes shape and read for free in between.
   */
  let marks: { center: number; scene: Scene }[] | null = null

  function measure() {
    const host = container.value
    if (!host) return
    const top = window.scrollY
    const next: { center: number; scene: Scene }[] = []
    host.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
      const scene = readScene(el)
      if (!scene) return
      const r = el.getBoundingClientRect()
      next.push({ center: r.top + top + r.height / 2, scene })
    })
    next.sort((a, b) => a.center - b.center)
    marks = next
  }

  function apply() {
    ticking = false
    if (!container.value) return
    if (!marks) measure()
    if (!marks?.length) return

    // Document-space too, so it compares directly against the cached centres.
    const focus = window.scrollY + window.innerHeight * FOCUS

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

  /** Something moved the entries; re-measure before the next read. */
  function invalidate() {
    marks = null
    onScroll()
  }

  let mutations: MutationObserver | null = null

  onMounted(() => {
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', invalidate, { passive: true })
    // A lazy photo finishing its download reflows everything below it, and on a
    // phone that is most of the timeline. Capture, because `load` on an <img>
    // does not bubble.
    container.value?.addEventListener('load', invalidate, { capture: true })
    // Entries arriving after mount change the set of marks outright.
    if (container.value) {
      mutations = new MutationObserver(invalidate)
      mutations.observe(container.value, { childList: true, subtree: true })
    }
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', invalidate)
    container.value?.removeEventListener('load', invalidate, { capture: true })
    mutations?.disconnect()
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
  const page = vars['--day-page'] ?? (light ? '#fcfcf9' : '#112129')
  applyScene({
    page,
    page2: vars['--day-page-2'] ?? page,
    panel: vars['--day-panel'] ?? (light ? '#ffffff' : '#1a2e36'),
    ink: vars['--day-ink'] ?? (light ? '#17282a' : '#f2ede1'),
    inkMuted: vars['--day-ink-muted'] ?? (light ? '#566863' : '#adc0c4'),
    lum: light ? 1 : 0,
  })
}

/**
 * Keep whatever scene is already on screen.
 *
 * Pages that are not an entry (About) have no daylight of their own. Rather
 * than snapping the whole site to a mood of their own the moment you tap the
 * tab, they inherit the scene the timeline left behind, so moving between the
 * timeline and About is a change of page, not a change of weather. On a cold
 * load there is nothing to inherit — `fallback` is used then, and it is light.
 */
export function keepScene(fallback: DaylightTheme | Record<string, string>) {
  // applyScene writes the scene inline on <html>; an empty value means we
  // arrived here directly and the page is still on the stylesheet defaults.
  if (document.documentElement.style.getPropertyValue('--scene-page')) return
  setSceneVars(fallback)
}

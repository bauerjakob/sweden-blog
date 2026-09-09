import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Ambient mood: as you scroll the timeline, the page background eases toward
 * the daylight colour of whichever entry is nearest the middle of the screen —
 * deep petrol behind a December note, bleached birch behind a June one. It
 * writes `--scene-page` / `--scene-page-2` on <html>; the body background reads
 * those and transitions smoothly (see main.css).
 *
 * Decorative only. Every piece of text lives on a solid `.panel`, so
 * legibility never depends on where this happens to be mid-transition.
 */
export function useAmbientDaylight(container: Ref<HTMLElement | null>) {
  let raf = 0
  let ticking = false
  const root = document.documentElement

  function apply() {
    ticking = false
    const host = container.value
    if (!host) return

    const mid = window.innerHeight / 2
    let best: HTMLElement | null = null
    let bestDist = Infinity

    host.querySelectorAll<HTMLElement>('[data-day-page]').forEach((el) => {
      const r = el.getBoundingClientRect()
      const center = r.top + r.height / 2
      const dist = Math.abs(center - mid)
      if (r.top < mid && r.bottom > mid) {
        best = el
        bestDist = -1
      } else if (bestDist !== -1 && dist < bestDist) {
        bestDist = dist
        best = el
      }
    })

    if (best) {
      const el = best as HTMLElement
      const page = el.dataset.dayPage
      const page2 = el.dataset.dayPage2
      if (page) root.style.setProperty('--scene-page', page)
      if (page2) root.style.setProperty('--scene-page-2', page2)
    }
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

/** Set a single fixed page mood (entry detail, about). */
export function setSceneVars(vars: Record<string, string>) {
  const root = document.documentElement
  if (vars['--day-page']) root.style.setProperty('--scene-page', vars['--day-page'])
  if (vars['--day-page-2']) root.style.setProperty('--scene-page-2', vars['--day-page-2'])
}

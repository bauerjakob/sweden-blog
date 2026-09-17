import { onMounted, onUnmounted } from 'vue'

/**
 * Reveal-on-scroll, honestly optional. Elements carrying `.reveal` get `.is-in`
 * when they enter the viewport.
 *
 * Anything inside a `[data-reveal-group]` is staggered: each `.reveal` in the
 * group gets a `--reveal-i` index, and the CSS turns that into a short delay so
 * a row of photos arrives in sequence instead of all at once. The stagger is
 * capped so a long list never leaves you waiting on the last item.
 *
 * Content that arrives after mount is picked up too. An entry page fetches its
 * body asynchronously, so a scan that ran only on mount would find nothing and
 * leave every `.reveal` in it stuck at opacity 0 — invisible, permanently. A
 * MutationObserver re-scans whenever the container's subtree changes.
 *
 * Under prefers-reduced-motion the CSS already neutralises `.reveal`, and we
 * skip the observer entirely so nothing depends on it.
 */

/** Beyond this many items the delay stops growing. */
const MAX_STAGGER = 6

export function useReveal(root: () => HTMLElement | null) {
  let observer: IntersectionObserver | null = null
  let mutations: MutationObserver | null = null
  let raf = 0
  const tracked = new WeakSet<Element>()

  function scan() {
    const container = root()
    if (!container) return

    for (const group of container.querySelectorAll<HTMLElement>('[data-reveal-group]')) {
      group.querySelectorAll<HTMLElement>('.reveal').forEach((el, i) => {
        el.style.setProperty('--reveal-i', String(Math.min(i, MAX_STAGGER)))
      })
    }

    for (const el of container.querySelectorAll('.reveal')) {
      if (tracked.has(el)) continue
      tracked.add(el)
      // No observer means we're not animating at all — show it outright.
      if (observer) observer.observe(el)
      else el.classList.add('is-in')
    }
  }

  onMounted(() => {
    const container = root()
    if (!container) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add('is-in')
              observer?.unobserve(e.target)
            }
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      )
    }

    scan()

    // Late-arriving content (an async entry body) gets the same treatment.
    mutations = new MutationObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(scan)
    })
    mutations.observe(container, { childList: true, subtree: true })
  })

  onUnmounted(() => {
    observer?.disconnect()
    mutations?.disconnect()
    cancelAnimationFrame(raf)
  })
}

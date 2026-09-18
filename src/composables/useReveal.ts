import { onMounted, onUnmounted } from 'vue'

/**
 * Reveal-on-scroll, honestly optional. Elements carrying `.reveal` get `.is-in`
 * when they are about to enter the viewport.
 *
 * "About to" is the whole trick. Triggering once an element is *visible* means
 * the reader watches it fade — on a phone, where a card fills the screen and a
 * flick moves a viewport at a time, that reads as content popping in late
 * rather than as content arriving. So the root is grown downward by PRE_ROLL:
 * the transition starts while the element is still below the fold and is
 * largely over by the time it is actually in front of you.
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

/**
 * How far below the fold an element starts animating. Expressed as a percentage
 * so the browser resolves it against the live viewport height — a phone whose
 * address bar slides away, or a rotated screen, keeps the right pre-roll without
 * anything here having to listen for it.
 *
 * Roughly a quarter of a phone screen: enough that a normal scroll has the
 * element settled by the time it is centred, not so much that a tall desktop
 * window reveals a whole page of content at once.
 */
const PRE_ROLL = '28%'

export function useReveal(root: () => HTMLElement | null) {
  let observer: IntersectionObserver | null = null
  let mutations: MutationObserver | null = null
  let raf = 0
  const tracked = new WeakSet<Element>()

  function show(el: Element) {
    el.classList.add('is-in')
  }

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
      else show(el)
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
            if (!e.isIntersecting) continue
            show(e.target)
            observer?.unobserve(e.target)
          }
        },
        {
          // threshold 0: any overlap at all with the grown root counts. A
          // fractional threshold would have meant a card taller than the phone
          // screen waiting for a fixed *share* of a very large element, which
          // is precisely the case where the delay is most visible.
          threshold: 0,
          rootMargin: `0px 0px ${PRE_ROLL} 0px`,
        },
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

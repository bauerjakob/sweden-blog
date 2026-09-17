import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * Header scroll state.
 *
 * `condensed` — past the first few pixels, so the bar can trade its airy
 *   resting state for a pane of glass with a real edge.
 * `hidden` — scrolling down, well past the top. The bar gets out of the way on
 *   a phone, where it otherwise eats a tenth of the screen, and comes straight
 *   back on the first upward flick. Never hides while a menu is open, and never
 *   near the top of the page.
 * `brandIn` — 0..1, how far the bar has taken over the page's title. This is a
 *   *handoff*, not a fade-in on a timer: the bar prints the same sentence as
 *   the cover, so the two must never be legible at the same moment. The ramp is
 *   therefore driven by where the title actually is — an element marked
 *   `data-header-handoff` — and only starts once that title has all but
 *   disappeared under the bar. Pages without such an element (an entry, the
 *   about page) fall back to a short ramp off the top of the document.
 */

/** Ignore jitter below this many px of travel. */
const DEAD_ZONE = 6
/** Don't hide the bar until we're at least this far down. */
const HIDE_AFTER = 420

/** The element handing its title over to the bar. */
const HANDOFF = '[data-header-handoff]'
/**
 * The handoff ramp, in px of the title's bottom edge relative to the bottom of
 * the bar. It begins with the title all but swallowed — a 40px sliver, far too
 * little to read — and completes once it is well clear, so the sentence is
 * never readable in both places at once.
 */
const HANDOFF_START = 40
const HANDOFF_END = -80

/** Fallback ramp (px of scroll) where there is no title to hand over. */
const FALLBACK_START = 40
const FALLBACK_END = 190

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

export function useHeaderScroll(
  keepVisible: () => boolean = () => false,
  barEl?: Ref<HTMLElement | null>,
) {
  const condensed = ref(false)
  const hidden = ref(false)
  const brandIn = ref(0)

  let last = 0
  let ticking = false
  let raf = 0

  function apply() {
    ticking = false
    const y = Math.max(0, window.scrollY)

    condensed.value = y > 8

    const title = document.querySelector(HANDOFF)
    if (title) {
      // Measured, not assumed: the title carries a parallax drift of its own,
      // and its rect already accounts for it, so the handoff tracks what the
      // reader can actually see rather than where the title would be at rest.
      const barBottom = barEl?.value?.offsetHeight ?? 56
      const left = title.getBoundingClientRect().bottom - barBottom
      brandIn.value = clamp01((HANDOFF_START - left) / (HANDOFF_START - HANDOFF_END))
    } else {
      brandIn.value = clamp01((y - FALLBACK_START) / (FALLBACK_END - FALLBACK_START))
    }

    const delta = y - last
    if (Math.abs(delta) > DEAD_ZONE) {
      hidden.value = keepVisible() ? false : delta > 0 && y > HIDE_AFTER
      last = y
    }
  }

  function onScroll() {
    if (ticking) return
    ticking = true
    raf = requestAnimationFrame(apply)
  }

  onMounted(() => {
    last = window.scrollY
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    cancelAnimationFrame(raf)
  })

  /**
   * Navigating swaps the page under the bar — a new title, or none at all —
   * and may not move the scroll position at all, so there is no scroll event
   * to recompute from. Call this after the route settles.
   */
  return { condensed, hidden, brandIn, refresh: apply }
}

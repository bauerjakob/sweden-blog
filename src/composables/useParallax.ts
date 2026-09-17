import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * PARALLAX — depth without motion sickness.
 *
 * Any element marked `data-parallax` drifts against the scroll. The attribute
 * value is its speed: `data-parallax="0.5"` moves half again as far as the
 * default. Photos additionally get `data-parallax-scale`, which lets the image
 * sit slightly oversized inside a clipping figure so the drift never exposes an
 * edge — the reason this reads as depth rather than as a sliding picture.
 *
 * Two things make it feel liquid instead of stepped:
 *   - the offset is eased toward its target every frame, so a flicked scroll on
 *     a phone settles instead of snapping;
 *   - only elements actually on screen are measured, and the rAF loop parks
 *     itself once everything has settled, so an idle page costs nothing.
 *
 * Elements that appear after mount are picked up too — an entry page fetches
 * its photos asynchronously, so a one-shot scan at mount would find nothing.
 *
 * Writes `--parallax-y` / `--parallax-scale`; the CSS decides what to do with
 * them. Fully disabled under prefers-reduced-motion, and on phone-width
 * screens — see NO_PARALLAX. The reveal-on-scroll animations are a separate
 * composable and stay on everywhere.
 */

interface Item {
  el: HTMLElement
  speed: number
  scale: number
  current: number
  target: number
  visible: boolean
}

/** Base drift in px at the top/bottom of the viewport, before speed. */
const BASE_SHIFT = 150
/**
 * How much of an oversized image's overhang the drift is allowed to spend.
 * The element we measure is the whole figure, caption included, so its height
 * slightly overstates the frame the image is clipped by; this keeps the drift
 * clear of the edge anyway.
 */
const SAFE_TRAVEL = 0.78
/** Per-frame easing. Lower is looser; this settles in ~15 frames. */
const EASE = 0.14
/** Below this the offset is close enough to call it arrived. */
const EPSILON = 0.05
/*
  Where the drift is switched off. The same width at which the timeline gives
  up its alternating two-column layout (see EntryCard): below it a photo is
  full-bleed and nearly as tall as the viewport, so the drift has no still
  surround to be measured against — it reads as the picture sliding in its
  frame rather than as depth, and it costs a scroll-linked rAF loop on exactly
  the devices least able to spare one. The oversize goes with it, so a phone
  gets the photo at its natural crop instead of a zoomed one that never moves.
*/
const NO_PARALLAX = '(prefers-reduced-motion: reduce), (max-width: 51.24rem)'

export function useParallax(container: Ref<HTMLElement | null>, speedScale = 1) {
  let raf = 0
  let running = false
  let items: Item[] = []
  let observer: IntersectionObserver | null = null
  let mutations: MutationObserver | null = null
  let scanRaf = 0
  let tracked = new WeakSet<Element>()

  function measure() {
    const vh = window.innerHeight
    const mid = vh / 2
    for (const it of items) {
      if (!it.visible) continue
      const r = it.el.getBoundingClientRect()
      const center = r.top + r.height / 2
      // -1 when the element sits a full viewport below centre, +1 above.
      const rel = Math.max(-1, Math.min(1, (center - mid) / vh))
      const want = -rel * BASE_SHIFT * it.speed * speedScale
      // An oversized image can only drift as far as its overhang: scale 1.16 on
      // a 600px photo hides 48px above and below, and travelling further than
      // that would slide the frame off the picture. Clamping here (rather than
      // hand-tuning each speed against each photo's height) is what lets the
      // drift be set large enough to actually read as depth on a big lead photo
      // while a short one simply moves less.
      const room = it.scale > 1 ? (r.height * (it.scale - 1) * SAFE_TRAVEL) / 2 : Infinity
      it.target = Math.max(-room, Math.min(room, want))
    }
  }

  function frame() {
    let moving = false
    for (const it of items) {
      if (!it.visible) continue
      const delta = it.target - it.current
      if (Math.abs(delta) < EPSILON) {
        it.current = it.target
      } else {
        it.current += delta * EASE
        moving = true
      }
      it.el.style.setProperty('--parallax-y', `${it.current.toFixed(2)}px`)
    }
    if (moving) {
      raf = requestAnimationFrame(frame)
    } else {
      running = false
    }
  }

  function start() {
    measure()
    if (running) return
    running = true
    raf = requestAnimationFrame(frame)
  }

  function scan() {
    const host = container.value
    if (!host) return
    for (const el of host.querySelectorAll<HTMLElement>('[data-parallax]')) {
      if (tracked.has(el)) continue
      tracked.add(el)
      const speed = Number(el.dataset.parallax) || 0.2
      const scale = Number(el.dataset.parallaxScale) || 0
      if (scale) el.style.setProperty('--parallax-scale', String(scale))
      items.push({ el, speed, scale, current: 0, target: 0, visible: false })
      observer?.observe(el)
    }
    start()
  }

  function enable() {
    const host = container.value
    if (!host || observer) return

    // Only elements on screen are measured or eased.
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const it = items.find((i) => i.el === e.target)
          if (it) it.visible = e.isIntersecting
        }
        start()
      },
      { rootMargin: '20% 0px' },
    )

    scan()

    mutations = new MutationObserver(() => {
      cancelAnimationFrame(scanRaf)
      scanRaf = requestAnimationFrame(scan)
    })
    mutations.observe(host, { childList: true, subtree: true })

    window.addEventListener('scroll', start, { passive: true })
    window.addEventListener('resize', start, { passive: true })
  }

  function disable() {
    window.removeEventListener('scroll', start)
    window.removeEventListener('resize', start)
    observer?.disconnect()
    observer = null
    mutations?.disconnect()
    mutations = null
    cancelAnimationFrame(raf)
    cancelAnimationFrame(scanRaf)
    running = false
    // Hand every element back to the CSS defaults: no drift, no oversize. The
    // scale is transitioned, so a photo eases out of its crop rather than
    // jumping when a window is dragged narrow.
    for (const it of items) {
      it.el.style.removeProperty('--parallax-y')
      it.el.style.removeProperty('--parallax-scale')
    }
    items = []
    tracked = new WeakSet()
  }

  // Not read once at mount: rotating a phone or dragging a window across the
  // breakpoint has to be able to start the effect as well as stop it.
  let query: MediaQueryList | null = null
  const sync = () => (query?.matches ? disable() : enable())

  onMounted(() => {
    query = window.matchMedia(NO_PARALLAX)
    query.addEventListener('change', sync)
    sync()
  })

  onUnmounted(() => {
    query?.removeEventListener('change', sync)
    disable()
  })
}

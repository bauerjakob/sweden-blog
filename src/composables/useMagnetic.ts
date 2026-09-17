import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * MAGNETIC HOVER — a photo leans toward the cursor.
 *
 * While the pointer is over a figure, its frame drifts a few pixels in the
 * pointer's direction and eases back to rest when the pointer leaves. It is the
 * hover equivalent of the parallax: a hint that the photo is a physical thing
 * sitting above the page, not a hint that something is clickable.
 *
 * Deliberately small (see PULL_RATIO). The photos are the loudest thing on the
 * page already; this should be felt more than seen, and it must never move a
 * caption out from under its picture.
 *
 * Attach it to the photo's *frame*, not the whole figure: the frame is exactly
 * the picture, so its box is the right thing to measure the lean against and
 * the caption underneath neither moves nor triggers it.
 *
 * Writes `--magnet-x` / `--magnet-y` on that element; PhotoFigure's CSS decides
 * what moves. Like useParallax, the offset is eased per frame and the rAF loop
 * parks itself once it has settled, so a page full of photos costs nothing while
 * nobody is pointing at one.
 *
 * Off entirely for reduced motion and for anything that isn't a fine hovering
 * pointer — on a touch screen "hover" fires on tap and would read as a glitch.
 */

/**
 * The lean, as a fraction of the photo's shorter side, reached at its edge.
 *
 * This used to be a flat pixel figure, which reads as a completely different
 * effect depending on size: a nudge on a 620px lead photo, a shove on a 200px
 * thumbnail in the two-up grid. Scaling it holds the *proportional* lean
 * constant, so every photo on the page feels like it has the same weight.
 */
const PULL_RATIO = 0.02
/** Ceiling, so the biggest photos don't drift further than a nudge either. */
const PULL_MAX = 8
/** Per-frame easing. Slightly quicker than the parallax so it tracks the hand. */
const EASE = 0.16
/** Below this the offset is close enough to call it arrived. */
const EPSILON = 0.05

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

export function useMagnetic(el: Ref<HTMLElement | null>) {
  let raf = 0
  let running = false
  // Where the frame is being pulled to, and where it currently is.
  let targetX = 0
  let targetY = 0
  let currentX = 0
  let currentY = 0
  // Last pointer position in client coords, so the lean can be recomputed when
  // the page scrolls under a stationary cursor.
  let pointerX = 0
  let pointerY = 0
  let hovering = false

  function frame() {
    const node = el.value
    if (!node) {
      running = false
      return
    }

    let moving = false
    const dx = targetX - currentX
    const dy = targetY - currentY

    if (Math.abs(dx) < EPSILON) {
      currentX = targetX
    } else {
      currentX += dx * EASE
      moving = true
    }
    if (Math.abs(dy) < EPSILON) {
      currentY = targetY
    } else {
      currentY += dy * EASE
      moving = true
    }

    node.style.setProperty('--magnet-x', `${currentX.toFixed(2)}px`)
    node.style.setProperty('--magnet-y', `${currentY.toFixed(2)}px`)

    if (moving) {
      raf = requestAnimationFrame(frame)
    } else {
      running = false
    }
  }

  function start() {
    if (running) return
    running = true
    raf = requestAnimationFrame(frame)
  }

  /** Aim the frame from the last known pointer position. */
  function aim() {
    const node = el.value
    if (!node) return
    const r = node.getBoundingClientRect()
    if (!r.width || !r.height) return
    // -1 at the left/top edge of the photo, +1 at the right/bottom.
    const nx = (pointerX - (r.left + r.width / 2)) / (r.width / 2)
    const ny = (pointerY - (r.top + r.height / 2)) / (r.height / 2)
    const pull = Math.min(PULL_MAX, Math.min(r.width, r.height) * PULL_RATIO)
    targetX = clamp(nx, -1, 1) * pull
    targetY = clamp(ny, -1, 1) * pull
    start()
  }

  function onMove(e: PointerEvent) {
    pointerX = e.clientX
    pointerY = e.clientY
    aim()
  }

  function onEnter(e: PointerEvent) {
    if (hovering) return
    hovering = true
    // A wheel scroll moves the photo out from under a still cursor without
    // firing a single pointermove, which would leave the lean pointing the
    // wrong way. Re-aim from the stored coords instead — only while hovered.
    window.addEventListener('scroll', aim, { passive: true })
    onMove(e)
  }

  function onLeave() {
    if (!hovering) return
    hovering = false
    window.removeEventListener('scroll', aim)
    targetX = 0
    targetY = 0
    start()
  }

  onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const node = el.value
    if (!node) return
    node.addEventListener('pointerenter', onEnter)
    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerleave', onLeave)
  })

  onUnmounted(() => {
    const node = el.value
    node?.removeEventListener('pointerenter', onEnter)
    node?.removeEventListener('pointermove', onMove)
    node?.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('scroll', aim)
    cancelAnimationFrame(raf)
    running = false
  })
}

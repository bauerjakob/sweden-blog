import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * POINTER GLOW — the cursor, made visible in the glass.
 *
 * A pane of glass with a light behind it has a specular pool that moves as you
 * move. This gives the masthead the same: a soft warm bloom that follows the
 * pointer across the bar, plus a bright spot travelling along the hairline at
 * its bottom edge. It is the difference between a bar that is *lit* and a bar
 * that is merely tinted.
 *
 * The bloom is eased toward the pointer rather than pinned to it, for the same
 * reason the parallax is: light that lags a frame or two behind the hand reads
 * as something with weight behind the surface, where a pool locked to the
 * cursor reads as a sprite being dragged around.
 *
 * Writes `--glow-x` / `--glow-y` (px, relative to the element) and `--glow`
 * (0/1, presence); the CSS decides what to paint with them. Touch pointers are
 * ignored — a finger has no hover, and the tap feedback already covers it —
 * and the whole thing is off under prefers-reduced-motion.
 */

/** Per-frame easing toward the pointer. Lower is looser; this settles in ~12 frames. */
const EASE = 0.2
/** Within this many px of the target the light has arrived, so the loop parks. */
const EPSILON = 0.4

export function usePointerGlow(target: Ref<HTMLElement | null>) {
  let raf = 0
  let running = false
  /** False until the pointer has been seen, so the light can appear under it. */
  let placed = false
  let rect: DOMRect | null = null
  let tx = 0
  let ty = 0
  let cx = 0
  let cy = 0

  function write() {
    const el = target.value
    if (!el) return
    el.style.setProperty('--glow-x', `${cx.toFixed(1)}px`)
    el.style.setProperty('--glow-y', `${cy.toFixed(1)}px`)
  }

  function frame() {
    cx += (tx - cx) * EASE
    cy += (ty - cy) * EASE

    if (Math.abs(tx - cx) < EPSILON && Math.abs(ty - cy) < EPSILON) {
      cx = tx
      cy = ty
      running = false
      write()
      return
    }

    write()
    raf = requestAnimationFrame(frame)
  }

  function onMove(e: PointerEvent) {
    const el = target.value
    if (!el || e.pointerType === 'touch') return

    // The bar is sticky at the top of the viewport, so its box only moves on a
    // resize — one measurement per entry is enough for a whole sweep across it.
    if (!rect) rect = el.getBoundingClientRect()
    tx = e.clientX - rect.left
    ty = e.clientY - rect.top

    if (!placed) {
      placed = true
      cx = tx
      cy = ty
      write()
      el.style.setProperty('--glow', '1')
      return
    }

    if (running) return
    running = true
    raf = requestAnimationFrame(frame)
  }

  function onLeave(e: PointerEvent) {
    const el = target.value
    if (!el || e.pointerType === 'touch') return
    el.style.setProperty('--glow', '0')
    placed = false
    rect = null
  }

  function onResize() {
    rect = null
  }

  onMounted(() => {
    const el = target.value
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover)').matches) return

    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
  })

  onUnmounted(() => {
    const el = target.value
    el?.removeEventListener('pointermove', onMove)
    el?.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('resize', onResize)
    cancelAnimationFrame(raf)
  })
}

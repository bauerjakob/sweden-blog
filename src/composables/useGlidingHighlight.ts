import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * GLIDING HIGHLIGHT — one pill for a whole row of links.
 *
 * The usual nav hover fades a separate background in behind whichever item the
 * pointer happens to be over, which makes the row feel like a set of unrelated
 * buttons. Here there is a single pill instead: it rests under the page you are
 * on, slides across to whatever you point at, and slides home when you leave.
 * Because the same object travels the whole row, the nav reads as one control,
 * and the movement itself tells you where you were and where you are going.
 *
 * Writes `--hl-x` / `--hl-w` (the pill's geometry) and `--hl-o` (0/1, whether
 * there is anywhere for it to be) onto the container; the CSS owns the look.
 *
 * `data-glide-ready` is only set on the frame after the first placement, so the
 * pill is simply *there* under the active link on arrival rather than flying in
 * from the left edge.
 */

export function useGlidingHighlight(
  container: Ref<HTMLElement | null>,
  /** The things the pill can sit on. */
  itemSelector: string,
  /** Where it waits when nothing is being pointed at — usually the current page. */
  restSelector: string,
) {
  /** What the pill is on right now, so a resize can re-measure it in place. */
  let current: HTMLElement | null = null

  function place(el: HTMLElement | null) {
    const root = container.value
    if (!root) return

    current = el
    if (!el) {
      root.style.setProperty('--hl-o', '0')
      return
    }

    const r = root.getBoundingClientRect()
    const i = el.getBoundingClientRect()
    root.style.setProperty('--hl-x', `${(i.left - r.left).toFixed(1)}px`)
    root.style.setProperty('--hl-w', `${i.width.toFixed(1)}px`)
    root.style.setProperty('--hl-o', '1')
  }

  /** Send the pill home: to the current page's link, or away if there isn't one. */
  function rest() {
    const root = container.value
    place(root ? root.querySelector<HTMLElement>(restSelector) : null)
  }

  function onOver(e: PointerEvent) {
    if (e.pointerType === 'touch') return
    const el = (e.target as Element | null)?.closest<HTMLElement>(itemSelector)
    if (el) place(el)
  }

  function onLeave(e: PointerEvent) {
    if (e.pointerType === 'touch') return
    rest()
  }

  function onResize() {
    // Re-measure whatever it is sitting on; the row reflows, the pill follows.
    if (current?.isConnected) place(current)
    else rest()
  }

  onMounted(() => {
    const root = container.value
    if (!root) return

    rest()
    requestAnimationFrame(() => root.setAttribute('data-glide-ready', ''))

    // A late webfont changes every label's width, and with it the pill's.
    document.fonts?.ready.then(onResize)

    root.addEventListener('pointerover', onOver, { passive: true })
    root.addEventListener('pointerleave', onLeave, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
  })

  onUnmounted(() => {
    const root = container.value
    root?.removeEventListener('pointerover', onOver)
    root?.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('resize', onResize)
  })

  /** For when the row changes under us — a navigation moves the resting place. */
  return { refresh: rest }
}

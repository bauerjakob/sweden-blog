import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * The gentlest possible parallax: elements marked [data-parallax] drift a few
 * pixels against the scroll. Amplitude is deliberately tiny — nothing bounces,
 * nothing spins. Fully disabled under prefers-reduced-motion.
 */
export function useParallax(container: Ref<HTMLElement | null>, maxShift = 14) {
  let raf = 0
  let ticking = false
  let els: HTMLElement[] = []

  function apply() {
    ticking = false
    const mid = window.innerHeight / 2
    for (const el of els) {
      const r = el.getBoundingClientRect()
      const center = r.top + r.height / 2
      const rel = (center - mid) / window.innerHeight // ~ -1 .. 1
      const shift = Math.max(-1, Math.min(1, rel)) * -maxShift
      el.style.setProperty('--parallax', `${shift.toFixed(1)}px`)
    }
  }

  function onScroll() {
    if (ticking) return
    ticking = true
    raf = requestAnimationFrame(apply)
  }

  onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const host = container.value
    if (!host) return
    els = [...host.querySelectorAll<HTMLElement>('[data-parallax]')]
    if (!els.length) return
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    cancelAnimationFrame(raf)
  })
}

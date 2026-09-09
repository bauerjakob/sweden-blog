import { onMounted, onUnmounted } from 'vue'

/**
 * Reveal-on-scroll, honestly optional. Elements carrying the `.reveal` class
 * get `.is-in` when they enter the viewport. Under prefers-reduced-motion the
 * CSS already neutralises `.reveal`, and we skip the observer entirely so
 * nothing depends on it.
 */
export function useReveal(root: () => HTMLElement | null) {
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const container = root()
    if (reduce || !container || !('IntersectionObserver' in window)) {
      container?.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'))
      return
    }

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

    container.querySelectorAll('.reveal').forEach((el) => observer!.observe(el))
  })

  onUnmounted(() => observer?.disconnect())
}

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { isLoggedIn, logout } from '@/stores/auth'
import { useHeaderScroll } from '@/composables/useHeaderScroll'
import { useGlidingHighlight } from '@/composables/useGlidingHighlight'
import { usePointerGlow } from '@/composables/usePointerGlow'

const router = useRouter()
const route = useRoute()

const menuOpen = ref(false)
const bar = ref<HTMLElement | null>(null)

// The bar never slides away while the menu is hanging off it. It hands itself
// in so the title handoff can measure against the bar's real height.
const { condensed, hidden, brandIn, refresh: refreshBrand } = useHeaderScroll(
  () => menuOpen.value,
  bar,
)

// Below this the title is invisible anyway, so it may as well be gone: out of
// the tab order, out of the accessibility tree.
const brandLive = computed(() => brandIn.value > 0.02)

const pane = ref<HTMLElement | null>(null)
const navRow = ref<HTMLElement | null>(null)

// The glass catches the light where the pointer is...
usePointerGlow(pane)
// ...and one pill walks the nav, resting on whichever page you are reading.
const { refresh: refreshHighlight } = useGlidingHighlight(
  navRow,
  '.nav__link',
  '.router-link-exact-active',
)

// Navigating is the end of the menu's job, moves the pill's resting place, and
// hands the bar a new page — whose title, or lack of one, it has to re-measure.
watch(() => route.fullPath, async () => {
  menuOpen.value = false
  await nextTick()
  refreshHighlight()
  refreshBrand()
})

async function onLogout() {
  menuOpen.value = false
  await logout()
  router.push('/')
}
</script>

<template>
  <header
    ref="bar"
    class="masthead"
    :class="{
      'is-condensed': condensed,
      'is-hidden': hidden,
      'is-open': menuOpen,
      'is-brand-live': brandLive,
    }"
    :style="{ '--brand-in': brandIn }"
  >
    <div class="masthead__pane" ref="pane">
      <div class="masthead__inner">
        <RouterLink
          to="/"
          class="brand tap"
          aria-label="Home — the timeline"
          :aria-hidden="!brandLive"
          :tabindex="brandLive ? undefined : -1"
        >
          <span class="brand__title font-display">My semester in Stockholm</span>
        </RouterLink>

        <nav class="nav nav--inline" ref="navRow" aria-label="Primary">
          <span class="nav__pill" aria-hidden="true"></span>
          <RouterLink to="/" class="nav__link">Timeline</RouterLink>
          <RouterLink to="/about" class="nav__link">About</RouterLink>
          <template v-if="isLoggedIn">
            <RouterLink to="/new" class="nav__link nav__link--accent">＋ New</RouterLink>
            <button type="button" class="nav__link nav__btn" @click="onLogout">Sign out</button>
          </template>
        </nav>

        <button
          type="button"
          class="burger tap"
          :aria-expanded="menuOpen"
          aria-controls="site-menu"
          :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
          @click="menuOpen = !menuOpen"
        >
          <span class="burger__box" aria-hidden="true">
            <span class="burger__bar"></span>
            <span class="burger__bar"></span>
          </span>
        </button>
      </div>
    </div>

    <Transition name="sheet">
      <nav v-show="menuOpen" id="site-menu" class="sheet glass" aria-label="Primary">
        <RouterLink to="/" class="sheet__link tap" style="--i: 0">Timeline</RouterLink>
        <RouterLink to="/about" class="sheet__link tap" style="--i: 1">About</RouterLink>
        <template v-if="isLoggedIn">
          <RouterLink to="/new" class="sheet__link sheet__link--accent tap" style="--i: 2">
            ＋ New entry
          </RouterLink>
          <button type="button" class="sheet__link sheet__btn tap" style="--i: 3" @click="onLogout">
            Sign out
          </button>
        </template>
      </nav>
    </Transition>
  </header>
</template>

<style scoped>
/*
  The bar spans the full width of the window at every scroll position — only
  its *material* changes. At the very top there is nothing behind it but the
  page colour it is already made of, so it carries no background at all: the
  links simply sit on the page. The moment content starts passing underneath,
  a pane of liquid glass fades in behind them, built from the ambient --scene-*
  palette — smoked petrol over a winter entry, frosted white over a summer one.
  Its text uses --scene-ink for the same reason: on a bleached June scene the
  labels go dark rather than staying pale and unreadable.
*/
.masthead {
  position: sticky;
  top: 0;
  z-index: 40;
  transition: transform 380ms var(--ease-out);
}

.masthead__pane {
  position: relative;
  /* Resting state: no tint, no edge, no blur. Every one of these is a property
     that animates, so the glass can arrive rather than pop. */
  background: color-mix(in srgb, var(--scene-page) 0%, transparent);
  border-bottom: 1px solid transparent;
  backdrop-filter: blur(0px) saturate(100%);
  transition:
    background-color 260ms linear,
    border-color 260ms linear,
    backdrop-filter 260ms var(--ease-quick);
}

/*
  The light in the glass. Two pools ride under the pointer: a wide warm bloom
  in the site's ochre, and a tighter white specular core inside it. Both are
  painted *over* the blurred pane and under the labels, and both are held back
  until the glass itself is there — at the top of the page there is no material
  for a reflection to live in, so lighting it would just be a smear following
  the mouse across the page. usePointerGlow eases --glow-x/--glow-y; --glow is
  the on/off, which is why the arrival and departure can be a soft fade.
*/
.masthead__pane::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background:
    radial-gradient(
      9rem 5rem at var(--glow-x, 50%) var(--glow-y, 50%),
      rgb(255 255 255 / 0.1),
      transparent 70%
    ),
    radial-gradient(
      24rem 12rem at var(--glow-x, 50%) var(--glow-y, 50%),
      color-mix(in srgb, var(--color-ochre-bright) 14%, transparent),
      transparent 72%
    );
  transition: opacity 420ms var(--ease-quick);
}
.masthead.is-condensed .masthead__pane::before {
  opacity: var(--glow, 0);
}

/* ...and the bottom edge picks it up: a bright spot travelling along the
   hairline, which is what sells the edge as glass rather than as a border. */
.masthead__pane::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(
    7rem 1px at var(--glow-x, 50%) 50%,
    color-mix(in srgb, var(--color-ochre-bright) 65%, transparent),
    transparent 100%
  );
  transition: opacity 420ms var(--ease-quick);
}
.masthead.is-condensed .masthead__pane::after {
  opacity: var(--glow, 0);
}

.masthead__inner {
  position: relative;
  max-width: 72rem;
  margin: 0 auto;
  padding: 0.55rem clamp(1rem, 4vw, 2rem);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

/* Scrolled: the glass fades in. A dark photo sliding behind a sheer bar drags
   the contrast of the labels down, so the tint arrives exactly when there is
   something behind it to hide. */
.masthead.is-condensed .masthead__pane {
  background: var(--glass-tint-strong);
  border-bottom-color: var(--glass-hairline);
  backdrop-filter: var(--glass-blur);
}

/* Brand — a handoff, not a fade-in. The page prints this same sentence as its
   title directly below, so the bar takes it over only once the page has let go
   of it: --brand-in is written by useHeaderScroll straight from the measured
   position of the title itself, and does not leave 0 until that title is all
   but gone under the bar. The two are never legible at the same moment.

   Deliberately no CSS transition here — the scroll *is* the timeline, and a
   transition layered on top would only lag behind the reader's thumb.
   `visibility` is switched separately, below the point where anything can be
   read, to keep the link out of the tab order until it is really there. */
.brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: var(--scene-ink);
  min-width: 0;
  opacity: var(--brand-in, 0);
  transform: translateY(calc((1 - var(--brand-in, 0)) * -0.5rem));
  visibility: hidden;
}
.masthead.is-brand-live .brand {
  visibility: visible;
}
.brand__title {
  font-size: 1.02rem;
  line-height: 1.15;
  font-variation-settings: 'opsz' 40, 'wght' 560, 'SOFT' 0;
  color: var(--scene-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Inline nav (wide screens) */
.nav {
  position: relative;
  display: flex;
  gap: 0.25rem;
}

/* One pill for the whole row, moved by useGlidingHighlight. It rests under the
   page you are on and slides to whatever you point at, so the row behaves like
   a single control instead of four buttons lighting up independently. The
   transition is withheld until [data-glide-ready] so it doesn't fly in from the
   left edge on the first paint. */
.nav__pill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--hl-w, 0px);
  transform: translate3d(var(--hl-x, 0px), 0, 0);
  opacity: var(--hl-o, 0);
  border-radius: var(--r-pill);
  background: color-mix(in srgb, var(--scene-ink) 9%, transparent);
  box-shadow:
    inset 0 1px 0 var(--glass-spec),
    inset 0 0 0 1px color-mix(in srgb, var(--scene-ink) 7%, transparent);
  pointer-events: none;
}
.nav[data-glide-ready] .nav__pill {
  transition:
    transform 420ms var(--ease-spring),
    width 420ms var(--ease-out),
    opacity 220ms var(--ease-quick);
}

.nav__link {
  position: relative;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--scene-ink-muted);
  text-decoration: none;
  padding: 0.4rem 0.8rem;
  border-radius: var(--r-pill);
  transition:
    color 200ms var(--ease-quick),
    transform 260ms var(--ease-spring);
}
.nav__link.router-link-exact-active {
  color: var(--scene-ink);
}
.nav__btn {
  font: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
}
.nav__link--accent {
  color: var(--color-ochre-bright);
}

/* Menu button (narrow screens) */
.burger {
  display: none;
  background: transparent;
  border: none;
  padding: 0.5rem;
  margin: -0.5rem;
  cursor: pointer;
  color: var(--scene-ink);
  border-radius: var(--r-pill);
  transition: background-color 220ms var(--ease-quick);
}
.burger__box {
  display: block;
  position: relative;
  width: 22px;
  height: 14px;
}
.burger__bar {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  border-radius: var(--r-pill);
  background: currentColor;
  transition: transform 360ms var(--ease-spring);
}
.burger__bar:nth-child(1) {
  top: 2px;
}
.burger__bar:nth-child(2) {
  bottom: 2px;
}
/* Two bars fold into an X — no third bar to fade out awkwardly. */
.masthead.is-open .burger__bar:nth-child(1) {
  transform: translateY(5px) rotate(45deg);
}
.masthead.is-open .burger__bar:nth-child(2) {
  transform: translateY(-5px) rotate(-45deg);
}

/*
  Hover proper. Gated on a real pointer: on a touch screen :hover latches after
  a tap and the label would stay lit long after you had moved on.
*/
@media (hover: hover) {
  .nav__link:hover {
    color: var(--scene-ink);
    transform: translateY(-1px);
  }
  .burger:hover {
    background: color-mix(in srgb, var(--scene-ink) 9%, transparent);
  }
}

/* Menu sheet */
.sheet {
  max-width: min(72rem, calc(100% - 2 * clamp(0.6rem, 3vw, 1.25rem)));
  margin: 0.5rem auto 0;
  padding: 0.5rem;
  border-radius: var(--r-lg);
  display: flex;
  flex-direction: column;
  transform-origin: top center;
}
.sheet__link {
  display: block;
  padding: 0.85rem 1rem;
  border-radius: var(--r-md);
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  color: var(--scene-ink);
  text-decoration: none;
  background: transparent;
  border: none;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  /* Each row arrives just after the one above it. */
  transition:
    opacity 320ms var(--ease-out),
    transform 380ms var(--ease-out),
    background-color 180ms var(--ease-quick);
}
.sheet__link + .sheet__link {
  border-top: 1px solid color-mix(in srgb, var(--scene-ink) 8%, transparent);
}
.sheet__link.router-link-exact-active {
  color: var(--color-ochre-bright);
}
.sheet__link--accent {
  color: var(--color-ochre-bright);
}

/* The sheet scales down into the bar it belongs to, and its rows stagger. */
.sheet-enter-active,
.sheet-leave-active {
  transition:
    opacity 260ms var(--ease-quick),
    transform 360ms var(--ease-out);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.94);
}
.sheet-enter-from .sheet__link,
.sheet-leave-to .sheet__link {
  opacity: 0;
  transform: translateY(-6px);
}
.sheet-enter-active .sheet__link {
  transition-delay: calc(var(--i, 0) * 45ms);
}

@media (max-width: 39.99rem) {
  .nav--inline {
    display: none;
  }
  .burger {
    display: block;
  }
  /* On a phone the bar is a real slice of the screen, so it gets out of the
     way when you scroll down and comes back the moment you scroll up. */
  .masthead.is-hidden {
    transform: translateY(-115%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .masthead,
  .masthead__pane,
  .masthead__inner,
  .brand,
  .burger__bar,
  .nav__pill,
  .nav[data-glide-ready] .nav__pill,
  .sheet__link {
    transition: none;
  }
  .masthead.is-hidden {
    transform: none;
  }
  /* The pill still marks the page and still follows the pointer — it just
     arrives there instead of travelling. Nothing else shifts position: the
     brand still fades with the scroll, it just no longer slides in. */
  .nav__link:hover,
  .brand {
    transform: none;
  }
}
</style>

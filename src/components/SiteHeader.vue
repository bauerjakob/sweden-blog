<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { isLoggedIn, logout } from '@/stores/auth'

const router = useRouter()

async function onLogout() {
  await logout()
  router.push('/')
}
</script>

<template>
  <header class="masthead">
    <div class="masthead__inner">
      <RouterLink to="/" class="brand" aria-label="Home — the timeline">
        <span class="brand__mark" aria-hidden="true"></span>
        <span class="brand__text">
          <span class="brand__sv font-display">Ett halvår i Sverige</span>
          <span class="brand__en">a semester in Sweden</span>
        </span>
      </RouterLink>
      <nav class="nav" aria-label="Primary">
        <RouterLink to="/" class="nav__link">Timeline</RouterLink>
        <RouterLink to="/about" class="nav__link">About</RouterLink>
        <template v-if="isLoggedIn">
          <RouterLink to="/new" class="nav__link nav__link--accent">＋ New</RouterLink>
          <button type="button" class="nav__link nav__btn" @click="onLogout">Sign out</button>
        </template>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.masthead {
  position: sticky;
  top: 0;
  z-index: 30;
  background: rgba(12, 22, 28, 0.72);
  backdrop-filter: blur(10px) saturate(1.1);
  -webkit-backdrop-filter: blur(10px) saturate(1.1);
  border-bottom: 1px solid rgba(242, 237, 225, 0.1);
}
.masthead__inner {
  max-width: 72rem;
  margin: 0 auto;
  padding: 0.55rem clamp(1rem, 4vw, 2rem);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  color: #f4efe4;
}
.brand__mark {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  flex: none;
  background: radial-gradient(circle at 50% 45%, var(--color-ochre-bright), var(--color-ochre) 70%);
  box-shadow: 0 0 0 4px rgba(207, 124, 38, 0.16);
}
.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}
.brand__sv {
  font-size: 1.02rem;
  font-variation-settings: 'opsz' 40, 'wght' 560, 'SOFT' 0;
  color: #f4efe4;
}
.brand__en {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(242, 237, 225, 0.55);
}
.nav {
  display: flex;
  gap: 0.4rem;
}
.nav__link {
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(242, 237, 225, 0.75);
  text-decoration: none;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
}
.nav__link:hover {
  color: #f4efe4;
  background: rgba(242, 237, 225, 0.08);
}
.nav__link.router-link-exact-active {
  color: var(--color-ochre-bright);
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
@media (max-width: 420px) {
  .brand__en {
    display: none;
  }
}
</style>

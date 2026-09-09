<script setup lang="ts">
import { RouterLink } from 'vue-router'
const year = new Date().getFullYear()
</script>

<template>
  <footer class="foot">
    <div class="foot__inner">
      <p class="foot__line">
        A photo journal from an exchange semester in Göteborg.
      </p>
      <nav class="foot__nav" aria-label="Footer">
        <RouterLink to="/">Timeline</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
      <p class="foot__fine">Made by hand · {{ year }}. No trackers, no cookies, nothing counted.</p>
    </div>
  </footer>
</template>

<style scoped>
.foot {
  margin-top: 4rem;
  border-top: 1px solid rgba(160, 170, 175, 0.18);
  background: rgba(10, 18, 24, 0.55);
}
.foot__inner {
  max-width: 72rem;
  margin: 0 auto;
  padding: 2.5rem clamp(1rem, 4vw, 2rem) 3.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: #cfd8d9;
}
.foot__line {
  font-family: var(--font-display);
  font-variation-settings: 'opsz' 40, 'wght' 480;
  font-size: 1.2rem;
  margin: 0;
  color: #f4efe4;
  max-width: 30ch;
}
.foot__nav {
  display: flex;
  gap: 1.2rem;
}
.foot__nav a {
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #cfd8d9;
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.foot__nav a:hover {
  border-bottom-color: var(--color-ochre);
}
.foot__fine {
  font-size: 0.75rem;
  color: rgba(207, 216, 217, 0.6);
  margin: 0;
}
</style>

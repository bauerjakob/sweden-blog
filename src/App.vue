<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import { useContent, loadEntries } from '@/content/store'
import { isLoggedIn } from '@/stores/auth'

const { loaded, error } = useContent()

// Session is already restored in main.ts before mount; just load the timeline.
onMounted(() => loadEntries(isLoggedIn.value))
</script>

<template>
  <a href="#main" class="skip-link">Skip to the timeline</a>
  <SiteHeader />
  <main id="main">
    <div v-if="!loaded && !error" class="boot" aria-live="polite">
      <span class="boot__mark" aria-hidden="true"></span>
      <span class="boot__text">Loading the semester…</span>
    </div>
    <div v-else-if="error" class="boot boot--error" role="alert">
      <p>Couldn't load the journal.</p>
      <p class="boot__detail">{{ error }}</p>
    </div>
    <RouterView v-else v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </main>
  <SiteFooter />
</template>

<style scoped>
main {
  min-height: 60vh;
}
.boot {
  max-width: 72rem;
  margin: 0 auto;
  padding: 6rem clamp(1rem, 4vw, 2rem);
  display: flex;
  align-items: center;
  gap: 0.9rem;
  color: var(--day-ink-muted, #adc0c4);
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}
.boot__mark {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: radial-gradient(circle at 50% 45%, var(--color-ochre-bright), var(--color-ochre) 70%);
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .boot__mark { animation: none; }
}
.boot--error {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  color: #f2ede1;
}
.boot__detail {
  color: var(--color-ochre-bright);
  font-size: 0.85rem;
}
.page-enter-active,
.page-leave-active {
  transition: opacity 260ms ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>

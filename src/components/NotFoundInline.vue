<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { publicEntries } from '@/content/store'
import { fullDate, weekday, dayNum, monthShort } from '@/lib/format'

const recent = computed(() => publicEntries.value.slice(0, 4))
</script>

<template>
  <section class="nf">
    <p class="nf__eyebrow">Nothing here</p>
    <h1 class="nf__title font-display">This page went<br />quiet</h1>
    <p class="nf__lead">
      The link may be old, or mistyped. Nothing is lost — here's where you were
      probably heading.
    </p>

    <div class="nf__actions">
      <RouterLink to="/" class="nf__btn">← Back to the timeline</RouterLink>
      <RouterLink to="/about" class="nf__btn nf__btn--ghost">About this site</RouterLink>
    </div>

    <div class="nf__recent">
      <p class="nf__recent-label">Latest entries</p>
      <ul>
        <li v-for="e in recent" :key="e.slug">
          <RouterLink :to="`/entry/${e.slug}`">
            <span class="nf__recent-date">
              {{ weekday(e.date) }} {{ dayNum(e.date) }} {{ monthShort(e.date) }}
            </span>
            <span class="nf__recent-title">{{ e.title ?? fullDate(e.date) }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.nf {
  max-width: 44rem;
  margin: 0 auto;
  padding: clamp(2rem, 8vw, 5rem) clamp(1rem, 4vw, 2rem) 4rem;
  /* Its own fixed mood — a calm late-dusk petrol. */
  --day-ink: #f2ede1;
  --day-ink-muted: #adc0c4;
  --day-hairline: rgba(242, 237, 225, 0.16);
  --day-accent: var(--color-ochre);
}
.nf__eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  margin: 0 0 1rem;
}
.nf__title {
  font-size: clamp(2.6rem, 10vw, 5rem);
  line-height: 0.95;
  color: var(--day-ink);
  margin: 0 0 1.3rem;
}
.nf__lead {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--day-ink);
  max-width: 40ch;
  margin: 0 0 2rem;
}
.nf__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 3rem;
}
.nf__btn {
  display: inline-block;
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  text-decoration: none;
  font-size: 0.9rem;
  background: var(--color-ochre);
  color: #1a1206;
  font-weight: 600;
}
.nf__btn--ghost {
  background: transparent;
  color: var(--day-ink);
  border: 1px solid var(--day-hairline);
}
.nf__btn:hover {
  filter: brightness(1.06);
}
.nf__recent-label {
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  margin: 0 0 0.75rem;
  border-top: 1px solid var(--day-hairline);
  padding-top: 1.25rem;
}
.nf__recent ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.nf__recent li + li {
  border-top: 1px solid var(--day-hairline);
}
.nf__recent a {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.75rem 0;
  text-decoration: none;
  color: var(--day-ink);
}
.nf__recent-date {
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
}
.nf__recent-title {
  font-family: var(--font-display);
  font-variation-settings: 'opsz' 40, 'wght' 500;
  font-size: 1.1rem;
}
.nf__recent a:hover .nf__recent-title {
  text-decoration: underline;
  text-decoration-color: var(--day-accent);
  text-underline-offset: 3px;
}
</style>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { applyDocumentMeta } from '@/composables/useDocumentMeta'
import { keepScene } from '@/composables/useAmbientDaylight'
import { publicEntries } from '@/content/store'
import { loadAbout, useAbout } from '@/content/about'
import { isLoggedIn } from '@/stores/auth'

// No mood of its own: About keeps whatever scene the timeline left behind, so
// tapping the tab doesn't repaint the site. Opened cold, it comes up light.
const fallbackScene = { '--day-scheme': 'light' }

const router = useRouter()
const { about, loading, error } = useAbout()

const count = computed(() => publicEntries.value.length)

// The heading is plain text the owner types; a line break there is a line break
// here. Splitting keeps it out of v-html.
const titleLines = computed(() => (about.value?.title ?? '').split('\n'))

/*
  One token, {{count}}, so the copy can say how many entries there are without
  the owner having to come back and correct the number. Substituted after
  Markdown rendering, in the HTML the server produced.
*/
const bodyHtml = computed(() =>
  (about.value?.bodyHtml ?? '').replace(/\{\{\s*count\s*\}\}/g, String(count.value)),
)

onMounted(async () => {
  keepScene(fallbackScene)
  await loadAbout()
  applyDocumentMeta({
    title: `${titleLines.value.join(' ') || 'About'} — Ett halvår i Sverige`,
    description:
      about.value?.excerpt ||
      'Who I am, where I am, and why this site exists: a photo journal from an exchange semester in Stockholm.',
    type: 'website',
  })
})

/*
  The body is authored Markdown, so a link to another page of this site arrives
  as a plain <a> that would reload the whole app. Catch those and hand them to
  the router instead, leaving modified clicks and external links alone.
*/
function onProseClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const link = (e.target as HTMLElement | null)?.closest('a')
  if (!link || link.target === '_blank') return
  const href = link.getAttribute('href')
  if (!href || !href.startsWith('/')) return
  e.preventDefault()
  router.push(href)
}
</script>

<template>
  <div class="about">
    <div class="about__inner">
      <div class="about__topline">
        <p class="about__eyebrow">About</p>
        <RouterLink v-if="isLoggedIn" to="/about/edit" class="about__edit">Edit</RouterLink>
      </div>

      <p v-if="loading && !about" class="about__status" aria-live="polite">Loading…</p>
      <p v-else-if="error && !about" class="about__status" role="alert">{{ error }}</p>

      <template v-else-if="about">
        <h1 class="about__title font-display">
          <template v-for="(line, i) in titleLines" :key="i">
            <br v-if="i > 0" />{{ line }}
          </template>
        </h1>

        <!-- Markdown rendered on the server, where HTML in the source is off. -->
        <div class="about__prose prose-journal" @click="onProseClick" v-html="bodyHtml"></div>
      </template>

      <template v-else>
        <h1 class="about__title font-display">Nothing<br />here yet</h1>
        <p class="about__status">
          <template v-if="isLoggedIn">
            This page has no text yet.
            <RouterLink to="/about/edit">Write it</RouterLink>.
          </template>
          <template v-else>There's nothing on this page yet.</template>
        </p>
      </template>

      <RouterLink to="/" class="about__back">← To the timeline</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.about {
  /* Text on the page itself, not on a panel — so it follows the inherited
     scene rather than assuming a dark one. */
  --day-ink: var(--scene-ink);
  --day-ink-muted: var(--scene-ink-muted);
  --day-hairline: color-mix(in srgb, var(--scene-ink) 16%, transparent);
  --day-accent: var(--color-ochre);
  max-width: 48rem;
  margin: 0 auto;
  padding: clamp(2rem, 7vw, 4.5rem) clamp(1rem, 4vw, 2rem) 4rem;
}
.about__topline {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 1rem;
}
.about__eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  margin: 0;
}
.about__edit {
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #1a1206;
  background: var(--color-ochre);
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 600;
}
.about__status {
  color: var(--day-ink-muted);
}
.about__title {
  font-size: clamp(2.8rem, 11vw, 5.5rem);
  line-height: 0.92;
  color: var(--day-ink);
  margin: 0 0 2rem;
}
.about__prose {
  color: var(--day-ink);
  max-width: 60ch;
}
.about__prose :deep(strong) {
  color: var(--day-ink);
  font-weight: 600;
}
.about__back {
  display: inline-block;
  margin-top: 2.5rem;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  text-decoration: none;
}
.about__back:hover {
  color: var(--day-ink);
}
</style>

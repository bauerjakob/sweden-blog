<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { publicEntries, apiToEntry } from '@/content/store'
import { api } from '@/api/client'
import type { Entry } from '@/content/types'
import { dayNum, weekday, monthShort, fullDate } from '@/lib/format'
import { applyDocumentMeta } from '@/composables/useDocumentMeta'
import { setSceneVars } from '@/composables/useAmbientDaylight'
import { isLoggedIn } from '@/stores/auth'
import { deleteAndRemove } from '@/content/mutations'
import { useReveal } from '@/composables/useReveal'
import { useParallax } from '@/composables/useParallax'
import DaylightGauge from '@/components/DaylightGauge.vue'
import PhotoFigure from '@/components/PhotoFigure.vue'
import NotFoundInline from '@/components/NotFoundInline.vue'

const props = defineProps<{ slug: string }>()
const router = useRouter()

const root = ref<HTMLElement | null>(null)
const entry = ref<Entry | null>(null)
const loading = ref(true)
const deleting = ref(false)
const confirmingDelete = ref(false)

// Chronological neighbours among *public* entries only, so an unlisted entry
// never leaks into anyone's prev/next.
const neighbours = computed(() => {
  const e = entry.value
  const list = publicEntries.value
  if (!e || e.unlisted) return { newer: undefined, older: undefined }
  const i = list.findIndex((x) => x.slug === e.slug)
  return {
    newer: i > 0 ? list[i - 1] : undefined,
    older: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined,
  }
})

const year = computed(() => entry.value?.date.getFullYear())

async function loadEntry(slug: string) {
  loading.value = true
  try {
    const { entry: a } = await api.getEntry(slug)
    entry.value = apiToEntry(a)
    const e = entry.value
    setSceneVars(e.daylight.vars)
    const label = e.title ?? `${weekday(e.date)}, ${dayNum(e.date)} ${monthShort(e.date)}`
    applyDocumentMeta({
      title: `${label} — Ett halvår i Sverige`,
      description: e.excerpt || `A note from ${e.location ?? 'Sweden'}.`,
      image: e.photos[0]?.url,
      type: 'article',
    })
  } catch {
    entry.value = null
    applyDocumentMeta({
      title: 'Not found — Ett halvår i Sverige',
      description: 'This entry could not be found.',
    })
  } finally {
    loading.value = false
  }
}

const deleteError = ref<string | null>(null)

async function onDelete() {
  const e = entry.value
  if (!e) return
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    return
  }
  deleting.value = true
  deleteError.value = null
  try {
    await deleteAndRemove(e.slug)
    router.push('/')
  } catch (err) {
    deleteError.value = (err as Error).message
    deleting.value = false
    confirmingDelete.value = false
  }
}

watch(() => props.slug, (s) => loadEntry(s), { immediate: true })

useReveal(() => root.value)
useParallax(root)
</script>

<template>
  <div ref="root">
    <div v-if="loading" class="loading" aria-live="polite">Loading…</div>

    <NotFoundInline v-else-if="!entry" />

    <article v-else class="entry-page" :style="entry.daylight.vars">
      <div class="topbar">
        <RouterLink to="/" class="back">
          <span aria-hidden="true">←</span> The timeline
        </RouterLink>
        <div v-if="isLoggedIn" class="owner">
          <RouterLink :to="`/entry/${entry.slug}/edit`" class="owner__edit">Edit</RouterLink>
          <button
            type="button"
            class="owner__del"
            :class="{ 'is-armed': confirmingDelete }"
            :disabled="deleting"
            @click="onDelete"
            @blur="confirmingDelete = false"
          >
            {{ deleting ? 'Deleting…' : confirmingDelete ? 'Really delete?' : 'Delete' }}
          </button>
        </div>
      </div>
      <p v-if="deleteError" class="owner__error" role="alert">{{ deleteError }}</p>

      <header class="head">
        <p v-if="entry.location" class="head__loc">{{ entry.location }}</p>
        <div class="head__date">
          <span class="head__day font-display">{{ dayNum(entry.date) }}</span>
          <span class="head__my font-display-tight">{{ monthShort(entry.date) }} {{ year }}</span>
        </div>
        <p class="head__weekday">{{ weekday(entry.date) }}</p>
        <h1 v-if="entry.title" class="head__title font-display">{{ entry.title }}</h1>
        <div class="head__daylight">
          <DaylightGauge :info="entry.daylight" />
        </div>
        <p v-if="entry.unlisted" class="head__unlisted">
          Unlisted · shareable by link, hidden from the timeline
        </p>
      </header>

      <PhotoFigure
        v-if="entry.photos[0]"
        class="lead"
        :photo="entry.photos[0]"
        :priority="true"
        sizes="(min-width: 1000px) 900px, 100vw"
        data-parallax
      />

      <div
        v-if="entry.hasBody"
        class="body prose-journal"
        v-html="entry.bodyHtml"
      ></div>

      <div v-if="entry.photos.length > 1" class="gallery">
        <PhotoFigure
          v-for="p in entry.photos.slice(1)"
          :key="p.src"
          class="gallery__item reveal"
          :photo="p"
          sizes="(min-width: 1000px) 860px, 100vw"
          data-parallax
        />
      </div>

      <ul v-if="entry.tags.length" class="tags">
        <li v-for="t in entry.tags" :key="t">
          <RouterLink :to="`/tags/${t}`" class="tag">{{ t }}</RouterLink>
        </li>
      </ul>

      <nav class="neighbours" aria-label="More entries">
        <RouterLink
          v-if="neighbours.older"
          :to="`/entry/${neighbours.older.slug}`"
          class="neighbours__link neighbours__link--prev"
        >
          <span class="neighbours__dir">Earlier</span>
          <span class="neighbours__label">{{ neighbours.older.title ?? fullDate(neighbours.older.date) }}</span>
        </RouterLink>
        <span v-else></span>
        <RouterLink
          v-if="neighbours.newer"
          :to="`/entry/${neighbours.newer.slug}`"
          class="neighbours__link neighbours__link--next"
        >
          <span class="neighbours__dir">Later</span>
          <span class="neighbours__label">{{ neighbours.newer.title ?? fullDate(neighbours.newer.date) }}</span>
        </RouterLink>
        <span v-else></span>
      </nav>
    </article>
  </div>
</template>

<style scoped>
.entry-page {
  max-width: 54rem;
  margin: 0 auto;
  padding: 1.5rem clamp(1rem, 4vw, 2rem) 2rem;
}

.loading {
  max-width: 54rem;
  margin: 0 auto;
  padding: 5rem clamp(1rem, 4vw, 2rem);
  color: var(--day-ink-muted, #adc0c4);
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0.5rem 0 2rem;
}
.back {
  display: inline-block;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  text-decoration: none;
}
.back:hover {
  color: var(--day-ink);
}
.owner {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}
.owner__edit {
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
.owner__del {
  font: inherit;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  background: transparent;
  border: 1px solid var(--day-hairline);
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  cursor: pointer;
}
.owner__del.is-armed {
  color: #fff;
  background: #b23b3b;
  border-color: #b23b3b;
}
.owner__error {
  max-width: 54rem;
  margin: -1rem auto 1.5rem;
  color: #e0954a;
}

/* Header — the date is the biggest thing on the page. */
.head {
  margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
}
.head__loc {
  font-size: 0.8rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  margin: 0 0 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.head__loc::before {
  content: '';
  width: 1.8rem;
  height: 1px;
  background: var(--day-accent);
}
.head__date {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}
.head__day {
  font-size: clamp(4.5rem, 20vw, 11rem);
  line-height: 0.82;
  color: var(--day-ink);
  font-variant-numeric: tabular-nums;
}
.head__my {
  font-size: clamp(1.2rem, 4vw, 1.9rem);
  color: var(--day-ink-muted);
  letter-spacing: 0;
}
.head__weekday {
  font-family: var(--font-display);
  font-variation-settings: 'opsz' 40, 'wght' 480;
  font-size: 1.15rem;
  color: var(--day-ink);
  margin: 0.5rem 0 0;
}
.head__title {
  font-size: clamp(1.8rem, 6vw, 3.2rem);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--day-ink);
  margin: 1.2rem 0 0;
  max-width: 20ch;
  font-variation-settings: 'opsz' 144, 'SOFT' 40, 'WONK' 1, 'wght' 440;
}
.head__daylight {
  margin-top: 1.5rem;
}
.head__unlisted {
  margin-top: 1.25rem;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: var(--day-ink);
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border: 1px dashed var(--day-accent);
  border-radius: 999px;
}

/* Lead photo can push into the margins a touch. */
.lead {
  margin: 0 clamp(-2rem, -4vw, 0rem) clamp(1.5rem, 4vw, 2.5rem);
}
.lead :deep(.figure__img) {
  transform: translateY(var(--parallax, 0));
  transition: transform 80ms linear;
  border-radius: 4px;
}

.body {
  margin: 0 auto clamp(1.5rem, 5vw, 3rem);
}

.gallery {
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 4vw, 2.5rem);
  margin-bottom: 2.5rem;
}
.gallery__item :deep(.figure__img) {
  transform: translateY(var(--parallax, 0));
  transition: transform 80ms linear;
}
/* Alternate the additional photos left/right for a little asymmetry. */
.gallery__item:nth-child(even) {
  margin-left: clamp(0rem, 8vw, 5rem);
}
.gallery__item:nth-child(odd) {
  margin-right: clamp(0rem, 8vw, 5rem);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  list-style: none;
  padding: 0;
  margin: 0 0 2.5rem;
}
.tag {
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  color: var(--day-ink-muted);
  text-decoration: none;
  padding: 0.2rem 0.65rem;
  border: 1px solid var(--day-hairline);
  border-radius: 999px;
}
.tag::before {
  content: '#';
  opacity: 0.6;
}
.tag:hover {
  color: var(--day-ink);
  border-color: var(--day-accent);
}

.neighbours {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  border-top: 1px solid var(--day-hairline);
  padding-top: 1.5rem;
}
.neighbours__link {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-decoration: none;
  color: var(--day-ink);
  padding: 0.75rem;
  border-radius: 4px;
}
.neighbours__link:hover {
  background: var(--day-hairline);
}
.neighbours__link--next {
  text-align: right;
  align-items: flex-end;
}
.neighbours__dir {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--day-accent);
}
.neighbours__label {
  font-family: var(--font-display);
  font-variation-settings: 'opsz' 40, 'wght' 500;
  font-size: 1.05rem;
  line-height: 1.2;
}
</style>

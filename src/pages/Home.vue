<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { publicEntries, allLoaded, groupByMonth } from '@/content/store'
import { isLoggedIn } from '@/stores/auth'
import { useReveal } from '@/composables/useReveal'
import { useAmbientDaylight, setSceneVars } from '@/composables/useAmbientDaylight'
import { useDocumentMeta } from '@/composables/useDocumentMeta'
import MonthMarker from '@/components/MonthMarker.vue'
import EntryCard from '@/components/EntryCard.vue'

const root = ref<HTMLElement | null>(null)
// The owner sees unlisted entries in the timeline too (badged), so they can find
// and edit them; everyone else sees only the public entries.
const entries = computed(() => (isLoggedIn.value ? allLoaded.value : publicEntries.value))
const groups = computed(() => groupByMonth(entries.value))
const first = computed(() => entries.value[0])

// A running index across all entries so alternating alignment is continuous
// across month boundaries, not reset per month.
const indexOf = computed(() => new Map(entries.value.map((e, i) => [e.slug, i])))

const darkest = computed(() =>
  entries.value.reduce((a, b) => (b.daylight.hours < a.daylight.hours ? b : a)),
)
const brightest = computed(() =>
  entries.value.reduce((a, b) => (b.daylight.hours > a.daylight.hours ? b : a)),
)

useDocumentMeta({
  title: 'Ett halvår i Sverige — a semester in Sweden',
  description:
    'A photo journal from an exchange semester in Göteborg. A photo and a few sentences at a time, newest first.',
})

onMounted(() => {
  if (first.value) setSceneVars(first.value.daylight.vars)
})

useReveal(() => root.value)
useAmbientDaylight(root)
</script>

<template>
  <div ref="root" class="timeline">
    <section
      v-if="first"
      class="cover"
      :style="first.daylight.vars"
    >
      <p class="cover__eyebrow">A photo journal</p>
      <h1 class="cover__title font-display">One semester<br />of Swedish light</h1>
      <p class="cover__lead">
        Göteborg, January to June 2026. A photo and a few sentences at a time —
        newest first. The page darkens and brightens with the real daylight of
        each day.
      </p>
      <p class="cover__meta">
        {{ entries.length }} notes ·
        from <strong>{{ darkest.daylight.label }}</strong> of daylight in the deep of winter
        to <strong>{{ brightest.daylight.label }}</strong> at midsummer
      </p>
      <RouterLink v-if="isLoggedIn" to="/new" class="cover__new">＋ New entry</RouterLink>
    </section>

    <section
      v-for="group in groups"
      :key="group.key"
      class="month-block"
      :aria-label="group.label"
    >
      <MonthMarker :month="group.label.split(' ')[0]" :year="group.year" :count="group.entries.length" />
      <EntryCard
        v-for="entry in group.entries"
        :key="entry.slug"
        :entry="entry"
        :index="indexOf.get(entry.slug) ?? 0"
        :priority="indexOf.get(entry.slug) === 0"
      />
    </section>
  </div>
</template>

<style scoped>
.timeline {
  max-width: 72rem;
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2rem) 2rem;
}

/* Cover — the journal's title page. Uses the newest entry's daylight so it
   belongs to the season you're currently in. */
.cover {
  padding: clamp(2.5rem, 8vw, 5.5rem) 0 clamp(2rem, 5vw, 3rem);
  border-bottom: 1px solid var(--day-hairline);
  margin-bottom: 1rem;
}
.cover__eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  margin: 0 0 1rem;
}
.cover__title {
  font-size: clamp(2.8rem, 11vw, 6.5rem);
  line-height: 0.92;
  letter-spacing: -0.02em;
  color: var(--day-ink);
  margin: 0 0 1.4rem;
  font-variation-settings: 'opsz' 144, 'SOFT' 40, 'WONK' 1, 'wght' 420;
}
.cover__lead {
  font-size: clamp(1.05rem, 2.5vw, 1.3rem);
  line-height: 1.5;
  max-width: 34ch;
  color: var(--day-ink);
  margin: 0 0 1.6rem;
}
.cover__meta {
  font-size: 0.92rem;
  line-height: 1.6;
  max-width: 46ch;
  color: var(--day-ink-muted);
  margin: 0;
}
.cover__meta strong {
  color: var(--day-ink);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.cover__new {
  display: inline-block;
  margin-top: 1.75rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  background: var(--color-ochre);
  color: #1a1206;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
}
.cover__new:hover {
  filter: brightness(1.06);
}

.month-block + .month-block {
  margin-top: 1rem;
}

/* Hairline between entries within a month — a quiet thread down the page. */
.month-block :deep(.entry + .entry) {
  border-top: 1px solid var(--day-hairline);
}
</style>

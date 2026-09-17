<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { publicEntries, allLoaded, groupByMonth } from '@/content/store'
import { sceneAttrs } from '@/lib/daylight'
import { isLoggedIn } from '@/stores/auth'
import { useReveal } from '@/composables/useReveal'
import { useParallax } from '@/composables/useParallax'
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

useDocumentMeta({
  title: 'Ett halvår i Sverige — a semester in Sweden',
  description:
    'A photo journal from an exchange semester in Stockholm. A photo and a few sentences at a time, newest first.',
})

onMounted(() => {
  if (first.value) setSceneVars(first.value.daylight.vars)
})

useReveal(() => root.value)
useParallax(root)
useAmbientDaylight(root)
</script>

<template>
  <div ref="root" class="timeline">
    <section
      v-if="first"
      class="cover"
      :style="first.daylight.vars"
      v-bind="sceneAttrs(first.daylight)"
    >
      <h1 class="cover__title font-display" data-parallax="0.16" data-header-handoff>
        My semester<br />in Stockholm
      </h1>
      <p class="cover__lead">
        My journal from an exchange semester, winter semester 2026/27.
      </p>
      <RouterLink v-if="isLoggedIn" to="/new" class="cover__new tap">＋ New entry</RouterLink>
    </section>

    <section
      v-for="group in groups"
      :key="group.key"
      class="month-block"
      :aria-label="group.label"
    >
      <MonthMarker :month="group.label.split(' ')[0]" :year="group.year" />
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
  /* No bottom padding: the last entry's own padding is the gap to the footer,
     and doubling them is what made the end of the timeline feel unfinished. */
  padding: 0 clamp(1rem, 4vw, 2rem);
}

/* Cover — the journal's title page. Uses the newest entry's daylight so it
   belongs to the season you're currently in. */
.cover {
  padding: clamp(2.5rem, 8vw, 5.5rem) 0 clamp(2rem, 5vw, 3rem);
  border-bottom: 1px solid var(--day-hairline);
  margin-bottom: 1rem;
}
.cover__title {
  font-size: clamp(2.8rem, 11vw, 6.5rem);
  line-height: 0.92;
  letter-spacing: -0.02em;
  color: var(--day-ink);
  margin: 0 0 1.4rem;
  font-variation-settings: 'opsz' 144, 'SOFT' 40, 'WONK' 1, 'wght' 420;
  /* Drifts a little slower than the page, so the title feels set behind the
     text that follows it rather than glued to it. */
  transform: translate3d(0, var(--parallax-y, 0), 0);
}
.cover__lead {
  font-size: clamp(1.05rem, 2.5vw, 1.3rem);
  line-height: 1.5;
  max-width: 38ch;
  color: var(--day-ink-muted);
  margin: 0;
}
.cover__new {
  display: inline-block;
  margin-top: 1.75rem;
  padding: 0.7rem 1.35rem;
  border-radius: var(--r-pill);
  background: linear-gradient(140deg, var(--color-ochre-bright), var(--color-ochre));
  color: #1a1206;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  box-shadow: 0 12px 28px -16px color-mix(in srgb, var(--color-ochre) 90%, transparent);
  transition:
    transform 260ms var(--ease-spring),
    box-shadow 260ms var(--ease-out);
}
.cover__new:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 34px -16px color-mix(in srgb, var(--color-ochre) 95%, transparent);
}

.month-block + .month-block {
  margin-top: 1rem;
}

/* Hairline between entries within a month — a quiet thread down the page. */
.month-block :deep(.entry + .entry) {
  border-top: 1px solid var(--day-hairline);
}
</style>

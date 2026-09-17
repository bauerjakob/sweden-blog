<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Entry } from '@/content/types'
import { dayNum, weekday } from '@/lib/format'
import { sceneAttrs } from '@/lib/daylight'
import { isLoggedIn } from '@/stores/auth'
import DaylightGauge from './DaylightGauge.vue'
import PhotoFigure from './PhotoFigure.vue'

const props = defineProps<{
  entry: Entry
  index: number
  priority?: boolean
}>()

const flip = computed(() => props.index % 2 === 1)
const permalink = computed(() => `/entry/${props.entry.slug}`)
const lead = computed(() => props.entry.photos[0])
const rest = computed(() => props.entry.photos.slice(1))
const showText = computed(() => props.entry.hasBody || !!props.entry.title)
const truncated = computed(() => props.entry.excerpt.endsWith('…'))
// Data-attributes useAmbientDaylight reads to tint the header, month tabs and
// footer as this entry passes the focus line.
const scene = computed(() => sceneAttrs(props.entry.daylight))
</script>

<template>
  <article
    class="entry reveal"
    :class="[
      flip ? 'entry--flip reveal--left' : 'reveal--right',
      { 'entry--mode-dark': entry.daylight.mode === 'dark' },
    ]"
    :style="entry.daylight.vars"
    v-bind="scene"
  >
    <header class="entry__head">
      <RouterLink
        v-if="entry.hasPage"
        :to="permalink"
        class="entry__daylink tap"
        :aria-label="`Open entry from ${weekday(entry.date)} ${dayNum(entry.date)}`"
      >
        <span class="entry__day font-display">{{ dayNum(entry.date) }}</span>
      </RouterLink>
      <span v-else class="entry__daylink">
        <span class="entry__day font-display">{{ dayNum(entry.date) }}</span>
      </span>
      <div class="entry__meta">
        <span class="entry__weekday">{{ weekday(entry.date) }}</span>
        <span v-if="entry.unlisted" class="entry__badge">Unlisted</span>
        <span v-if="entry.location" class="entry__loc">{{ entry.location }}</span>
        <DaylightGauge class="entry__gauge" :info="entry.daylight" compact />
      </div>
    </header>

    <div class="entry__body">
      <PhotoFigure
        v-if="lead"
        class="entry__lead"
        :photo="lead"
        :priority="priority"
        sizes="(min-width: 900px) 620px, (min-width: 640px) 80vw, 100vw"
        data-parallax="0.5"
        data-parallax-scale="1.16"
      />

      <div v-if="showText" class="entry__text panel">
        <h2 v-if="entry.title" class="entry__title font-display-tight">
          <RouterLink v-if="entry.hasPage" :to="permalink">{{ entry.title }}</RouterLink>
          <template v-else>{{ entry.title }}</template>
        </h2>
        <!-- With no page of its own, the card *is* the entry: it prints the
             whole body, because there is nowhere else to go and read it. -->
        <div
          v-if="entry.hasBody && !entry.hasPage"
          class="entry__full prose-journal"
          v-html="entry.bodyHtml"
        ></div>
        <template v-else-if="entry.hasBody">
          <p class="entry__excerpt">{{ entry.excerpt }}</p>
          <RouterLink v-if="truncated" :to="permalink" class="entry__more">
            Read the whole thing<span aria-hidden="true"> →</span>
          </RouterLink>
        </template>
      </div>

      <div v-if="rest.length" class="entry__rest" data-reveal-group>
        <PhotoFigure
          v-for="p in rest"
          :key="p.src"
          class="reveal reveal--rise"
          :photo="p"
          sizes="(min-width: 640px) 300px, 45vw"
          data-parallax="0.3"
          data-parallax-scale="1.1"
        />
      </div>

      <footer class="entry__foot">
        <RouterLink
          v-if="isLoggedIn"
          :to="`/entry/${entry.slug}/edit`"
          class="entry__edit"
        >Edit</RouterLink>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.entry {
  position: relative;
  padding: clamp(1.5rem, 4vw, 3rem) 0;
}

/* Date + meta */
.entry__head {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}
.entry__daylink {
  display: inline-block;
  text-decoration: none;
  color: var(--day-ink);
  line-height: 0.8;
}
.entry__day {
  display: block;
  font-size: var(--text-fluid-date);
  line-height: 0.82;
  font-variant-numeric: tabular-nums;
  color: var(--day-ink);
}
.entry__meta {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.entry__weekday {
  font-family: var(--font-display);
  font-variation-settings: 'opsz' 40, 'wght' 500;
  font-size: 1.05rem;
  color: var(--day-ink);
}
.entry__loc {
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.entry__loc::before {
  content: '';
  width: 1.4rem;
  height: 1px;
  background: var(--day-accent);
}
.entry__gauge {
  margin-top: 0.15rem;
}

/* Body */
.entry__body {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.entry__lead :deep(.figure__frame) {
  border-radius: var(--r-xl);
}
.entry__text {
  padding: 1.35rem 1.5rem;
  align-self: start;
  max-width: 62ch;
}
.entry__title {
  font-size: clamp(1.35rem, 3.4vw, 1.9rem);
  line-height: 1.08;
  margin: 0 0 0.5rem;
  color: var(--day-ink);
}
.entry__title a {
  color: var(--day-ink);
  text-decoration: none;
}
.entry__title a:hover {
  text-decoration: underline;
  text-decoration-color: var(--day-accent);
  text-underline-offset: 4px;
}
.entry__excerpt {
  margin: 0;
  color: var(--day-ink);
  font-size: 1.0625rem;
  line-height: 1.6;
}
/* The full body of a page-less entry. .prose-journal (global) does the typography;
   this only stops its first block from pushing off the top of the panel — a body
   opening on a heading would otherwise inherit that heading's 1.8em top margin. */
.entry__full :deep(> :first-child) {
  margin-top: 0;
}
.entry__more {
  display: inline-block;
  margin-top: 0.7rem;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--day-ink);
  text-decoration: none;
  border-bottom: 2px solid var(--day-accent);
  padding-bottom: 2px;
}
.entry__rest {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.9rem;
}

/* Footer */
.entry__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.entry__edit {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--day-ink);
  text-decoration: none;
  border-bottom: 2px solid var(--day-accent);
  padding-bottom: 1px;
}
.entry__badge {
  align-self: flex-start;
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--day-ink);
  border: 1px dashed var(--day-accent);
  border-radius: var(--r-pill);
  padding: 0.1rem 0.5rem;
}

/* Below the two-column breakpoint there are no left/right sides to enter from,
   so the alternating cards all just rise. */
@media (max-width: 51.24rem) {
  .entry.reveal {
    --reveal-x: 0;
    --reveal-y: 26px;
  }
}

/* ------- Wider screens: break the single column, alternate sides ------- */
@media (min-width: 820px) {
  .entry {
    display: grid;
    grid-template-columns: 13rem 1fr;
    column-gap: clamp(1.5rem, 4vw, 3.5rem);
    align-items: start;
  }
  .entry__head {
    margin-bottom: 0;
    position: sticky;
    top: 5.5rem;
    text-align: right;
    align-items: flex-end;
  }
  .entry__meta {
    align-items: flex-end;
  }
  .entry__loc {
    flex-direction: row-reverse;
  }
  .entry__gauge :deep(.daylight--compact) {
    flex-direction: row-reverse;
  }

  /* Flipped entries put the date on the right — the asymmetry of a journal. */
  .entry--flip {
    grid-template-columns: 1fr 13rem;
  }
  .entry--flip .entry__head {
    order: 2;
    text-align: left;
    align-items: flex-start;
  }
  .entry--flip .entry__meta {
    align-items: flex-start;
  }
  .entry--flip .entry__loc {
    flex-direction: row;
  }
  .entry--flip .entry__body {
    order: 1;
  }
  .entry--flip .entry__gauge :deep(.daylight--compact) {
    flex-direction: row;
  }

  /* Vary photo weight by letting the lead bleed toward the outer edge. */
  .entry__lead {
    margin-right: clamp(-3rem, -4vw, -1rem);
  }
  .entry--flip .entry__lead {
    margin-right: 0;
    margin-left: clamp(-3rem, -4vw, -1rem);
  }
  .entry__day {
    font-size: clamp(4rem, 8vw, 7rem);
  }
}
</style>

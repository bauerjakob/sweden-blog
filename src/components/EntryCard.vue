<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Entry } from '@/content/types'
import { dayNum, weekday } from '@/lib/format'
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
</script>

<template>
  <article
    class="entry reveal"
    :class="{ 'entry--flip': flip, 'entry--mode-dark': entry.daylight.mode === 'dark' }"
    :style="entry.daylight.vars"
    :data-day-page="entry.daylight.vars['--day-page']"
    :data-day-page-2="entry.daylight.vars['--day-page-2']"
  >
    <header class="entry__head">
      <RouterLink :to="permalink" class="entry__daylink" :aria-label="`Open entry from ${weekday(entry.date)} ${dayNum(entry.date)}`">
        <span class="entry__day font-display">{{ dayNum(entry.date) }}</span>
      </RouterLink>
      <div class="entry__meta">
        <span class="entry__weekday">{{ weekday(entry.date) }}</span>
        <span v-if="entry.unlisted" class="entry__badge">Unlisted</span>
        <span v-if="entry.location" class="entry__loc">{{ entry.location }}</span>
        <DaylightGauge class="entry__gauge" :info="entry.daylight" />
      </div>
    </header>

    <div class="entry__body">
      <PhotoFigure
        v-if="lead"
        class="entry__lead"
        :photo="lead"
        :priority="priority"
        sizes="(min-width: 900px) 620px, (min-width: 640px) 80vw, 100vw"
      />

      <div v-if="showText" class="entry__text panel">
        <h2 v-if="entry.title" class="entry__title font-display-tight">
          <RouterLink :to="permalink">{{ entry.title }}</RouterLink>
        </h2>
        <p v-if="entry.hasBody" class="entry__excerpt">{{ entry.excerpt }}</p>
        <RouterLink v-if="truncated" :to="permalink" class="entry__more">
          Read the whole thing<span aria-hidden="true"> →</span>
        </RouterLink>
      </div>

      <div v-if="rest.length" class="entry__rest">
        <PhotoFigure
          v-for="p in rest"
          :key="p.src"
          :photo="p"
          sizes="(min-width: 640px) 300px, 45vw"
        />
      </div>

      <footer class="entry__foot">
        <ul v-if="entry.tags.length" class="entry__tags">
          <li v-for="t in entry.tags" :key="t">
            <RouterLink :to="`/tags/${t}`" class="tag">{{ t }}</RouterLink>
          </li>
        </ul>
        <span class="entry__foot-right">
          <RouterLink
            v-if="isLoggedIn"
            :to="`/entry/${entry.slug}/edit`"
            class="entry__edit"
          >Edit</RouterLink>
          <RouterLink :to="permalink" class="entry__permalink">Permalink</RouterLink>
        </span>
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
.entry__lead :deep(.figure__img) {
  border-radius: 3px;
}
.entry__text {
  padding: 1.15rem 1.25rem;
  border-radius: 4px;
  align-self: start;
  max-width: 62ch;
}
.entry__title {
  font-size: clamp(1.35rem, 3.4vw, 1.9rem);
  line-height: 1.08;
  margin: 0 0 0.5rem;
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
  gap: 0.75rem;
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
.entry__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.tag {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: lowercase;
  color: var(--day-ink-muted);
  text-decoration: none;
  padding: 0.15rem 0.55rem;
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
.entry__foot-right {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
}
.entry__permalink {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  text-decoration: none;
}
.entry__permalink:hover {
  color: var(--day-ink);
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
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
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
  .entry__gauge {
    align-items: flex-end;
  }
  .entry__gauge :deep(.daylight) {
    align-items: flex-end;
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
  .entry--flip .entry__gauge :deep(.daylight) {
    align-items: flex-start;
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

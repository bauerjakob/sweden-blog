<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { publicEntries, allTags } from '@/content/store'
import { applyDocumentMeta } from '@/composables/useDocumentMeta'
import { useAmbientDaylight, setSceneVars } from '@/composables/useAmbientDaylight'
import { useReveal } from '@/composables/useReveal'
import EntryCard from '@/components/EntryCard.vue'

const props = defineProps<{ tag: string }>()

const root = ref<HTMLElement | null>(null)
const entries = computed(() => publicEntries.value.filter((e) => e.tags.includes(props.tag)))
const tags = computed(() => allTags(publicEntries.value))

const indexOf = computed(() => new Map(entries.value.map((e, i) => [e.slug, i])))

watch(
  () => props.tag,
  () => {
    const first = entries.value[0] ?? publicEntries.value[0]
    if (first) setSceneVars(first.daylight.vars)
    applyDocumentMeta({
      title: `#${props.tag} — Ett halvår i Sverige`,
      description: `Entries tagged “${props.tag}” from a semester in Göteborg.`,
    })
  },
  { immediate: true },
)

useReveal(() => root.value)
useAmbientDaylight(root)
</script>

<template>
  <div ref="root" class="tagpage">
    <header class="tagpage__head">
      <p class="tagpage__eyebrow">Tagged</p>
      <h1 class="tagpage__title font-display">#{{ tag }}</h1>
      <p class="tagpage__count">
        {{ entries.length }} {{ entries.length === 1 ? 'entry' : 'entries' }}
      </p>
      <nav class="tagpage__all" aria-label="All tags">
        <RouterLink
          v-for="t in tags"
          :key="t.tag"
          :to="`/tags/${t.tag}`"
          class="tagpage__chip"
          :class="{ 'is-active': t.tag === tag }"
        >
          {{ t.tag }} <span class="tagpage__chip-n">{{ t.count }}</span>
        </RouterLink>
      </nav>
    </header>

    <template v-if="entries.length">
      <EntryCard
        v-for="entry in entries"
        :key="entry.slug"
        :entry="entry"
        :index="indexOf.get(entry.slug) ?? 0"
      />
    </template>

    <section v-else class="tagpage__empty">
      <p>No entries tagged “{{ tag }}” yet.</p>
      <RouterLink to="/" class="tagpage__back">← Back to the timeline</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.tagpage {
  max-width: 72rem;
  margin: 0 auto;
  padding: clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 2rem) 2rem;
  /* A stable, legible chrome for the header regardless of scene. */
}
.tagpage__head {
  --day-ink: #f2ede1;
  --day-ink-muted: #adc0c4;
  --day-hairline: rgba(242, 237, 225, 0.16);
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--day-hairline);
}
.tagpage__eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  margin: 0 0 0.6rem;
}
.tagpage__title {
  font-size: clamp(2.6rem, 9vw, 4.5rem);
  line-height: 0.95;
  color: var(--day-ink);
  margin: 0;
}
.tagpage__count {
  color: var(--day-ink-muted);
  margin: 0.5rem 0 1.5rem;
  font-variant-numeric: tabular-nums;
}
.tagpage__all {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tagpage__chip {
  font-size: 0.82rem;
  color: #cfd8d9;
  text-decoration: none;
  padding: 0.3rem 0.75rem;
  border: 1px solid rgba(242, 237, 225, 0.16);
  border-radius: 999px;
}
.tagpage__chip::before {
  content: '#';
  opacity: 0.5;
}
.tagpage__chip-n {
  color: rgba(242, 237, 225, 0.45);
  font-variant-numeric: tabular-nums;
}
.tagpage__chip:hover {
  border-color: var(--color-ochre);
  color: #f4efe4;
}
.tagpage__chip.is-active {
  background: var(--color-ochre);
  color: #1a1206;
  border-color: var(--color-ochre);
}
.tagpage__chip.is-active .tagpage__chip-n {
  color: rgba(26, 18, 6, 0.6);
}
.tagpage__empty {
  --day-ink: #f2ede1;
  color: var(--day-ink);
  padding: 3rem 0;
  font-size: 1.15rem;
}
.tagpage__back {
  display: inline-block;
  margin-top: 1rem;
  color: var(--color-ochre-bright);
  text-decoration: none;
}
</style>

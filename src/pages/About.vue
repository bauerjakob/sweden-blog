<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { applyDocumentMeta } from '@/composables/useDocumentMeta'
import { setSceneVars } from '@/composables/useAmbientDaylight'
import { publicEntries } from '@/content/store'

// A fixed mood for the About page: the long blue dusk of a Swedish afternoon.
const scene = {
  '--day-page': '#12252e',
  '--day-page-2': '#0b171e',
}

onMounted(() => {
  setSceneVars(scene)
  applyDocumentMeta({
    title: 'About — Ett halvår i Sverige',
    description:
      'Who I am, where I am, and why this site exists: a photo journal from an exchange semester in Göteborg.',
    type: 'website',
  })
})

const count = computed(() => publicEntries.value.length)
</script>

<template>
  <div class="about">
    <div class="about__inner">
      <p class="about__eyebrow">About</p>
      <h1 class="about__title font-display">Why this<br />exists</h1>

      <div class="about__prose prose-journal">
        <p>
          Hej. I'm a 23-year-old spending an exchange semester at Chalmers in
          <strong>Göteborg</strong>, on the west coast of Sweden. This is where I
          keep the semester — a photo and a couple of sentences at a time, in the
          order it happened.
        </p>
        <p>
          It's here for two reasons. The first is selfish: I want something I'll
          still want to read in ten years, when the specific weight of a February
          afternoon here has gone fuzzy. The second is for the people back home —
          my parents, my grandmother, a handful of friends — who wanted to follow
          along without an app, an account, or a social network asking them to
          sign up for anything.
        </p>

        <h2>The daylight thing</h2>
        <p>
          If you scroll the timeline you'll notice the page gets darker and
          lighter. That's not a mood board — it's real. Every entry is tinted by
          how much daylight Göteborg actually had that day, from about six and a
          half hours at the December solstice to over eighteen at midsummer. The
          winter really is that dark, and the summer really doesn't end. Watching
          the page change as you read it is the closest I could get to explaining
          what the light does to a place.
        </p>

        <h2>What this isn't</h2>
        <p>
          There are no comments, no likes, no follower counts, no newsletter, no
          analytics, and no cookie banner — because there are no cookies and
          nothing is tracked. If you're reading this, someone sent you the link,
          which is exactly how it's meant to travel.
        </p>
        <p>
          There are {{ count }} entries so far. The best way in is simply to
          <RouterLink to="/">start at the top of the timeline</RouterLink> and
          scroll.
        </p>
      </div>

      <RouterLink to="/" class="about__back">← To the timeline</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.about {
  --day-ink: #f2ede1;
  --day-ink-muted: #adc0c4;
  --day-hairline: rgba(242, 237, 225, 0.16);
  --day-accent: var(--color-ochre);
  max-width: 48rem;
  margin: 0 auto;
  padding: clamp(2rem, 7vw, 4.5rem) clamp(1rem, 4vw, 2rem) 4rem;
}
.about__eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  margin: 0 0 1rem;
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

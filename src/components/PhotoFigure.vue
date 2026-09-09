<script setup lang="ts">
import type { Photo } from '@/content/types'

const props = withDefaults(
  defineProps<{
    photo: Photo
    /** Responsive sizes hint; default assumes near-full column width. */
    sizes?: string
    /** First meaningful image on the page: load eagerly, hint high priority. */
    priority?: boolean
  }>(),
  { sizes: '(min-width: 768px) 640px, 100vw', priority: false },
)
</script>

<template>
  <figure class="figure" :class="`is-${photo.orientation}`">
    <img
      class="figure__img"
      :src="photo.url"
      :srcset="photo.srcset"
      :sizes="props.sizes"
      :width="photo.w"
      :height="photo.h"
      :alt="photo.alt"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : 'auto'"
      decoding="async"
    />
    <figcaption v-if="photo.caption" class="figure__caption">
      {{ photo.caption }}
    </figcaption>
  </figure>
</template>

<style scoped>
.figure {
  margin: 0;
}
.figure__img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 3px;
  background: var(--day-hairline);
  /* A hair of definition against both dark and light pages. */
  box-shadow: 0 1px 0 var(--day-hairline);
}
.figure__caption {
  margin-top: 0.55rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--day-ink-muted);
  font-style: italic;
  /* Marginalia feel: caption hangs slightly, doesn't sit dead-centre. */
  padding-left: 0.1rem;
  max-width: 42ch;
}
</style>

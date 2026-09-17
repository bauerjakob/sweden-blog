<script setup lang="ts">
import { ref } from 'vue'
import type { Photo } from '@/content/types'
import { useMagnetic } from '@/composables/useMagnetic'

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

// Every photo leans toward the cursor. Measured on the frame rather than the
// whole figure, so the lean is sized by the picture and a tall caption neither
// moves it nor shifts its centre. No-ops on touch and under reduced motion.
const frame = ref<HTMLElement | null>(null)
useMagnetic(frame)
</script>

<template>
  <figure class="figure" :class="`is-${photo.orientation}`">
    <!-- The frame clips; the image inside is what drifts. Keeping the two
         separate is what lets a parallaxed photo move without ever showing a
         gap at its top or bottom edge. -->
    <div ref="frame" class="figure__frame">
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
    </div>
    <figcaption v-if="photo.caption" class="figure__caption">
      {{ photo.caption }}
    </figcaption>
  </figure>
</template>

<style scoped>
.figure {
  margin: 0;
}
.figure__frame {
  position: relative;
  overflow: hidden;
  border-radius: var(--r-lg);
  background: var(--day-hairline);
  /* A hairline of definition against both dark and light pages, plus a soft
     drop so the photo sits above the scene instead of on it. */
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--day-ink) 8%, transparent),
    0 24px 50px -34px rgb(0 0 0 / 0.55);
  /* --magnet-x/y are written by useMagnetic on the figure while the pointer is
     over it; both default to a no-op. Moving the frame (not the image) is what
     makes this read as the whole photo leaning: the image keeps its own
     parallax drift inside, and the caption below stays put.

     Not transitioned — the composable already eases it frame by frame. This
     also keeps the compositing layer that translateZ(0) used to provide, so the
     clip stays crisp while the child moves. */
  transform: translate3d(var(--magnet-x, 0px), var(--magnet-y, 0px), 0);
}
.figure__img {
  display: block;
  width: 100%;
  height: auto;
  /* --parallax-y is written by useParallax on the figure; --parallax-scale is
     the oversize that gives the drift room to move inside the frame. Both
     default to a no-op, so an un-parallaxed photo is a plain image. */
  /* Translate and scale are kept on separate properties on purpose: the drift
     owns `transform` and the oversize owns `scale`, so neither has to restate
     the other.

     The transition on `scale` is the zoom-in: the image is laid out at its
     natural size and eases up to the oversize once useParallax writes it, so a
     photo settles into the frame instead of being born cropped. The drift then
     happens inside the room that zoom just created — it is deliberately NOT
     transitioned, because the composable already eases it frame by frame. */
  transform: translate3d(0, var(--parallax-y, 0), 0);
  scale: var(--parallax-scale, 1);
  transition: scale 900ms var(--ease-out);
}
.figure__caption {
  margin-top: 0.65rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--day-ink-muted);
  font-style: italic;
  /* Marginalia feel: caption hangs slightly, doesn't sit dead-centre. */
  padding-left: 0.1rem;
  max-width: 42ch;
}
</style>

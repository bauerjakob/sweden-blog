<script setup lang="ts">
defineProps<{
  month: string
  year: number
  count: number
}>()
</script>

<template>
  <div class="month">
    <div class="month__pill glass">
      <span class="month__name font-display">{{ month }}</span>
      <span class="month__meta">
        <span class="month__year">{{ year }}</span>
        <span class="month__count">{{ count }} {{ count === 1 ? 'note' : 'notes' }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Chapter tab. Same liquid glass as the header, so it picks up the colour of
   the season it sits in rather than keeping its own dark chrome.

   Deliberately not sticky. Pinned, it stayed for the whole month block and so
   spent most of its time parked on top of an entry's text — and the header
   auto-hiding on mobile exposed it exactly when it was over prose. A chapter
   label that is always on screen isn't worth reading around. */
.month {
  position: relative;
  z-index: 20;
  pointer-events: none;
  margin-bottom: 0.75rem;
}
.month__pill {
  display: inline-flex;
  align-items: baseline;
  gap: 0.9rem;
  padding: 0.5rem 1.1rem 0.55rem;
  border-radius: var(--r-pill);
}
.month__name {
  font-size: clamp(1.5rem, 4.5vw, 2.1rem);
  line-height: 1;
  color: var(--scene-ink);
}
.month__meta {
  display: inline-flex;
  align-items: baseline;
  gap: 0.6rem;
  font-variant-numeric: tabular-nums;
}
.month__year {
  font-size: 0.95rem;
  color: var(--color-ochre-bright);
  font-variant-numeric: tabular-nums;
}
.month__count {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--scene-ink-muted);
}
</style>

<script setup lang="ts">
defineProps<{
  month: string
  year: number
  count: number
}>()
</script>

<template>
  <div class="month">
    <div class="month__pill">
      <span class="month__name font-display">{{ month }}</span>
      <span class="month__meta">
        <span class="month__year">{{ year }}</span>
        <span class="month__count">{{ count }} {{ count === 1 ? 'note' : 'notes' }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Sticky chapter tab. Keeps its own dark chrome so it stays legible whether it
   floats over a deep-winter or bleached-summer scene. */
.month {
  position: sticky;
  top: 0.75rem;
  z-index: 20;
  pointer-events: none;
  margin-bottom: 0.5rem;
}
.month__pill {
  display: inline-flex;
  align-items: baseline;
  gap: 0.9rem;
  padding: 0.5rem 1.1rem 0.55rem;
  border-radius: 999px;
  background: rgba(12, 22, 28, 0.82);
  backdrop-filter: blur(8px) saturate(1.1);
  -webkit-backdrop-filter: blur(8px) saturate(1.1);
  border: 1px solid rgba(242, 237, 225, 0.14);
  box-shadow: 0 10px 30px -18px rgba(0, 0, 0, 0.8);
}
.month__name {
  font-size: clamp(1.5rem, 4.5vw, 2.1rem);
  line-height: 1;
  color: #f4efe4;
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
  color: rgba(242, 237, 225, 0.6);
}
</style>

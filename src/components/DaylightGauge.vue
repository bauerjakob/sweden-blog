<script setup lang="ts">
import { computed } from 'vue'
import type { DaylightInfo } from '@/lib/daylight'

const props = defineProps<{ info: DaylightInfo }>()

// Position sunrise/sunset across a 24-hour track (0–1).
const band = computed(() => {
  const { sunrise, sunset } = props.info
  if (!sunrise || !sunset) {
    // Polar edge case: fall back to a centred band sized by hours.
    const frac = props.info.hours / 24
    return { start: 0.5 - frac / 2, end: 0.5 + frac / 2 }
  }
  const toFrac = (d: Date) => (d.getHours() * 60 + d.getMinutes()) / (24 * 60)
  return { start: toFrac(sunrise), end: toFrac(sunset) }
})

const startPct = computed(() => `${band.value.start * 100}%`)
const widthPct = computed(() => `${(band.value.end - band.value.start) * 100}%`)

const srText = computed(() => {
  const { label, sunriseLabel, sunsetLabel } = props.info
  if (sunriseLabel && sunsetLabel) {
    return `${label} of daylight, sunrise ${sunriseLabel}, sunset ${sunsetLabel}`
  }
  return `${label} of daylight`
})
</script>

<template>
  <div class="daylight" role="img" :aria-label="srText">
    <div class="daylight__label">
      <span class="daylight__hours font-display-tight">{{ info.label }}</span>
      <span class="daylight__caption">of daylight</span>
    </div>
    <div class="daylight__track" aria-hidden="true">
      <div class="daylight__fill" :style="{ left: startPct, width: widthPct }"></div>
      <span
        v-if="info.sunriseLabel"
        class="daylight__tick"
        :style="{ left: startPct }"
      ></span>
      <span
        v-if="info.sunsetLabel"
        class="daylight__tick"
        :style="{ left: `calc(${startPct} + ${widthPct})` }"
      ></span>
    </div>
    <div v-if="info.sunriseLabel && info.sunsetLabel" class="daylight__times" aria-hidden="true">
      <span>↑&thinsp;{{ info.sunriseLabel }}</span>
      <span>↓&thinsp;{{ info.sunsetLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.daylight {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-width: 15rem;
}
.daylight__label {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}
.daylight__hours {
  font-size: 1.05rem;
  color: var(--day-ink);
  font-variant-numeric: tabular-nums;
}
.daylight__caption {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
}
.daylight__track {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: var(--day-hairline);
  overflow: visible;
}
.daylight__fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-ochre) 55%, transparent),
    var(--color-ochre-bright)
  );
}
.daylight__tick {
  position: absolute;
  top: 50%;
  width: 3px;
  height: 12px;
  margin-left: -1.5px;
  transform: translateY(-50%);
  border-radius: 2px;
  background: var(--day-ink);
}
.daylight__times {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--day-ink-muted);
  font-variant-numeric: tabular-nums;
}
</style>

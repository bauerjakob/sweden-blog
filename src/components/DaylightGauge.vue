<script setup lang="ts">
import { computed } from 'vue'
import type { DaylightInfo } from '@/lib/daylight'

/**
 * Two sizes, because the same reading carries very different weight depending
 * on where it sits.
 *
 * The full gauge belongs on an entry's own page, where you came to look at that
 * one day and the sunrise/sunset times are worth reading. In the timeline it
 * repeats once per entry, so it runs `compact`: a single quiet line, ink rather
 * than ochre, no times — a footnote to the date, not a second headline.
 */
const props = withDefaults(
  defineProps<{ info: DaylightInfo; compact?: boolean }>(),
  { compact: false },
)

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

// The compact gauge drops the times on screen, but a screen reader still gets
// the whole reading either way.
const srText = computed(() => {
  const { label, sunriseLabel, sunsetLabel } = props.info
  if (sunriseLabel && sunsetLabel) {
    return `${label} of daylight, sunrise ${sunriseLabel}, sunset ${sunsetLabel}`
  }
  return `${label} of daylight`
})
</script>

<template>
  <div
    class="daylight"
    :class="{ 'daylight--compact': compact }"
    role="img"
    :aria-label="srText"
  >
    <div class="daylight__label">
      <span class="daylight__hours" :class="{ 'font-display-tight': !compact }">
        {{ info.label }}
      </span>
      <span class="daylight__caption">{{ compact ? 'light' : 'of daylight' }}</span>
    </div>
    <div class="daylight__track" aria-hidden="true">
      <div class="daylight__fill" :style="{ left: startPct, width: widthPct }"></div>
      <template v-if="!compact">
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
      </template>
    </div>
    <div
      v-if="!compact && info.sunriseLabel && info.sunsetLabel"
      class="daylight__times"
      aria-hidden="true"
    >
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
  /* Ochre, but held back — the band marks the day, it doesn't advertise it. */
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-ochre) 30%, transparent),
    color-mix(in srgb, var(--color-ochre) 70%, transparent)
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
  background: color-mix(in srgb, var(--day-ink) 55%, transparent);
}
.daylight__times {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--day-ink-muted);
  font-variant-numeric: tabular-nums;
}

/* ---------------- Compact: one line, in the timeline ---------------- */
.daylight--compact {
  flex-direction: row;
  align-items: center;
  gap: 0.45rem;
  max-width: none;
}
.daylight--compact .daylight__label {
  gap: 0.3rem;
}
.daylight--compact .daylight__hours {
  font-size: 0.74rem;
  color: var(--day-ink-muted);
}
.daylight--compact .daylight__caption {
  font-size: 0.74rem;
  letter-spacing: 0;
  text-transform: none;
}
.daylight--compact .daylight__track {
  flex: 0 0 auto;
  width: 2.75rem;
  height: 2px;
}
/* No ochre down here: in the timeline the only accent should be the writing. */
.daylight--compact .daylight__fill {
  background: color-mix(in srgb, var(--day-ink) 40%, transparent);
}
</style>

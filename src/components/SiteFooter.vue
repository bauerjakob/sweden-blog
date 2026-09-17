<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="foot">
    <div class="foot__inner">
      <p class="foot__fine">Stockholm · {{ year }}</p>
    </div>
  </footer>
</template>

<style scoped>
/*
  The end of the page, and not much more than that. It used to restate the whole
  pitch in display serif and then again in fine print — but by the time you are
  down here you have read the thing, and the about page says all of it properly.
  It also used to repeat the header's two links; the header carries them on
  every page, including in the mobile sheet, so down here they were a second
  copy of a menu you already have. What is left is the line that dates the
  journal.

  No glass either: the footer is not sticky, so nothing ever passes behind it
  and the material had nothing to do. One hairline is enough to say the page has
  ended, and drawn in the ambient ink it still belongs to whatever season you
  were last scrolled to.
*/
.foot {
  /*
    Close, on purpose. The page above already ends in whitespace — every entry
    carries its own bottom padding — so a tall margin here stacked on top of
    that and left the last photo stranded above an empty band, worst on a phone
    where the band was most of a screen. The hairline is what ends the page;
    it only needs enough air to read as deliberate.
  */
  margin-top: clamp(1.5rem, 3vw, 2.25rem);
  border-top: 1px solid var(--glass-hairline);
}
.foot__inner {
  max-width: 72rem;
  margin: 0 auto;
  padding: 1.6rem clamp(1rem, 4vw, 2rem) 2.25rem;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--scene-ink-muted);
}
.foot__fine {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
</style>

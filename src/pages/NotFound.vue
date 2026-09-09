<script setup lang="ts">
import { onMounted } from 'vue'
import { applyDocumentMeta } from '@/composables/useDocumentMeta'
import { setSceneVars } from '@/composables/useAmbientDaylight'
import NotFoundInline from '@/components/NotFoundInline.vue'

onMounted(() => {
  setSceneVars({ '--day-page': '#0c1620', '--day-page-2': '#080f16' })
  applyDocumentMeta({
    title: 'Page not found — Ett halvår i Sverige',
    description: 'This page could not be found.',
  })
})
</script>

<template>
  <NotFoundInline />
</template>

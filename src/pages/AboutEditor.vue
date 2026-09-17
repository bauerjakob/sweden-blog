<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import { saveAbout } from '@/content/about'
import { applyDocumentMeta } from '@/composables/useDocumentMeta'
import { setSceneVars } from '@/composables/useAmbientDaylight'

// The same dusk the About page sits in, so editing it looks like the page.
const scene = {
  '--day-page': '#12252e',
  '--day-page-2': '#0b171e',
}

const router = useRouter()

// Written out here because Vue's template parser closes an interpolation at the
// first `}}` — it cannot be quoted inline in the markup below.
const COUNT_TOKEN = '{{count}}'

const form = reactive({ title: '', bodyMd: '' })
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  setSceneVars(scene)
  applyDocumentMeta({ title: 'Edit About — Ett halvår i Sverige', description: 'Editor' })
  try {
    // The page's own JSON carries rendered HTML; the editor wants the source.
    const { about } = await api.getAboutSource()
    form.title = about.title
    form.bodyMd = about.bodyMd
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
})

async function onSubmit() {
  error.value = null
  saving.value = true
  try {
    await saveAbout({ title: form.title, bodyMd: form.bodyMd })
    router.push('/about')
  } catch (e) {
    error.value = (e as Error).message
    saving.value = false
  }
}
</script>

<template>
  <div class="editor">
    <div class="editor__inner">
      <RouterLink to="/about" class="editor__back"><span aria-hidden="true">←</span> Cancel</RouterLink>
      <h1 class="editor__title font-display">Edit About</h1>

      <p v-if="loading" class="editor__loading">Loading…</p>

      <form v-else class="editor__form" @submit.prevent="onSubmit">
        <label class="field">
          <span class="field__label">
            Heading *
            <span class="field__hint">(each line is a line of the big title)</span>
          </span>
          <textarea
            v-model="form.title"
            rows="2"
            required
            class="field__input field__textarea field__textarea--title"
          ></textarea>
        </label>

        <label class="field">
          <span class="field__label">
            Body *
            <span class="field__hint">
              (Markdown. <code>{{ COUNT_TOKEN }}</code> becomes the number of
              entries on the timeline.)
            </span>
          </span>
          <textarea
            v-model="form.bodyMd"
            rows="20"
            required
            class="field__input field__textarea"
            placeholder="Write in Markdown…"
          ></textarea>
        </label>

        <p v-if="error" class="editor__error" role="alert">{{ error }}</p>

        <div class="editor__actions">
          <button type="submit" class="editor__save" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
          <RouterLink to="/about" class="editor__cancel">Cancel</RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.editor {
  --day-ink: #f2ede1;
  --day-ink-muted: #adc0c4;
  --day-hairline: rgba(242, 237, 225, 0.16);
}
.editor__inner {
  max-width: 44rem;
  margin: 0 auto;
  padding: 1.5rem clamp(1rem, 4vw, 2rem) 4rem;
}
.editor__back {
  display: inline-block;
  margin: 0.5rem 0 1.5rem;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  text-decoration: none;
}
.editor__back:hover { color: var(--day-ink); }
.editor__title {
  font-size: clamp(2.2rem, 7vw, 3.2rem);
  color: var(--day-ink);
  margin: 0 0 2rem;
}
.editor__loading { color: var(--day-ink-muted); }
.editor__form {
  display: flex;
  flex-direction: column;
  gap: 1.3rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.field__label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
}
.field__hint {
  text-transform: none;
  letter-spacing: 0;
  opacity: 0.8;
}
.field__hint code {
  font-size: 0.95em;
}
.field__input {
  font: inherit;
  font-size: 1.0625rem;
  color: var(--day-ink);
  background: color-mix(in srgb, var(--day-ink) 5%, transparent);
  border: 1px solid var(--day-hairline);
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  width: 100%;
}
.field__input:focus { border-color: var(--color-ochre); }
.field__textarea {
  resize: vertical;
  line-height: 1.6;
  font-family: var(--font-body);
}
/* The heading is set in the display face on the page; show it that way here. */
.field__textarea--title {
  font-family: var(--font-display, inherit);
  font-size: 1.6rem;
  line-height: 1.1;
}
.editor__error {
  color: #e0954a;
  margin: 0;
}
.editor__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}
.editor__save {
  font: inherit;
  font-weight: 600;
  padding: 0.75rem 1.4rem;
  border: none;
  border-radius: 999px;
  background: var(--color-ochre);
  color: #1a1206;
  cursor: pointer;
}
.editor__save:disabled { opacity: 0.6; cursor: default; }
.editor__save:hover:not(:disabled) { filter: brightness(1.06); }
.editor__cancel {
  color: var(--day-ink-muted);
  text-decoration: none;
  font-size: 0.9rem;
}
.editor__cancel:hover { color: var(--day-ink); }
</style>

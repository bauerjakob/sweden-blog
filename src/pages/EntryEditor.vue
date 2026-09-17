<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, type ApiPhoto } from '@/api/client'
import { createEntry, updateEntry, deleteAndRemove } from '@/content/mutations'
import { applyDocumentMeta } from '@/composables/useDocumentMeta'
import { setSceneVars } from '@/composables/useAmbientDaylight'
import { getTheme } from '@/lib/daylight'
import DaylightGauge from '@/components/DaylightGauge.vue'

const props = defineProps<{ slug?: string }>()
const router = useRouter()

const isEdit = computed(() => !!props.slug)

const form = reactive({
  date: new Date().toISOString().slice(0, 10),
  title: '',
  location: '',
  unlisted: false,
  hasPage: true,
  bodyMd: '',
  photos: [] as ApiPhoto[],
})

const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const uploading = ref(false)
// Delete asks twice. Not a native confirm(): it would be the one piece of
// chrome on the page the site doesn't own, and it puts the destructive button
// under the Return key of whoever was still typing.
const confirmingDelete = ref(false)
const deleting = ref(false)

// Live Daylight preview for the chosen date — ties the editor to the signature.
const daylight = computed(() => {
  const d = new Date(`${form.date}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : getTheme(d)
})

watch(
  daylight,
  (t) => {
    if (t) setSceneVars(t.vars)
  },
  { immediate: false },
)

onMounted(async () => {
  applyDocumentMeta({
    title: `${isEdit.value ? 'Edit entry' : 'New entry'} — Ett halvår i Sverige`,
    description: 'Editor',
  })
  if (props.slug) {
    loading.value = true
    try {
      const { entry } = await api.getEntry(props.slug)
      form.date = entry.dateISO
      form.title = entry.title ?? ''
      form.location = entry.location ?? ''
      form.unlisted = entry.unlisted
      form.hasPage = entry.hasPage
      form.bodyMd = '' // body_md isn't sent in the public shape; see note below
      form.photos = entry.photos.map((p) => ({ ...p }))
      // Fetch the raw Markdown for editing.
      form.bodyMd = await fetchBodyMd(props.slug)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }
  if (daylight.value) setSceneVars(daylight.value.vars)
})

// The public entry JSON carries rendered HTML, not source Markdown. For editing
// we ask the API for the raw Markdown of this entry.
async function fetchBodyMd(slug: string): Promise<string> {
  try {
    const res = await fetch(`/api/entries/${encodeURIComponent(slug)}/source`, {
      credentials: 'same-origin',
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.bodyMd ?? ''
  } catch {
    return ''
  }
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  error.value = null
  uploading.value = true
  try {
    for (const file of Array.from(input.files)) {
      const { photo } = await api.uploadPhoto(file)
      form.photos.push({ ...photo, alt: '', caption: '' })
    }
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function thumb(p: ApiPhoto): string {
  const w = [...p.widths].sort((a, b) => a - b)[0]
  return `/${p.dir}/${p.name}-${w}.webp`
}

function removePhoto(i: number) {
  form.photos.splice(i, 1)
}
function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= form.photos.length) return
  const [p] = form.photos.splice(i, 1)
  form.photos.splice(j, 0, p)
}

const missingAlt = computed(() => form.photos.some((p) => !p.alt || !p.alt.trim()))

async function onDelete() {
  if (!props.slug) return
  error.value = null
  deleting.value = true
  try {
    await deleteAndRemove(props.slug)
    router.push('/')
  } catch (e) {
    error.value = (e as Error).message
    deleting.value = false
    confirmingDelete.value = false
  }
}

async function onSubmit() {
  error.value = null
  if (missingAlt.value) {
    error.value = 'Every photo needs alt text before you can save.'
    return
  }
  saving.value = true
  const payload = {
    date: form.date,
    title: form.title.trim() || undefined,
    location: form.location.trim() || undefined,
    unlisted: form.unlisted,
    hasPage: form.hasPage,
    bodyMd: form.bodyMd,
    photos: form.photos,
  }
  try {
    const entry = props.slug
      ? await updateEntry(props.slug, payload)
      : await createEntry(payload)
    router.push(`/entry/${entry.slug}`)
  } catch (e) {
    error.value = (e as Error).message
    saving.value = false
  }
}
</script>

<template>
  <div class="editor" :style="daylight?.vars">
    <div class="editor__inner">
      <RouterLink to="/" class="editor__back"><span aria-hidden="true">←</span> Cancel</RouterLink>
      <h1 class="editor__title font-display">{{ isEdit ? 'Edit entry' : 'New entry' }}</h1>

      <p v-if="loading" class="editor__loading">Loading…</p>

      <form v-else class="editor__form" @submit.prevent="onSubmit">
        <div class="row">
          <label class="field field--date">
            <span class="field__label">Date *</span>
            <input v-model="form.date" type="date" required class="field__input" />
          </label>
          <div v-if="daylight" class="daylight-preview">
            <DaylightGauge :info="daylight" />
          </div>
        </div>

        <label class="field">
          <span class="field__label">Title <span class="field__hint">(optional)</span></span>
          <input v-model="form.title" type="text" class="field__input" placeholder="Short entries often have none" />
        </label>

        <label class="field">
          <span class="field__label">Location <span class="field__hint">(optional)</span></span>
          <input v-model="form.location" type="text" class="field__input" placeholder="e.g. Södermalm" />
        </label>

        <label class="field">
          <span class="field__label">Body <span class="field__hint">(Markdown — may be empty if there are photos)</span></span>
          <textarea v-model="form.bodyMd" rows="10" class="field__input field__textarea" placeholder="Write in Markdown…"></textarea>
        </label>

        <fieldset class="photos">
          <legend class="field__label">Photos</legend>
          <ul v-if="form.photos.length" class="photos__list">
            <li v-for="(p, i) in form.photos" :key="p.name" class="photos__item">
              <img :src="thumb(p)" :alt="p.alt || 'uploaded photo'" class="photos__thumb" width="120" height="90" />
              <div class="photos__fields">
                <label class="field">
                  <span class="field__label">Alt text * <span class="field__hint">(describe the photo)</span></span>
                  <input
                    v-model="p.alt"
                    type="text"
                    class="field__input"
                    :class="{ 'is-error': !p.alt || !p.alt.trim() }"
                    required
                  />
                </label>
                <label class="field">
                  <span class="field__label">Caption <span class="field__hint">(optional)</span></span>
                  <input v-model="p.caption" type="text" class="field__input" />
                </label>
              </div>
              <div class="photos__controls">
                <span v-if="i === 0" class="photos__lead">Lead</span>
                <button type="button" @click="move(i, -1)" :disabled="i === 0" title="Move up">↑</button>
                <button type="button" @click="move(i, 1)" :disabled="i === form.photos.length - 1" title="Move down">↓</button>
                <button type="button" class="photos__remove" @click="removePhoto(i)" title="Remove">✕</button>
              </div>
            </li>
          </ul>

          <label class="photos__add">
            <input type="file" accept="image/*" multiple class="sr-only" @change="onFiles" />
            <span>{{ uploading ? 'Uploading…' : '＋ Add photos' }}</span>
          </label>
          <p class="photos__note">Originals are resized to WebP automatically. First photo is the lead.</p>
        </fieldset>

        <label class="checkbox">
          <input v-model="form.hasPage" type="checkbox" />
          <span>
            <strong>Own page</strong> — this entry gets a page of its own to open.
            Turn it off for a short note: it then lives only in the timeline,
            which shows it in full instead of an excerpt.
          </span>
        </label>

        <label class="checkbox">
          <input v-model="form.unlisted" type="checkbox" />
          <span>
            <strong>Unlisted</strong> — reachable by direct link, hidden from the timeline.
          </span>
        </label>

        <p v-if="error" class="editor__error" role="alert">{{ error }}</p>

        <div class="editor__actions">
          <button type="submit" class="editor__save" :disabled="saving || deleting">
            {{ saving ? 'Saving…' : isEdit ? 'Save changes' : 'Publish entry' }}
          </button>
          <RouterLink to="/" class="editor__cancel">Cancel</RouterLink>
        </div>

        <!-- Last thing on the page, and behind a second click. type="button"
             throughout, so neither step can be reached by submitting the form. -->
        <section v-if="isEdit" class="danger">
          <button
            v-if="!confirmingDelete"
            type="button"
            class="danger__start"
            :disabled="saving || deleting"
            @click="confirmingDelete = true"
          >
            Delete entry
          </button>

          <div v-else class="danger__confirm" role="group" aria-label="Confirm deletion">
            <p class="danger__question" role="alert">
              <strong>Delete this entry permanently?</strong>
              This can't be undone. If you only want it off the timeline, cancel
              and tick <em>Unlisted</em> instead — the entry stays, reachable by
              its link.
            </p>
            <div class="danger__buttons">
              <button
                type="button"
                class="danger__go"
                :disabled="deleting"
                @click="onDelete"
              >
                {{ deleting ? 'Deleting…' : 'Yes, delete' }}
              </button>
              <button
                type="button"
                class="danger__keep"
                :disabled="deleting"
                @click="confirmingDelete = false"
              >
                Keep it
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  </div>
</template>

<style scoped>
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
.row {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
.field--date { flex: 0 0 auto; }
.daylight-preview {
  flex: 1;
  min-width: 12rem;
  padding-bottom: 0.4rem;
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
.field__input.is-error { border-color: #c25b3a; }
.field__textarea {
  resize: vertical;
  line-height: 1.6;
  font-family: var(--font-body);
}
.photos {
  border: 1px solid var(--day-hairline);
  border-radius: 8px;
  padding: 1rem;
  margin: 0;
}
.photos__list {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.photos__item {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 0.9rem;
  align-items: start;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--day-hairline);
}
.photos__thumb {
  width: 120px;
  height: 90px;
  object-fit: cover;
  border-radius: 4px;
}
.photos__fields {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.photos__controls {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: center;
}
.photos__controls button {
  font: inherit;
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  border: 1px solid var(--day-hairline);
  background: transparent;
  color: var(--day-ink);
  cursor: pointer;
}
.photos__controls button:disabled { opacity: 0.35; cursor: default; }
.photos__remove { color: #c25b3a !important; }
.photos__lead {
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ochre-bright);
}
.photos__add {
  display: inline-block;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border: 1px dashed var(--day-accent);
  border-radius: 999px;
  color: var(--day-ink);
  font-size: 0.9rem;
}
.photos__note {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: var(--day-ink-muted);
}
.checkbox {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  color: var(--day-ink);
  font-size: 0.95rem;
  line-height: 1.5;
}
.checkbox input { margin-top: 0.25rem; }
.checkbox strong { color: var(--day-ink); }
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
/*
  DELETE — kept at the bottom, behind its own hairline, and two clicks deep.
  The first click only ever swaps in the question; nothing leaves until the
  second one. The copy names the non-destructive way out, because "hide this"
  is what most people actually want when they reach for delete.
*/
.danger {
  --danger: #c25b3a;
  margin-top: 2.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--day-hairline);
}
.danger__start {
  font: inherit;
  font-size: 0.85rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--danger) 45%, transparent);
  background: transparent;
  color: var(--danger);
  cursor: pointer;
  transition:
    background-color 200ms var(--ease-quick),
    border-color 200ms var(--ease-quick);
}
.danger__start:hover:not(:disabled) {
  background: color-mix(in srgb, var(--danger) 14%, transparent);
  border-color: var(--danger);
}
.danger__start:disabled {
  opacity: 0.5;
  cursor: default;
}
.danger__confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem 1.25rem;
}
.danger__question {
  flex: 1 1 20rem;
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--day-ink-muted);
}
.danger__question strong {
  color: var(--day-ink);
}
.danger__buttons {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.danger__go {
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 999px;
  /* Darker than the outline's --danger so white text clears AA on it. */
  background: #a8452a;
  color: #fff;
  cursor: pointer;
}
.danger__go:hover:not(:disabled) {
  filter: brightness(1.08);
}
.danger__go:disabled {
  opacity: 0.6;
  cursor: default;
}
.danger__keep {
  font: inherit;
  font-size: 0.9rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--day-ink-muted);
  cursor: pointer;
}
.danger__keep:hover:not(:disabled) {
  color: var(--day-ink);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 560px) {
  .photos__item {
    grid-template-columns: 1fr;
  }
  .photos__controls {
    flex-direction: row;
  }
}
</style>

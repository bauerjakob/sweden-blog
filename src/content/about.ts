import { ref } from 'vue'
import { api, type ApiAbout, type AboutInput } from '@/api/client'

/*
  The About page is one editable document, so its store is one ref. It is
  fetched on first visit and then kept, which makes a save → back navigation
  show the new text without a second round trip.
*/
const about = ref<ApiAbout | null>(null)
const loaded = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

export async function loadAbout(force = false): Promise<void> {
  if (loaded.value && !force) return
  loading.value = true
  error.value = null
  try {
    const { about: doc } = await api.getAbout()
    about.value = doc
    loaded.value = true
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

/** Save the About page and put the freshly rendered version in the store. */
export async function saveAbout(input: AboutInput): Promise<ApiAbout> {
  const { about: doc } = await api.updateAbout(input)
  about.value = doc
  loaded.value = true
  return doc
}

export function useAbout() {
  return { about, loaded, loading, error }
}

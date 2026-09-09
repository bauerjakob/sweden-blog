import { ref, computed } from 'vue'
import { api } from '@/api/client'
import { loadEntries } from '@/content/store'

const user = ref<{ username: string } | null>(null)
const ready = ref(false) // has the initial /me check completed?

export const isLoggedIn = computed(() => user.value !== null)
export const currentUser = computed(() => user.value)

/** Called once at startup to restore an existing session. */
export async function initAuth(): Promise<void> {
  try {
    const { user: u } = await api.me()
    user.value = u
  } catch {
    user.value = null
  } finally {
    ready.value = true
  }
}

export async function login(username: string, password: string): Promise<void> {
  const { user: u } = await api.login(username, password)
  user.value = u
  // Reload with unlisted entries now that we're the editor.
  await loadEntries(true)
}

export async function logout(): Promise<void> {
  await api.logout()
  user.value = null
  await loadEntries(false)
}

export function useAuth() {
  return { user, ready, isLoggedIn, currentUser }
}

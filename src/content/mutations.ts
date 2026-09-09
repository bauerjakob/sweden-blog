import { api, type EntryInput, type ApiEntry } from '@/api/client'
import { loadEntries } from './store'
import { isLoggedIn } from '@/stores/auth'

/** Create an entry, then refresh the timeline store. Returns the created entry. */
export async function createEntry(input: EntryInput): Promise<ApiEntry> {
  const { entry } = await api.createEntry(input)
  await loadEntries(isLoggedIn.value)
  return entry
}

/** Update an entry, then refresh the store. */
export async function updateEntry(slug: string, input: EntryInput): Promise<ApiEntry> {
  const { entry } = await api.updateEntry(slug, input)
  await loadEntries(isLoggedIn.value)
  return entry
}

/** Delete an entry and drop it from the store. */
export async function deleteAndRemove(slug: string): Promise<void> {
  await api.deleteEntry(slug)
  await loadEntries(isLoggedIn.value)
}

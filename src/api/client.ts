// Thin fetch wrapper around the backend API. Cookies (httpOnly session) ride
// along automatically with same-origin requests.

export interface ApiPhoto {
  name: string
  alt: string
  caption?: string
  w: number
  h: number
  widths: number[]
  dir: 'photos' | 'uploads'
}

export interface ApiEntry {
  slug: string
  dateISO: string
  title?: string
  location?: string
  tags: string[]
  unlisted: boolean
  bodyHtml: string
  excerpt: string
  hasBody: boolean
  photos: ApiPhoto[]
}

export interface EntryInput {
  date: string
  title?: string
  location?: string
  tags?: string[]
  unlisted?: boolean
  bodyMd?: string
  slug?: string
  photos?: ApiPhoto[]
}

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      // Custom header = CSRF token: cross-site requests can't set it without a
      // CORS preflight the server never grants.
      'X-Requested-With': 'fetch',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : null
  if (!res.ok) {
    throw new ApiError((data && data.error) || res.statusText, res.status)
  }
  return data as T
}

export const api = {
  // Auth
  me: () => request<{ user: { username: string } }>('/api/auth/me'),
  login: (username: string, password: string) =>
    request<{ user: { username: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  // Entries
  listEntries: (all = false) =>
    request<{ entries: ApiEntry[] }>(`/api/entries${all ? '?all=1' : ''}`),
  getEntry: (slug: string) => request<{ entry: ApiEntry }>(`/api/entries/${encodeURIComponent(slug)}`),
  createEntry: (input: EntryInput) =>
    request<{ entry: ApiEntry }>('/api/entries', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateEntry: (slug: string, input: EntryInput) =>
    request<{ entry: ApiEntry }>(`/api/entries/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteEntry: (slug: string) =>
    request<{ ok: true }>(`/api/entries/${encodeURIComponent(slug)}`, { method: 'DELETE' }),

  // Photos — multipart upload (no JSON content-type; browser sets boundary).
  uploadPhoto: async (file: File): Promise<{ photo: ApiPhoto }> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/photos', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'fetch' },
      body: form,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError((data && data.error) || res.statusText, res.status)
    return data
  },
}

export { ApiError }

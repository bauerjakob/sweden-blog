/** Slugify, Swedish-aware: å/ä → a, ö → o, etc. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/å|ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é|è|ê/g, 'e')
    .replace(/ü/g, 'u')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Build a shareable slug from the entry's date and (optional) title. */
export function makeSlug(dateISO: string, title?: string): string {
  const titlePart = title ? slugify(title) : 'note'
  return `${dateISO}-${titlePart}`
}

// Office names are almost always Hebrew, so an ASCII-only slugify of the
// name often comes back empty -- or, for a name like "משרד אימות 2" (a
// trailing branch number, a realistic Hebrew office name), comes back as a
// single leftover digit: non-empty, but still below the backend's own
// tenantSlug.min(2) -- registration failed with a validation error for a
// name that looks completely ordinary (found live, not by inspection).
// Fall back to a random id whenever the result is too short, not just empty.
export function slugify(value: string): string {
  const ascii = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return ascii.length >= 2 ? ascii : `office-${Math.random().toString(36).slice(2, 8)}`
}

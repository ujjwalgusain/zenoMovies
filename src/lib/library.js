export function readStoredItems(key) {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeStoredItems(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {}
}

export function toggleStoredItem(key, item) {
  const items = readStoredItems(key)
  const exists = items.some((entry) => entry.id === item.id)
  const nextItems = exists
    ? items.filter((entry) => entry.id !== item.id)
    : [item, ...items].slice(0, 24)

  writeStoredItems(key, nextItems)
  return nextItems
}

export function pushRecentItem(key, item, limit = 12) {
  const items = readStoredItems(key).filter((entry) => entry.id !== item.id)
  const nextItems = [item, ...items].slice(0, limit)
  writeStoredItems(key, nextItems)
  return nextItems
}

export function uniqueTitles(items) {
  const seen = new Set()
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function genreOptions(items) {
  const genres = new Set()
  items.forEach((item) => {
    String(item.genre || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((genre) => genres.add(genre))
  })
  return ['All genres', ...Array.from(genres).sort((a, b) => a.localeCompare(b))]
}

export function filterAndSortTitles(items, genre, sortMode) {
  const filtered = genre && genre !== 'All genres'
    ? items.filter((item) => String(item.genre || '').includes(genre))
    : [...items]

  filtered.sort((left, right) => {
    if (sortMode === 'year') return Number(right.year || 0) - Number(left.year || 0)
    if (sortMode === 'title') return String(left.title || '').localeCompare(String(right.title || ''))
    return Number(right.rating || 0) - Number(left.rating || 0)
  })

  return filtered
}

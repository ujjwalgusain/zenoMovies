export const OMDB_KEY = import.meta.env.VITE_OMDB_KEY || 'f07d8c6a'
export const TMDB_KEY = import.meta.env.VITE_TMDB_KEY || '4e3e9b1a858447c06f5732d2064c5e98'
export const EMBED_API_KEY = import.meta.env.VITE_EMBED_API_KEY || 'nx_b0dcca19f625fe98a5712de62cfaa135'
export const EMBED_BASE = 'https://api.codespecters.com'
const OMDB_BASE = 'https://www.omdbapi.com/'
const TMDB_BASE = 'https://api.themoviedb.org/3'

export const movieQuickSearches = ['Dune', 'Oppenheimer', 'John Wick', 'Interstellar']
export const seriesQuickSearches = ['Severance', 'The Bear', 'Dark', 'Stranger Things']

const movieCollections = [
  { title: 'Blockbuster Pulse', description: 'Big-screen spectacles worth queueing up tonight.', queries: ['Dune', 'Oppenheimer', 'Mad Max: Fury Road', 'Spider-Man: Into the Spider-Verse'] },
  { title: 'Mind-Bending Picks', description: 'Clever, tense, and impossible to stop thinking about.', queries: ['Interstellar', 'Inception', 'Arrival', 'The Prestige'] },
  { title: 'Late Night Thrills', description: 'Fast-moving action when you want something immediate.', queries: ['John Wick', 'Nobody', 'Mission: Impossible - Fallout', 'The Batman'] },
]

const seriesCollections = [
  { title: 'Prestige Series', description: 'High-impact drama and suspense for longer binges.', queries: ['Severance', 'The Last of Us', 'Dark', 'Silo'] },
  { title: 'Crowd Favorites', description: 'Popular shows with easy momentum and sharp hooks.', queries: ['Stranger Things', 'The Bear', 'Breaking Bad', 'Peaky Blinders'] },
  { title: 'Sci-Fi Escapes', description: 'Smart worlds, strange tech, and cliffhanger energy.', queries: ['Andor', 'Foundation', 'Black Mirror', 'The Expanse'] },
]

async function omdbFetch(params) {
  const url = new URL(OMDB_BASE)
  url.searchParams.set('apikey', OMDB_KEY)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`OMDb error: ${res.status}`)
  const data = await res.json()
  if (data.Response === 'False') throw new Error(data.Error || 'OMDb request failed')
  return data
}

async function tmdbFetch(path) {
  const res = await fetch(`${TMDB_BASE}${path}`)
  if (!res.ok) throw new Error(`TMDb error: ${res.status}`)
  return res.json()
}

async function resolveTmdbId(imdbId, type) {
  if (!imdbId) return null

  try {
    const data = await tmdbFetch(`/find/${imdbId}?api_key=${TMDB_KEY}&external_source=imdb_id`)
    if (type === 'series') {
      return data.tv_results?.[0]?.id ?? null
    }
    return data.movie_results?.[0]?.id ?? null
  } catch {
    return null
  }
}

async function normalizeTitle(data) {
  const itemType = data.Type === 'series' ? 'series' : 'movie'
  const tmdbId = await resolveTmdbId(data.imdbID, itemType)

  return {
    id: data.imdbID,
    streamId: tmdbId,
    title: data.Title,
    year: getYear(data.Year),
    rating: formatRating(data.imdbRating),
    poster: posterUrl(data.Poster),
    plot: data.Plot && data.Plot !== 'N/A' ? data.Plot : '',
    genre: data.Genre && data.Genre !== 'N/A' ? data.Genre : '',
    runtime: data.Runtime && data.Runtime !== 'N/A' ? data.Runtime : '',
    totalSeasons: data.totalSeasons ? Number(data.totalSeasons) : null,
    type: itemType,
  }
}

async function hydrateSearchItems(items) {
  const hydrated = await Promise.all(
    items.map(async (item) => {
      try {
        const full = await omdbFetch({ i: item.imdbID, plot: 'short' })
        return normalizeTitle(full)
      } catch {
        return normalizeTitle(item)
      }
    }),
  )

  return hydrated.filter(Boolean)
}

async function searchTitles(query, type) {
  const data = await omdbFetch({ s: query, type, page: 1 })
  return hydrateSearchItems(data.Search || [])
}

async function loadCuratedSections(definitions, type) {
  const sections = await Promise.all(
    definitions.map(async (section) => {
      const items = await Promise.all(
        section.queries.map(async (query) => {
          try {
            const results = await searchTitles(query, type)
            return results[0] || null
          } catch {
            return null
          }
        }),
      )

      return {
        title: section.title,
        description: section.description,
        items: items.filter(Boolean),
      }
    }),
  )

  return sections.filter((section) => section.items.length > 0)
}

export const api = {
  searchMovies: (query) => searchTitles(query, 'movie'),
  searchTV: (query) => searchTitles(query, 'series'),
  curatedMovies: () => loadCuratedSections(movieCollections, 'movie'),
  curatedTV: () => loadCuratedSections(seriesCollections, 'series'),
  movieDetails: async (id) => normalizeTitle(await omdbFetch({ i: id, plot: 'full' })),
  tvDetails: async (id) => normalizeTitle(await omdbFetch({ i: id, plot: 'full' })),
  seasonDetails: async (id, season) => {
    const data = await omdbFetch({ i: id, Season: season })
    return (data.Episodes || []).map((episode) => ({
      id: `${id}-s${season}-e${episode.Episode}`,
      number: Number(episode.Episode),
      title: episode.Title,
      released: episode.Released !== 'N/A' ? episode.Released : '',
      rating: formatRating(episode.imdbRating),
    }))
  },
}

export function movieEmbedUrl(id) {
  return `${EMBED_BASE}/embed/movie/${id}?apikey=${EMBED_API_KEY}`
}

export function tvEmbedUrl(id, season, episode) {
  return `${EMBED_BASE}/embed/tv/${id}/${season}/${episode}?apikey=${EMBED_API_KEY}`
}

export function posterUrl(url) {
  return url && url !== 'N/A' ? url : null
}

export function formatRating(rating) {
  if (!rating || rating === 'N/A') return null
  const parsed = Number.parseFloat(rating)
  return Number.isFinite(parsed) ? parsed.toFixed(1) : null
}

export function getYear(value) {
  if (!value) return ''
  const match = String(value).match(/\d{4}/)
  return match ? match[0] : ''
}

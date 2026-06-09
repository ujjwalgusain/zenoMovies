export const TMDB_KEY = import.meta.env.VITE_TMDB_KEY || '4e3e9b1a858447c06f5732d2064c5e98'
export const EMBED_API_KEY = import.meta.env.VITE_EMBED_API_KEY || 'nx_b0dcca19f625fe98a5712de62cfaa135'
export const EMBED_BASE = 'https://api.codespecters.com'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

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

async function tmdbFetch(path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('api_key', TMDB_KEY)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDb error: ${res.status}`)
  return res.json()
}

function normalizeMovie(data) {
  return {
    id: `movie-${data.id}`,
    streamId: data.id,
    title: data.title || '',
    year: getYear(data.release_date),
    rating: formatRating(data.vote_average),
    poster: posterUrl(data.poster_path),
    plot: data.overview || '',
    genre: formatGenres(data.genres || data.genre_ids),
    runtime: formatRuntime(data.runtime),
    totalSeasons: null,
    type: 'movie',
  }
}

function normalizeSeries(data) {
  return {
    id: `series-${data.id}`,
    streamId: data.id,
    title: data.name || '',
    year: getYear(data.first_air_date),
    rating: formatRating(data.vote_average),
    poster: posterUrl(data.poster_path),
    plot: data.overview || '',
    genre: formatGenres(data.genres || data.genre_ids),
    runtime: formatEpisodeRuntime(data.episode_run_time),
    totalSeasons: data.number_of_seasons ?? null,
    type: 'series',
  }
}

async function searchTitles(query, type) {
  const endpoint = type === 'series' ? '/search/tv' : '/search/movie'
  const data = await tmdbFetch(endpoint, { query, page: 1, include_adult: false })
  const items = data.results || []
  return items.map((item) => (type === 'series' ? normalizeSeries(item) : normalizeMovie(item)))
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
  movieDetails: async (id) => normalizeMovie(await tmdbFetch(`/movie/${stripPrefix(id)}`)),
  tvDetails: async (id) => normalizeSeries(await tmdbFetch(`/tv/${stripPrefix(id)}`)),
  seasonDetails: async (id, season) => {
    const seriesId = stripPrefix(id)
    const data = await tmdbFetch(`/tv/${seriesId}/season/${season}`)
    return (data.episodes || []).map((episode) => ({
      id: `series-${seriesId}-s${season}-e${episode.episode_number}`,
      number: Number(episode.episode_number),
      title: episode.name || `Episode ${episode.episode_number}`,
      released: episode.air_date || '',
      rating: formatRating(episode.vote_average),
    }))
  },
}

export function movieEmbedUrl(id) {
  return `${EMBED_BASE}/embed/movie/${id}?apikey=${EMBED_API_KEY}`
}

export function tvEmbedUrl(id, season, episode) {
  return `${EMBED_BASE}/embed/tv/${id}/${season}/${episode}?apikey=${EMBED_API_KEY}`
}

function stripPrefix(id) {
  return String(id).replace(/^(movie|series)-/, '')
}

export function posterUrl(path) {
  return path ? `${TMDB_IMAGE_BASE}${path}` : null
}

function formatGenres(genres) {
  if (!genres) return ''
  if (Array.isArray(genres) && genres.length && typeof genres[0] === 'object') {
    return genres.map((genre) => genre.name).filter(Boolean).join(', ')
  }
  if (Array.isArray(genres)) {
    return genres
      .map((genreId) => GENRE_LOOKUP[genreId])
      .filter(Boolean)
      .join(', ')
  }
  return ''
}

function formatRuntime(runtime) {
  if (!runtime) return ''
  return `${runtime} min`
}

function formatEpisodeRuntime(runtimeList) {
  const runtime = Array.isArray(runtimeList) ? runtimeList[0] : runtimeList
  return runtime ? `${runtime} min` : ''
}

export function formatRating(rating) {
  const parsed = Number.parseFloat(rating)
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(1) : null
}

export function getYear(value) {
  if (!value) return ''
  const match = String(value).match(/\d{4}/)
  return match ? match[0] : ''
}

const GENRE_LOOKUP = {
  12: 'Adventure',
  14: 'Fantasy',
  16: 'Animation',
  18: 'Drama',
  27: 'Horror',
  28: 'Action',
  35: 'Comedy',
  36: 'History',
  37: 'Western',
  53: 'Thriller',
  80: 'Crime',
  878: 'Science Fiction',
  9648: 'Mystery',
  99: 'Documentary',
  10402: 'Music',
  10749: 'Romance',
  10751: 'Family',
  10752: 'War',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  10770: 'TV Movie',
}

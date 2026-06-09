import React, { useEffect, useMemo, useRef, useState } from 'react'
import { api, movieEmbedUrl, movieQuickSearches } from '../lib/api.js'
import MediaGrid from '../components/MediaGrid.jsx'
import Player from '../components/Player.jsx'
import {
  filterAndSortTitles,
  genreOptions,
  pushRecentItem,
  readStoredItems,
  toggleStoredItem,
  uniqueTitles,
} from '../lib/library.js'
import styles from './Movies.module.css'

const FAVORITES_KEY = 'zm_movies_favorites'
const RECENT_KEY = 'zm_movies_recent'

function persist(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function hydrate(key, fallback = null) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export default function Movies() {
  const [query, setQuery] = useState(() => hydrate('mv_query', ''))
  const [results, setResults] = useState([])
  const [collections, setCollections] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [loadingCollections, setLoadingCollections] = useState(true)
  const [player, setPlayer] = useState(() => hydrate('mv_player'))
  const [activeItem, setActiveItem] = useState(null)
  const [favorites, setFavorites] = useState(() => readStoredItems(FAVORITES_KEY))
  const [recent, setRecent] = useState(() => readStoredItems(RECENT_KEY))
  const [genre, setGenre] = useState('All genres')
  const [sortMode, setSortMode] = useState('rating')
  const playerAnchorRef = useRef(null)

  useEffect(() => {
    let alive = true

    api.curatedMovies()
      .then((data) => {
        if (alive) setCollections(data)
      })
      .finally(() => {
        if (alive) setLoadingCollections(false)
      })

    const savedQuery = hydrate('mv_query', '')
    if (savedQuery) {
      setLoadingSearch(true)
      api.searchMovies(savedQuery)
        .then((items) => {
          if (alive) setResults(items)
        })
        .finally(() => {
          if (alive) setLoadingSearch(false)
        })
    }

    return () => {
      alive = false
    }
  }, [])

  const allKnownTitles = useMemo(
    () => uniqueTitles([...results, ...collections.flatMap((section) => section.items), ...favorites, ...recent]),
    [collections, favorites, recent, results],
  )
  const spotlight = useMemo(() => collections[0]?.items?.[0] || results[0] || favorites[0] || null, [collections, favorites, results])
  const showingResults = query.trim().length > 0
  const genres = useMemo(() => genreOptions(allKnownTitles), [allKnownTitles])
  const favoriteIds = useMemo(() => favorites.map((item) => item.id), [favorites])
  const playableCount = allKnownTitles.filter((item) => item.streamId).length
  const filteredResults = useMemo(() => filterAndSortTitles(results, genre, sortMode), [genre, results, sortMode])
  const filteredFavorites = useMemo(() => filterAndSortTitles(favorites, genre, sortMode), [favorites, genre, sortMode])
  const filteredRecent = useMemo(() => filterAndSortTitles(recent, genre, sortMode), [genre, recent, sortMode])
  const displayCollections = useMemo(
    () => collections
      .map((section) => ({ ...section, items: filterAndSortTitles(section.items, genre, sortMode) }))
      .filter((section) => section.items.length > 0),
    [collections, genre, sortMode],
  )

  async function runSearch(nextQuery) {
    const clean = nextQuery.trim()
    setQuery(clean)
    persist('mv_query', clean)

    if (!clean) {
      setResults([])
      return
    }

    setLoadingSearch(true)
    const items = await api.searchMovies(clean)
    setResults(items)
    setLoadingSearch(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    runSearch(query)
  }

  function toggleFavorite(item) {
    setFavorites(toggleStoredItem(FAVORITES_KEY, item))
  }

  function select(item) {
    if (!item.streamId) {
      window.alert('Playback is unavailable for this title because no TMDb match was found.')
      return
    }

    setActiveItem(item)
    setRecent(pushRecentItem(RECENT_KEY, item))

    const nextPlayer = {
      src: movieEmbedUrl(item.streamId),
      title: item.title,
      year: item.year,
      rating: item.rating,
      overview: item.plot,
      genre: item.genre,
      runtime: item.runtime,
      selectedId: item.id,
    }
    setPlayer(nextPlayer)
    persist('mv_player', nextPlayer)
    setTimeout(() => {
      playerAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>zenoMovies</p>
          <h1 className={styles.heroTitle}>Modern movie discovery with a personal watchlist built in.</h1>
          <p className={styles.heroText}>
            Search with OMDb, stream through NexStream, sort by rating or year, and keep your own saved list and recent queue on one polished dashboard.
          </p>

          <form className={styles.searchRow} onSubmit={handleSubmit}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search movies by title"
              className={styles.input}
            />
            <button type="submit" className={styles.primaryBtn}>Search</button>
          </form>

          <div className={styles.quickRow}>
            {movieQuickSearches.map((label) => (
              <button key={label} type="button" className={styles.chip} onClick={() => runSearch(label)}>
                {label}
              </button>
            ))}
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Curated rows</span>
              <strong>{collections.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Watchlist</span>
              <strong>{favorites.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Playable now</span>
              <strong>{playableCount}</strong>
            </div>
          </div>
        </div>

        {spotlight ? (
          <button type="button" className={styles.spotlightCard} onClick={() => select(spotlight)}>
            <div className={styles.spotlightArt}>
              {spotlight.poster && <img src={spotlight.poster} alt={spotlight.title} />}
            </div>
            <div className={styles.spotlightBody}>
              <p className={styles.spotlightLabel}>Featured Tonight</p>
              <h2>{spotlight.title}</h2>
              <p>{spotlight.plot || 'Open the featured title and jump straight into playback from the hero panel.'}</p>
              <div className={styles.spotlightMeta}>
                {spotlight.year && <span>{spotlight.year}</span>}
                {spotlight.rating && <span>IMDb {spotlight.rating}</span>}
                {spotlight.runtime && <span>{spotlight.runtime}</span>}
                <span>{spotlight.streamId ? 'Ready to play' : 'Metadata only'}</span>
              </div>
            </div>
          </button>
        ) : (
          <div className={`${styles.spotlightCard} ${styles.spotlightEmpty}`}>
            <div className={styles.spotlightBody}>
              <p className={styles.spotlightLabel}>Featured Tonight</p>
              <h2>Your featured movie will appear here</h2>
              <p>Use quick search chips or type a title above to start building the homepage with real picks, ratings, and playback-ready cards.</p>
            </div>
          </div>
        )}
      </section>

      <section className={styles.controlPanel}>
        <div>
          <p className={styles.sectionEyebrow}>Discover Controls</p>
          <h2 className={styles.panelTitle}>Refine what shows up across search, watchlist, and collections.</h2>
        </div>
        <div className={styles.filters}>
          <label className={styles.field}>
            <span>Genre</span>
            <select value={genre} onChange={(event) => setGenre(event.target.value)} className={styles.select}>
              {genres.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Sort by</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className={styles.select}>
              <option value="rating">Highest rating</option>
              <option value="year">Newest year</option>
              <option value="title">Title A-Z</option>
            </select>
          </label>
        </div>
      </section>

      {player && (
        <div ref={playerAnchorRef}>
          <Player
            {...player}
            favorite={favoriteIds.includes(activeItem?.id)}
            onToggleFavorite={activeItem ? () => toggleFavorite(activeItem) : undefined}
            onClose={() => {
              setPlayer(null)
              persist('mv_player', null)
            }}
          />
        </div>
      )}

      {filteredFavorites.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionEyebrow}>Your Watchlist</p>
              <h2 className={styles.sectionTitle}>Saved movies worth keeping close</h2>
            </div>
            <p className={styles.sectionText}>Use Save on any card to build a personal shelf that stays between visits.</p>
          </div>
          <MediaGrid
            items={filteredFavorites}
            onSelect={select}
            selectedId={player?.selectedId}
            favorites={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        </section>
      )}

      {filteredRecent.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionEyebrow}>Recently Opened</p>
              <h2 className={styles.sectionTitle}>Pick up where you left off</h2>
            </div>
            <p className={styles.sectionText}>Every title you open is kept here for quick return access.</p>
          </div>
          <MediaGrid
            items={filteredRecent}
            onSelect={select}
            selectedId={player?.selectedId}
            favorites={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        </section>
      )}

      {showingResults ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionEyebrow}>Search Results</p>
              <h2 className={styles.sectionTitle}>Matches for "{query}"</h2>
            </div>
            <button type="button" className={styles.secondaryBtn} onClick={() => runSearch('')}>
              Clear search
            </button>
          </div>
          <MediaGrid
            items={filteredResults}
            onSelect={select}
            selectedId={player?.selectedId}
            loading={loadingSearch}
            emptyMessage="No movie matches came back from OMDb."
            favorites={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        </section>
      ) : (
        displayCollections.map((section) => (
          <section key={section.title} className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.sectionEyebrow}>Curated Collection</p>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
              </div>
              <p className={styles.sectionText}>{section.description}</p>
            </div>
            <MediaGrid
              items={section.items}
              onSelect={select}
              selectedId={player?.selectedId}
              loading={loadingCollections}
              favorites={favoriteIds}
              onToggleFavorite={toggleFavorite}
            />
          </section>
        ))
      )}
    </div>
  )
}

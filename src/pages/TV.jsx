import React, { useEffect, useMemo, useRef, useState } from 'react'
import { api, seriesQuickSearches, tvEmbedUrl } from '../lib/api.js'
import MediaGrid from '../components/MediaGrid.jsx'
import Player from '../components/Player.jsx'
import SeasonPicker from '../components/SeasonPicker.jsx'
import {
  filterAndSortTitles,
  genreOptions,
  pushRecentItem,
  readStoredItems,
  toggleStoredItem,
  uniqueTitles,
} from '../lib/library.js'
import styles from './TV.module.css'

const FAVORITES_KEY = 'zm_tv_favorites'
const RECENT_KEY = 'zm_tv_recent'

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

export default function TV() {
  const [query, setQuery] = useState(() => hydrate('tv_query', ''))
  const [results, setResults] = useState([])
  const [collections, setCollections] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [loadingCollections, setLoadingCollections] = useState(true)
  const [selected, setSelected] = useState(() => hydrate('tv_selected'))
  const [player, setPlayer] = useState(() => hydrate('tv_player'))
  const [favorites, setFavorites] = useState(() => readStoredItems(FAVORITES_KEY))
  const [recent, setRecent] = useState(() => readStoredItems(RECENT_KEY))
  const [genre, setGenre] = useState('All genres')
  const [sortMode, setSortMode] = useState('rating')
  const playerAnchorRef = useRef(null)

  useEffect(() => {
    let alive = true

    api.curatedTV()
      .then((data) => {
        if (alive) setCollections(data)
      })
      .finally(() => {
        if (alive) setLoadingCollections(false)
      })

    const savedQuery = hydrate('tv_query', '')
    if (savedQuery) {
      setLoadingSearch(true)
      api.searchTV(savedQuery)
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
    persist('tv_query', clean)

    if (!clean) {
      setResults([])
      return
    }

    setLoadingSearch(true)
    const items = await api.searchTV(clean)
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

  function selectShow(item) {
    setSelected(item)
    setPlayer(null)
    persist('tv_selected', item)
    persist('tv_player', null)
    setTimeout(() => {
      document.getElementById('season-picker-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function playEpisode(season, episode) {
    if (!selected?.streamId) {
      window.alert('Playback is unavailable for this show because no TMDb match was found.')
      return
    }

    setRecent(pushRecentItem(RECENT_KEY, selected))

    const nextPlayer = {
      src: tvEmbedUrl(selected.streamId, season, episode),
      title: selected.title,
      year: selected.year,
      rating: selected.rating,
      overview: selected.plot,
      genre: selected.genre,
      badge: `S${season} • E${episode}`,
      selectedId: selected.id,
    }
    setPlayer(nextPlayer)
    persist('tv_player', nextPlayer)
    setTimeout(() => {
      playerAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Series Lounge</p>
          <h1 className={styles.heroTitle}>A TV hub for watchlists, recent shows, and fast episode pickup.</h1>
          <p className={styles.heroText}>
            Save the series you care about, keep a recent queue, and filter your discovery rows while the episode guide stays right below the fold.
          </p>

          <form className={styles.searchRow} onSubmit={handleSubmit}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search TV series by title"
              className={styles.input}
            />
            <button type="submit" className={styles.primaryBtn}>Search</button>
          </form>

          <div className={styles.quickRow}>
            {seriesQuickSearches.map((label) => (
              <button key={label} type="button" className={styles.chip} onClick={() => runSearch(label)}>
                {label}
              </button>
            ))}
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Series rows</span>
              <strong>{collections.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Saved shows</span>
              <strong>{favorites.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Playable now</span>
              <strong>{playableCount}</strong>
            </div>
          </div>
        </div>

        {spotlight ? (
          <button type="button" className={styles.spotlightCard} onClick={() => selectShow(spotlight)}>
            <div className={styles.spotlightArt}>
              {spotlight.poster && <img src={spotlight.poster} alt={spotlight.title} />}
            </div>
            <div className={styles.spotlightBody}>
              <p className={styles.spotlightLabel}>Series Spotlight</p>
              <h2>{spotlight.title}</h2>
              <p>{spotlight.plot || 'Choose the spotlighted show to open its season guide and jump into episodes.'}</p>
              <div className={styles.spotlightMeta}>
                {spotlight.year && <span>{spotlight.year}</span>}
                {spotlight.rating && <span>IMDb {spotlight.rating}</span>}
                {spotlight.totalSeasons && <span>{spotlight.totalSeasons} seasons</span>}
                <span>{spotlight.streamId ? 'Episode-ready' : 'Metadata only'}</span>
              </div>
            </div>
          </button>
        ) : (
          <div className={`${styles.spotlightCard} ${styles.spotlightEmpty}`}>
            <div className={styles.spotlightBody}>
              <p className={styles.spotlightLabel}>Series Spotlight</p>
              <h2>Your featured series will appear here</h2>
              <p>Search for a show or use the quick chips to populate the series side with a richer episode-first experience.</p>
            </div>
          </div>
        )}
      </section>

      <section className={styles.controlPanel}>
        <div>
          <p className={styles.sectionEyebrow}>Browse Tools</p>
          <h2 className={styles.panelTitle}>Shape the catalog, then save the shows you want to come back to.</h2>
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
            favorite={favoriteIds.includes(selected?.id)}
            onToggleFavorite={selected ? () => toggleFavorite(selected) : undefined}
            onClose={() => {
              setPlayer(null)
              persist('tv_player', null)
            }}
          />
        </div>
      )}

      {selected && (
        <div id="season-picker-anchor">
          <SeasonPicker show={selected} onPlay={playEpisode} />
        </div>
      )}

      {filteredFavorites.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionEyebrow}>Your Watchlist</p>
              <h2 className={styles.sectionTitle}>Saved series ready for another episode</h2>
            </div>
            <p className={styles.sectionText}>Saved shows remain here even after you close the browser.</p>
          </div>
          <MediaGrid
            items={filteredFavorites}
            onSelect={selectShow}
            selectedId={selected?.id}
            favorites={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        </section>
      )}

      {filteredRecent.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionEyebrow}>Recently Played</p>
              <h2 className={styles.sectionTitle}>Jump back into the last shows you opened</h2>
            </div>
            <p className={styles.sectionText}>This rail updates whenever you start an episode.</p>
          </div>
          <MediaGrid
            items={filteredRecent}
            onSelect={selectShow}
            selectedId={selected?.id}
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
              <h2 className={styles.sectionTitle}>Series matches for "{query}"</h2>
            </div>
            <button type="button" className={styles.secondaryBtn} onClick={() => runSearch('')}>
              Clear search
            </button>
          </div>
          <MediaGrid
            items={filteredResults}
            onSelect={selectShow}
            selectedId={selected?.id}
            loading={loadingSearch}
            emptyMessage="No series matches came back from OMDb."
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
              onSelect={selectShow}
              selectedId={selected?.id}
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

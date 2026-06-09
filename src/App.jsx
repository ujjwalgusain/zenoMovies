import React, { useState } from 'react'
import Movies from './pages/Movies.jsx'
import TV from './pages/TV.jsx'
import styles from './App.module.css'

function clearMovieSession() {
  ['mv_query', 'mv_player'].forEach((key) => sessionStorage.removeItem(key))
}

export default function App() {
  const [tab, setTab] = useState(() => sessionStorage.getItem('zm_tab') || 'movies')
  const [homeKey, setHomeKey] = useState(0)

  function goTab(nextTab) {
    setTab(nextTab)
    sessionStorage.setItem('zm_tab', nextTab)
  }

  function goHome() {
    clearMovieSession()
    setTab('movies')
    sessionStorage.setItem('zm_tab', 'movies')
    setHomeKey((value) => value + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={styles.app}>
      <div className={styles.backdrop} />

      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <button className={styles.logo} onClick={goHome} aria-label="Go to zenoMovies home">
            <span className={styles.logoMark}>Z</span>
            <span className={styles.logoText}>zenoMovies</span>
          </button>
          <p className={styles.tagline}>Your personal movie-and-series launcher with saved shelves and instant playback.</p>
        </div>

        <nav className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'movies' ? styles.active : ''}`}
            onClick={() => goTab('movies')}
          >
            Movies
          </button>
          <button
            className={`${styles.tab} ${tab === 'tv' ? styles.active : ''}`}
            onClick={() => goTab('tv')}
          >
            TV Series
          </button>
        </nav>
      </header>

      <main className={styles.main}>
        {tab === 'movies' ? <Movies key={homeKey} /> : <TV />}
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerText}>zenoMovies pairs OMDb discovery, TMDb playback resolution, and NexStream embeds in one streamlined interface.</p>
      </footer>
    </div>
  )
}

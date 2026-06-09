import React, { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import styles from './SeasonPicker.module.css'

export default function SeasonPicker({ show, onPlay }) {
  const [seasonNumbers, setSeasonNumbers] = useState([])
  const [activeSeason, setActiveSeason] = useState(1)
  const [episodes, setEpisodes] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!show?.id) return

    let alive = true

    api.tvDetails(show.id)
      .then((details) => {
        if (!alive) return
        const total = details.totalSeasons || show.totalSeasons || 1
        const nextSeasons = Array.from({ length: total }, (_, index) => index + 1)
        setSeasonNumbers(nextSeasons)
        setActiveSeason(1)
      })
      .catch(() => {
        if (!alive) return
        setSeasonNumbers([1])
        setActiveSeason(1)
      })

    return () => {
      alive = false
    }
  }, [show?.id, show?.totalSeasons])

  useEffect(() => {
    if (!show?.id || !activeSeason) return

    let alive = true
    setLoading(true)
    setEpisodes([])

    api.seasonDetails(show.id, activeSeason)
      .then((seasonEpisodes) => {
        if (alive) setEpisodes(seasonEpisodes)
      })
      .catch(() => {
        if (alive) setEpisodes([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [show?.id, activeSeason])

  if (!show) return null

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Episode Guide</p>
          <h3 className={styles.showName}>{show.title}</h3>
        </div>
        {show.year && <span className={styles.showYear}>{show.year}</span>}
      </div>

      <div className={styles.seasonTabs}>
        {seasonNumbers.map((season) => (
          <button
            key={season}
            type="button"
            className={`${styles.seasonTab} ${activeSeason === season ? styles.active : ''}`}
            onClick={() => setActiveSeason(season)}
          >
            Season {season}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.episodeGrid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className={styles.skeleton} />
          ))}
        </div>
      ) : episodes.length ? (
        <div className={styles.episodeGrid}>
          {episodes.map((episode) => (
            <button
              key={episode.id}
              type="button"
              className={styles.episodeCard}
              onClick={() => onPlay(activeSeason, episode.number)}
            >
              <span className={styles.episodeNumber}>Episode {episode.number}</span>
              <strong className={styles.episodeTitle}>{episode.title}</strong>
              <span className={styles.episodeMeta}>
                {episode.rating ? `IMDb ${episode.rating}` : 'Ready to stream'}
                {episode.released ? ` | ${episode.released}` : ''}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>TMDb did not return episode data for this season.</p>
      )}
    </section>
  )
}

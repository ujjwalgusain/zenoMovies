import React from 'react'
import styles from './Player.module.css'

export default function Player({
  src,
  title,
  year,
  rating,
  overview,
  badge,
  genre,
  runtime,
  onClose,
  favorite,
  onToggleFavorite,
}) {
  if (!src) return null

  return (
    <section className={styles.wrap}>
      <div className={styles.copy}>
        <div className={styles.metaTop}>
          <div>
            <p className={styles.eyebrow}>Now Playing</p>
            <h2 className={styles.title}>{title}</h2>
          </div>
          {onClose && (
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close player">
              Close
            </button>
          )}
        </div>

        <div className={styles.pills}>
          {year && <span className={styles.pill}>{year}</span>}
          {rating && <span className={`${styles.pill} ${styles.highlight}`}>IMDb {rating}</span>}
          {runtime && <span className={styles.pill}>{runtime}</span>}
          {badge && <span className={styles.pill}>{badge}</span>}
        </div>

        {genre && <p className={styles.genre}>{genre}</p>}
        {overview && <p className={styles.overview}>{overview}</p>}

        {onToggleFavorite && (
          <div className={styles.actionRow}>
            <button type="button" className={styles.favoriteBtn} onClick={onToggleFavorite}>
              {favorite ? 'Remove from Watchlist' : 'Save to Watchlist'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.playerBox}>
        <iframe
          src={src}
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          title={title}
        />
      </div>
    </section>
  )
}

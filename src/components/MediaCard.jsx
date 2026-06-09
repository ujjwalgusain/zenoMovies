import React from 'react'
import styles from './MediaCard.module.css'

export default function MediaCard({ item, onClick, selected, favorite, onToggleFavorite }) {
  return (
    <article className={`${styles.card} ${selected ? styles.selected : ''}`}>
      <button type="button" className={styles.hitArea} onClick={() => onClick(item)}>
        <div className={styles.poster}>
          {item.poster ? (
            <img src={item.poster} alt={item.title} loading="lazy" />
          ) : (
            <div className={styles.noPoster}>
              <span>{item.title?.slice(0, 2) || 'ZM'}</span>
            </div>
          )}
        </div>

        <div className={styles.overlay}>
          <div className={styles.topLine}>
            {item.rating && <span className={styles.rating}>IMDb {item.rating}</span>}
            {item.type && <span className={styles.type}>{item.type}</span>}
          </div>
          <div>
            <h3 className={styles.title}>{item.title}</h3>
            <p className={styles.meta}>
              {item.year || 'Unknown year'}
              {item.genre ? ` • ${item.genre}` : ''}
            </p>
          </div>
        </div>
      </button>

      <div className={styles.actions}>
        <span className={`${styles.status} ${item.streamId ? styles.ready : styles.unavailable}`}>
          {item.streamId ? 'Playable' : 'No stream'}
        </span>
        {onToggleFavorite && (
          <button
            type="button"
            className={`${styles.favoriteBtn} ${favorite ? styles.favoriteActive : ''}`}
            onClick={() => onToggleFavorite(item)}
            aria-label={favorite ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {favorite ? 'Saved' : 'Save'}
          </button>
        )}
      </div>
    </article>
  )
}

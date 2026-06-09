import React from 'react'
import MediaCard from './MediaCard.jsx'
import styles from './MediaGrid.module.css'

export default function MediaGrid({
  items,
  onSelect,
  selectedId,
  loading,
  emptyMessage = 'No titles found.',
  favorites = [],
  onToggleFavorite,
}) {
  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className={styles.skeleton} />
        ))}
      </div>
    )
  }

  if (!items?.length) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          onClick={onSelect}
          selected={item.id === selectedId}
          favorite={favorites.includes(item.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  )
}

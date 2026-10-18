import { useState } from 'react'
import type { Track } from '../types/track'

export interface TrackSelectProps {
  id: string
  label: string // e.g. "Track A"
  tracks: Track[]
  value: number | null
  onChange: (trackId: number) => void
}

/** Searchable track picker: a filter box narrowing a labelled <select>. */
function TrackSelect({ id, label, tracks, value, onChange }: TrackSelectProps) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const matches =
    normalizedQuery === ''
      ? tracks
      : tracks.filter((track) =>
          `${track.title} ${track.artist}`.toLowerCase().includes(normalizedQuery),
        )
  // Keep the current pick visible even when the search no longer matches it.
  const selected = tracks.find((track) => track.id === value)
  const options = selected && !matches.includes(selected) ? [selected, ...matches] : matches

  return (
    <div className="track-select">
      <label htmlFor={`${id}-search`} className="filter-label">
        {label}
      </label>
      <input
        id={`${id}-search`}
        type="search"
        className="filter-input"
        placeholder="Search title or artist…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-describedby={`${id}-count`}
      />
      <select
        id={id}
        className="filter-input"
        aria-label={`${label}: choose a track`}
        value={value ?? ''}
        onChange={(event) => {
          const nextId = Number(event.target.value)
          if (Number.isInteger(nextId)) onChange(nextId)
        }}
      >
        {options.map((track) => (
          <option key={track.id} value={track.id}>
            {track.title} — {track.artist}
          </option>
        ))}
      </select>
      <span id={`${id}-count`} className="track-select-count">
        {matches.length} {matches.length === 1 ? 'match' : 'matches'}
      </span>
    </div>
  )
}

export default TrackSelect

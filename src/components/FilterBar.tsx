import type { OriginCountry, SortKey, Subgenre, TrackFilters } from '../types/track'
import { COUNTRY_FLAGS } from '../utils/artistMetadata'
import { formatDuration } from '../utils/trackUtils'
import MoodCapsules from './MoodCapsules'

export interface FilterBarProps {
  filters: TrackFilters
  countries: OriginCountry[]
  subgenres: Subgenre[]
  artists: string[]
  resultCount: number
  totalCount: number
  resultDurationMs: number
  canReset: boolean
  isLoadingMore?: boolean // more bands still arriving (progressive loading)
  onChange: (next: TrackFilters) => void
  onReset: () => void
}

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'artist-asc', label: 'Artist (A–Z)' },
  { value: 'title-asc', label: 'Title (A–Z)' },
  { value: 'title-desc', label: 'Title (Z–A)' },
  { value: 'year-newest', label: 'Release year (newest)' },
  { value: 'year-oldest', label: 'Release year (oldest)' },
  { value: 'duration-longest', label: 'Duration (longest)' },
  { value: 'duration-shortest', label: 'Duration (shortest)' },
]

function FilterBar({
  filters,
  countries,
  subgenres,
  artists,
  resultCount,
  totalCount,
  resultDurationMs,
  canReset,
  isLoadingMore = false,
  onChange,
  onReset,
}: FilterBarProps) {
  const update = (patch: Partial<TrackFilters>) => onChange({ ...filters, ...patch })

  // <select> values are plain strings; map them back to typed options (no casts).
  const toCountry = (value: string): OriginCountry | '' =>
    countries.find((country) => country === value) ?? ''
  const toSubgenre = (value: string): Subgenre | '' =>
    subgenres.find((subgenre) => subgenre === value) ?? ''
  const toSort = (value: string): SortKey =>
    SORT_OPTIONS.find((option) => option.value === value)?.value ?? filters.sort

  return (
    <section className="filter-bar" aria-label="Search and filters">
      <div className="filter-search">
        <label htmlFor="filter-search" className="filter-label">
          Search
        </label>
        <input
          id="filter-search"
          type="search"
          className="filter-input"
          placeholder="Title, artist, album, style or country…"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
        />
        <button type="button" className="button button--ghost" onClick={onReset} disabled={!canReset}>
          Reset filters
        </button>
      </div>

      <MoodCapsules activeMood={filters.mood} onChange={(mood) => update({ mood })} />

      <div className="filter-selects">
        <div className="filter-field">
          <label htmlFor="filter-country" className="filter-label">
            Origin country
          </label>
          <select
            id="filter-country"
            className="filter-input"
            value={filters.country}
            onChange={(event) => update({ country: toCountry(event.target.value) })}
          >
            <option value="">All countries</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {COUNTRY_FLAGS[country]} {country}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="filter-subgenre" className="filter-label">
            Style
          </label>
          <select
            id="filter-subgenre"
            className="filter-input"
            value={filters.subgenre}
            onChange={(event) => update({ subgenre: toSubgenre(event.target.value) })}
          >
            <option value="">All styles</option>
            {subgenres.map((subgenre) => (
              <option key={subgenre} value={subgenre}>
                {subgenre}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="filter-artist" className="filter-label">
            Artist
          </label>
          <select
            id="filter-artist"
            className="filter-input"
            value={filters.artist}
            onChange={(event) => update({ artist: event.target.value })}
          >
            <option value="">All artists</option>
            {artists.map((artist) => (
              <option key={artist} value={artist}>
                {artist}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="filter-sort" className="filter-label">
            Sort by
          </label>
          <select
            id="filter-sort"
            className="filter-input"
            value={filters.sort}
            onChange={(event) => update({ sort: toSort(event.target.value) })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="filter-summary" role="status">
        Showing <strong>{resultCount}</strong> of {totalCount} tracks ·{' '}
        {formatDuration(resultDurationMs)} total
        {isLoadingMore && <span className="filter-loading-more"> · Loading more bands…</span>}
      </p>
    </section>
  )
}

export default FilterBar

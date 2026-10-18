import { useMemo } from 'react'
import FilterBar from '../components/FilterBar'
import SetlistButton from '../components/SetlistButton'
import StatusMessage from '../components/StatusMessage'
import TrackCard from '../components/TrackCard'
import type { FetchStatus, Track, TrackFilters } from '../types/track'
import {
  DEFAULT_FILTERS,
  filterTracks,
  getTotalDuration,
  getUniqueArtists,
  getUniqueCountries,
  getUniqueSubgenres,
  hasActiveFilters,
  sortTracks,
} from '../utils/trackUtils'

export interface CatalogPageProps {
  tracks: Track[]
  status: FetchStatus
  error: string | null
  onRetry: () => void
  isInSetlist: (trackId: number) => boolean
  onToggleSetlist: (track: Track) => void
  /** Owned by App so search, mood, country, style, artist and sort survive navigation. */
  filters: TrackFilters
  onFiltersChange: (next: TrackFilters) => void
  /** True while more batch responses are still being merged into the catalog. */
  isLoadingMore: boolean
}

function CatalogPage({
  tracks,
  status,
  error,
  onRetry,
  isInSetlist,
  onToggleSetlist,
  filters,
  onFiltersChange,
  isLoadingMore,
}: CatalogPageProps) {
  // Everything below is derived from tracks + filters — never stored in state.
  const visibleTracks = useMemo(
    () => sortTracks(filterTracks(tracks, filters), filters.sort),
    [tracks, filters],
  )
  const options = useMemo(
    () => ({
      countries: getUniqueCountries(tracks),
      subgenres: getUniqueSubgenres(tracks),
      artists: getUniqueArtists(tracks),
    }),
    [tracks],
  )

  const resetFilters = () => onFiltersChange(DEFAULT_FILTERS)

  return (
    <section>
      <header className="page-header">
        <h1>Vault Catalog</h1>
        <p className="page-summary">
          Rock, metal and metalcore from the iTunes catalog — tagged by band origin and style.
        </p>
      </header>

      {status === 'loading' && (
        <StatusMessage variant="loading" message="Tuning up — loading the Vault…" />
      )}

      {status === 'error' && (
        <StatusMessage
          variant="error"
          title="The Vault is locked"
          message={error ?? 'Something went wrong while loading the Vault.'}
          onRetry={onRetry}
        />
      )}

      {status === 'success' && tracks.length === 0 && (
        <StatusMessage
          variant="empty"
          title="The Vault is empty"
          message="The iTunes API didn't return any rock or metal tracks right now."
          onRetry={onRetry}
        />
      )}

      {status === 'success' && tracks.length > 0 && (
        <>
          <FilterBar
            filters={filters}
            countries={options.countries}
            subgenres={options.subgenres}
            artists={options.artists}
            resultCount={visibleTracks.length}
            totalCount={tracks.length}
            resultDurationMs={getTotalDuration(visibleTracks)}
            canReset={hasActiveFilters(filters) || filters.sort !== DEFAULT_FILTERS.sort}
            isLoadingMore={isLoadingMore}
            onChange={onFiltersChange}
            onReset={resetFilters}
          />

          {visibleTracks.length === 0 ? (
            <StatusMessage
              variant="empty"
              title="No tracks match your filters"
              message="Try a different search, mood or filter combination."
              onRetry={resetFilters}
              retryLabel="Reset filters"
            />
          ) : (
            <ul className="track-grid">
              {visibleTracks.map((track) => (
                <li key={track.id}>
                  <TrackCard
                    track={track}
                    actions={
                      <SetlistButton
                        variant="compact"
                        trackTitle={track.title}
                        inSetlist={isInSetlist(track.id)}
                        onToggle={() => onToggleSetlist(track)}
                      />
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default CatalogPage

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playQueue } from '../audio/playerEngine'
import FilterBar from '../components/FilterBar'
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

/** Cards rendered at first, and added per reveal — keeps mounting the catalog well under a frame. */
export const CATALOG_PAGE_SIZE = 48
export const CATALOG_QUEUE_LABEL = 'Catalog'

// The last filtered + sorted result. App keeps `tracks` and `filters` referentially stable across
// routes, so coming back to "/" reuses it instead of re-sorting ~1,000 tracks.
let lastVisible: { tracks: Track[]; filters: TrackFilters; result: Track[] } | null = null

function getVisibleTracks(tracks: Track[], filters: TrackFilters): Track[] {
  if (lastVisible?.tracks === tracks && lastVisible.filters === filters) return lastVisible.result
  const result = sortTracks(filterTracks(tracks, filters), filters.sort)
  lastVisible = { tracks, filters, result }
  return result
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
  const visibleTracks = useMemo(() => getVisibleTracks(tracks, filters), [tracks, filters])
  const options = useMemo(
    () => ({
      countries: getUniqueCountries(tracks),
      subgenres: getUniqueSubgenres(tracks),
      artists: getUniqueArtists(tracks),
    }),
    [tracks],
  )

  // Progressive reveal: the count belongs to one filter result, so new filters start at 48 again
  // (derived during render — no effect needed to reset it).
  const [reveal, setReveal] = useState({ filters, count: CATALOG_PAGE_SIZE })
  const revealCount = reveal.filters === filters ? reveal.count : CATALOG_PAGE_SIZE
  const renderedTracks = useMemo(() => visibleTracks.slice(0, revealCount), [visibleTracks, revealCount])
  const hasMore = revealCount < visibleTracks.length
  const showMore = useCallback(
    () => setReveal({ filters, count: revealCount + CATALOG_PAGE_SIZE }),
    [filters, revealCount],
  )

  // Reveal the next chunk as the end of the grid scrolls near (the button is the fallback).
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) showMore()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, showMore])

  // Stable for memoized cards: a card's ▶ queues the whole filtered list, starting at that card.
  const playFromCard = useCallback(
    (track: Track) => {
      const index = visibleTracks.findIndex((item) => item.id === track.id)
      void playQueue(visibleTracks, Math.max(index, 0), CATALOG_QUEUE_LABEL)
    },
    [visibleTracks],
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
            <>
              <ul className="track-grid">
                {renderedTracks.map((track) => (
                  <li key={track.id}>
                    <TrackCard
                      track={track}
                      inSetlist={isInSetlist(track.id)}
                      onToggleSetlist={onToggleSetlist}
                      onPlay={playFromCard}
                    />
                  </li>
                ))}
              </ul>
              {hasMore && (
                <div className="catalog-more" ref={sentinelRef}>
                  <p className="catalog-more-count">
                    Showing {renderedTracks.length} of {visibleTracks.length} tracks
                  </p>
                  <button type="button" className="button" onClick={showMore}>
                    Show More Tracks
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}

export default CatalogPage

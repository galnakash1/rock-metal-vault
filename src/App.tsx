import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { fetchCatalog, getCachedCatalog } from './api/itunes'
import MiniPlayer from './components/MiniPlayer'
import Navbar from './components/Navbar'
import ArenaPage from './pages/ArenaPage'
import CatalogPage from './pages/CatalogPage'
import NotFoundPage from './pages/NotFoundPage'
import SetlistPage from './pages/SetlistPage'
import TrackDetailPage from './pages/TrackDetailPage'
import type { FetchStatus, Track, TrackFilters } from './types/track'
import {
  getBrowserStorage,
  loadSetlist,
  removeTrackFromList,
  saveSetlist,
  toggleTrackInList,
} from './utils/setlistUtils'
import { DEFAULT_FILTERS } from './utils/trackUtils'
import './App.css'

function App() {
  // A cached catalog (memory or localStorage) renders on the very first frame, with no loading state.
  const [tracks, setTracks] = useState<Track[]>(() => getCachedCatalog() ?? [])
  const [status, setStatus] = useState<FetchStatus>(() => (getCachedCatalog() ? 'success' : 'loading'))
  // False while later batch responses are still being merged in (progressive loading).
  const [isCatalogComplete, setIsCatalogComplete] = useState(() => getCachedCatalog() !== null)
  const [error, setError] = useState<string | null>(null)
  // Bumped by "Retry" to re-run the fetch effect.
  const [requestId, setRequestId] = useState(0)

  // Catalog filters live here (not in CatalogPage) so they survive visits to other routes.
  const [catalogFilters, setCatalogFilters] = useState<TrackFilters>(DEFAULT_FILTERS)

  useEffect(() => {
    const controller = new AbortController()

    fetchCatalog({
      signal: controller.signal,
      // Retry (requestId > 0) bypasses the caches; the first load may be served from them.
      forceRefresh: requestId > 0,
      // Show tracks as soon as the fastest request lands; later responses merge in.
      onProgress: (tracksSoFar) => {
        if (controller.signal.aborted) return
        setTracks(tracksSoFar)
        setStatus('success')
        setIsCatalogComplete(false)
      },
    })
      .then((catalog) => {
        if (controller.signal.aborted) return
        setTracks(catalog)
        setStatus('success')
        setIsCatalogComplete(true)
      })
      .catch((fetchError: unknown) => {
        // Aborted by cleanup (unmount, StrictMode re-run, or a newer request) — not a real error.
        if (controller.signal.aborted) return
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Something went wrong while loading the Vault.',
        )
        setStatus('error')
      })

    return () => controller.abort()
  }, [requestId])

  const handleRetry = () => {
    setError(null)
    setStatus('loading')
    setIsCatalogComplete(false)
    setRequestId((id) => id + 1)
  }

  // ---- Festival setlist, persisted in localStorage ----
  const [setlist, setSetlist] = useState<Track[]>(() => loadSetlist(getBrowserStorage()))

  useEffect(() => {
    saveSetlist(getBrowserStorage(), setlist)
  }, [setlist])

  const setlistIds = useMemo(() => new Set(setlist.map((track) => track.id)), [setlist])
  const isInSetlist = useCallback((trackId: number) => setlistIds.has(trackId), [setlistIds])
  const toggleSetlistTrack = useCallback((track: Track) => {
    setSetlist((current) => toggleTrackInList(current, track))
  }, [])
  const removeSetlistTrack = useCallback((trackId: number) => {
    setSetlist((current) => removeTrackFromList(current, trackId))
  }, [])
  const clearSetlist = useCallback(() => setSetlist([]), [])

  return (
    <BrowserRouter>
      <Navbar setlistCount={setlist.length} />
      <main className="app">
        <Routes>
          <Route
            path="/"
            element={
              <CatalogPage
                tracks={tracks}
                status={status}
                error={error}
                onRetry={handleRetry}
                isLoadingMore={status === 'success' && !isCatalogComplete}
                filters={catalogFilters}
                onFiltersChange={setCatalogFilters}
                isInSetlist={isInSetlist}
                onToggleSetlist={toggleSetlistTrack}
              />
            }
          />
          <Route
            path="/tracks/:id"
            element={
              <TrackDetailPage
                tracks={tracks}
                status={status}
                error={error}
                onRetry={handleRetry}
                setlist={setlist}
                isInSetlist={isInSetlist}
                onToggleSetlist={toggleSetlistTrack}
              />
            }
          />
          <Route
            path="/setlist"
            element={
              <SetlistPage
                setlist={setlist}
                onRemove={removeSetlistTrack}
                onClear={clearSetlist}
              />
            }
          />
          <Route
            path="/arena"
            element={
              <ArenaPage
                tracks={tracks}
                status={status}
                error={error}
                onRetry={handleRetry}
                isInSetlist={isInSetlist}
                onToggleSetlist={toggleSetlistTrack}
              />
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {/* Outside <Routes>, so the Now Playing bar (and the playback it controls) survives navigation. */}
      <MiniPlayer />
    </BrowserRouter>
  )
}

export default App

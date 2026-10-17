import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { fetchCatalog } from './api/itunes'
import Navbar from './components/Navbar'
import ArenaPage from './pages/ArenaPage'
import CatalogPage from './pages/CatalogPage'
import NotFoundPage from './pages/NotFoundPage'
import SetlistPage from './pages/SetlistPage'
import TrackDetailPage from './pages/TrackDetailPage'
import type { FetchStatus, Track } from './types/track'
import {
  getBrowserStorage,
  loadSetlist,
  removeTrackFromList,
  saveSetlist,
  toggleTrackInList,
} from './utils/setlistUtils'
import './App.css'

function App() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [status, setStatus] = useState<FetchStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  // Bumped by "Retry" to re-run the fetch effect.
  const [requestId, setRequestId] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    // Retry (requestId > 0) bypasses the session cache; the first load may be served from it.
    fetchCatalog({ signal: controller.signal, forceRefresh: requestId > 0 })
      .then((catalog) => {
        if (controller.signal.aborted) return
        setTracks(catalog)
        setStatus('success')
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
              <ArenaPage tracks={tracks} status={status} error={error} onRetry={handleRetry} />
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App

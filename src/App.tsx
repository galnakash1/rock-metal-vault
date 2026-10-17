import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { fetchCatalog } from './api/itunes'
import Navbar from './components/Navbar'
import ArenaPage from './pages/ArenaPage'
import CatalogPage from './pages/CatalogPage'
import NotFoundPage from './pages/NotFoundPage'
import SetlistPage from './pages/SetlistPage'
import TrackDetailPage from './pages/TrackDetailPage'
import type { FetchStatus, Track } from './types/track'
import './App.css'

function App() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [status, setStatus] = useState<FetchStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  // Bumped by "Retry" to re-run the fetch effect.
  const [requestId, setRequestId] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetchCatalog(controller.signal)
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

  // Placeholder until useSetlist() provides the real count in Task 6.
  const setlistCount = 0

  return (
    <BrowserRouter>
      <Navbar setlistCount={setlistCount} />
      <main className="app">
        <Routes>
          <Route
            path="/"
            element={
              <CatalogPage tracks={tracks} status={status} error={error} onRetry={handleRetry} />
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
              />
            }
          />
          <Route path="/setlist" element={<SetlistPage />} />
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

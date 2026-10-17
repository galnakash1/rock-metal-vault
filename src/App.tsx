import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import mockData from './data/mockTracks.json'
import ArenaPage from './pages/ArenaPage'
import CatalogPage from './pages/CatalogPage'
import NotFoundPage from './pages/NotFoundPage'
import SetlistPage from './pages/SetlistPage'
import TrackDetailPage from './pages/TrackDetailPage'
import type { ITunesSearchResponse } from './types/track'
import { normalizeTracks } from './utils/trackUtils'
import './App.css'

// Mock catalog until Task 3 replaces it with the live iTunes fetch.
// JSON imports infer `string` for literal-union fields like trackExplicitness,
// so the mock is asserted to the raw API shape once, here.
const tracks = normalizeTracks((mockData as ITunesSearchResponse).results)

function App() {
  // Placeholder until useSetlist() provides the real count in Task 6.
  const setlistCount = 0

  return (
    <BrowserRouter>
      <Navbar setlistCount={setlistCount} />
      <main className="app">
        <Routes>
          <Route path="/" element={<CatalogPage tracks={tracks} />} />
          <Route path="/tracks/:id" element={<TrackDetailPage tracks={tracks} />} />
          <Route path="/setlist" element={<SetlistPage />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App

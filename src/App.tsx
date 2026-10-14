import mockData from './data/mockTracks.json'
import type { ITunesSearchResponse } from './types/track'
import { formatDuration, getTotalDuration, normalizeTracks } from './utils/trackUtils'
import './App.css'

// JSON imports infer `string` for literal-union fields like trackExplicitness,
// so the mock is asserted to the raw API shape once, here.
const mockResponse = mockData as ITunesSearchResponse
const tracks = normalizeTracks(mockResponse.results)

function App() {
  return (
    <main className="app">
      <header className="app-header">
        <h1>Rock &amp; Metal Vault</h1>
        <p className="app-summary">
          {tracks.length} tracks · {formatDuration(getTotalDuration(tracks))} total
        </p>
      </header>

      <ul className="track-list">
        {tracks.map((track) => (
          <li key={track.id} className="track-row">
            <img
              className="track-art"
              src={track.artworkUrl}
              alt={`${track.album} album artwork`}
              width={100}
              height={100}
              loading="lazy"
            />
            <div className="track-info">
              <h2 className="track-title">{track.title}</h2>
              <p className="track-artist">{track.artist}</p>
              <p className="track-meta">
                {track.album} · {track.genre}
              </p>
            </div>
            <span className="track-duration">{formatDuration(track.durationMs)}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App

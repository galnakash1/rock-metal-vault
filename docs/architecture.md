# Rock & Metal Vault — Architecture

> Product requirements: [../PRD.md](../PRD.md) · Build plan: [../tasks.md](../tasks.md)

This document describes how the app is structured: folders, the component hierarchy, TypeScript types, where state lives, and which pure utility functions are unit-tested. It also covers how the four signature features are built: Sonic Mood Capsules, the Amp Console Player, the Festival Poster Builder, and the Riff Blind-Test Challenge.

## 1. Folder Structure

```
src/
├── main.tsx                  # React root (StrictMode)
├── App.tsx                   # <BrowserRouter> + layout (Navbar + <Routes>), owns the shared state
├── index.css                 # Global theme: CSS variables, reset, typography
├── App.css                   # Layout + component styles
│
├── types/
│   ├── track.ts              # Raw API + app models, filters, moods, lineup, blind-test types
│   └── audio.ts              # EQ preset types
│
├── data/
│   └── mockTracks.json       # 9 rock/metal tracks in raw iTunes shape (Task 1; later a test fixture)
│
├── api/
│   └── itunes.ts             # fetchCatalog(signal): 3 parallel searches → validated, normalized Track[]
│
├── hooks/
│   ├── useSetlist.ts         # Setlist state, synced to localStorage
│   └── useAmpConsole.ts      # Web Audio graph (EQ filters + analyser) for the Amp Console
│
├── utils/
│   ├── trackUtils.ts         # Pure functions: normalize, format, filter, sort, moods, lineup, arena
│   ├── trackUtils.test.ts    # Vitest unit tests
│   ├── audioUtils.ts         # Pure functions: EQ presets, frequency bucketing for the visualizer
│   └── audioUtils.test.ts
│
├── components/               # Reusable building blocks (one component per file)
│   ├── Navbar.tsx
│   ├── TrackCard.tsx
│   ├── FilterBar.tsx
│   ├── MoodCapsules.tsx      # Signature 1
│   ├── AudioPreviewPlayer.tsx# Signature 2 — the Amp Console
│   ├── StatusMessage.tsx
│   ├── SetlistButton.tsx
│   ├── FestivalPoster.tsx    # Signature 3
│   ├── BlindTestGame.tsx     # Signature 4
│   └── TrackSelect.tsx
│
└── pages/                    # One component per route
    ├── CatalogPage.tsx       # /
    ├── TrackDetailPage.tsx   # /tracks/:id
    ├── SetlistPage.tsx       # /setlist
    ├── ArenaPage.tsx         # /arena
    └── NotFoundPage.tsx      # *
```

## 2. Component Hierarchy

**Pages** are route-level containers. They receive shared data as props, own page-local UI state, and compose components.
**Components** are reusable building blocks. They get data and callbacks through props and never fetch catalog data themselves.

```
<App>                                             owns: catalog fetch (useEffect), useSetlist()
└── <BrowserRouter>
    ├── <Navbar setlistCount />
    └── <Routes>
        ├── "/"            <CatalogPage tracks status error onRetry isInSetlist onToggleSetlist>
        │                   ├── <StatusMessage />          (loading / error / empty results)
        │                   ├── <FilterBar filters genres artists onChange resultCount totalCount />
        │                   ├── <MoodCapsules activeMood onChange />
        │                   └── <TrackCard track inSetlist onToggleSetlist />  × N
        │                         └── <SetlistButton />
        │
        ├── "/tracks/:id"  <TrackDetailPage tracks status setlist isInSetlist onToggleSetlist>
        │                   ├── <StatusMessage />          (loading / not found)
        │                   ├── <AudioPreviewPlayer src title />   (Amp Console)
        │                   └── <SetlistButton />
        │
        ├── "/setlist"     <SetlistPage setlist onRemove onClear>
        │                   ├── <StatusMessage />          (empty lineup)
        │                   ├── theme switcher             (radio group)
        │                   ├── <FestivalPoster lineup theme />
        │                   └── manage list → Remove buttons + Clear setlist
        │
        ├── "/arena"       <ArenaPage tracks status>
        │                   ├── <StatusMessage />
        │                   ├── <BlindTestGame tracks />
        │                   └── Head-to-Head → <TrackSelect /> × 2 + comparison table
        │
        └── "*"            <NotFoundPage />
```

### Reusable components

| Component | Responsibility | Key props |
| --- | --- | --- |
| `Navbar` | Brand logo + `NavLink`s (Vault Catalog / Festival Poster / Riff Arena); highlights the active route; shows the setlist count badge | `setlistCount: number` |
| `TrackCard` | Artwork, title, artist, album, duration, explicit badge; links to `/tracks/:id`; contains the setlist toggle | `track`, `inSetlist`, `onToggleSetlist` |
| `FilterBar` | Controlled search input, genre `<select>`, artist `<select>`, sort `<select>`, results count | `filters`, `genres`, `artists`, `onChange`, `resultCount`, `totalCount` |
| `MoodCapsules` | Row of toggle pills (`aria-pressed`) built from `MOOD_CAPSULES`; clicking the active pill clears it | `activeMood: MoodId \| null`, `onChange` |
| `AudioPreviewPlayer` | **Amp Console:** `<audio crossOrigin="anonymous">` + custom play/pause/progress, `<canvas>` frequency bars, and EQ preset buttons; uses `useAmpConsole` | `src`, `title` |
| `StatusMessage` | One place for the Loading, Error (with optional retry), and Empty / Not-found UI states | `variant`, `message`, `title?`, `onRetry?`, `action?` |
| `SetlistButton` | Add / Remove toggle with an `aria-pressed` state; stops click propagation when used inside a card link | `inSetlist`, `onToggle` |
| `FestivalPoster` | Renders a `FestivalLineup` as a poster: Headliners (large), Underbill (small), runtime, and counts; theme applied via a `data-theme` attribute | `lineup`, `theme`, `festivalName?` |
| `BlindTestGame` | Round flow (start → listen → guess → reveal → next), blurred artwork, 4 option buttons, score/streak | `tracks` |
| `TrackSelect` | Labelled `<select>` listing catalog tracks (used twice in the Head-to-Head) | `label`, `tracks`, `value`, `onChange` |

The first five required components are `Navbar`, `TrackCard`, `FilterBar`, `AudioPreviewPlayer`, and `StatusMessage`. The rest either carry a signature feature or remove duplicated markup.

## 3. TypeScript Interfaces

All types are shared from `src/types/`. **No `any` anywhere.** The raw API shape is kept separate from the app model, so the rest of the app never depends on Apple's field names.

### `src/types/track.ts`

```ts
// ---------- Raw iTunes API shapes ----------
export type ITunesExplicitness = 'explicit' | 'notExplicit' | 'cleaned'

export interface ITunesTrackRaw {
  wrapperType: string            // "track" for songs
  kind?: string                  // "song"
  trackId: number
  trackName: string
  artistName: string
  collectionName?: string
  artworkUrl100: string
  previewUrl?: string
  trackTimeMillis?: number
  primaryGenreName: string
  releaseDate: string            // ISO 8601
  trackExplicitness: ITunesExplicitness
  trackCount?: number            // tracks on the album
  trackNumber?: number
  trackViewUrl?: string
}

export interface ITunesSearchResponse {
  resultCount: number
  results: ITunesTrackRaw[]
}

// ---------- App model ----------
export interface Track {
  id: number                     // iTunes trackId — unique across the catalog
  title: string
  artist: string
  album: string
  genre: string
  artworkUrl: string             // original 100x100
  artworkUrlLarge: string        // upgraded 600x600
  previewUrl: string
  durationMs: number
  releaseDate: string            // ISO 8601
  releaseYear: number | null     // null when the date can't be parsed
  isExplicit: boolean
  albumTrackCount: number | null // null when the API omits it
  storeUrl: string | null
}

// ---------- Filtering & sorting ----------
export type SortKey =
  | 'title-asc' | 'title-desc' | 'artist-asc'
  | 'year-newest' | 'year-oldest'
  | 'duration-shortest' | 'duration-longest'

export interface TrackFilters {
  search: string                 // free text; '' = no search
  genre: string                  // '' = all genres
  artist: string                 // '' = all artists
  sort: SortKey
}

// ---------- Async state ----------
export type FetchStatus = 'loading' | 'error' | 'success'

// ---------- Signature 1: Sonic Mood Capsules ----------
export type MoodId =
  | 'atmospheric-epic'           // duration >= 5:00
  | 'modern-breakdown'           // year >= 2010 AND genre contains "metal"
  | 'legends-70s-80s'            // 1970 <= year <= 1989
  | 'quick-riff-blitz'           // duration < 3:30

export interface MoodCapsule {
  id: MoodId
  label: string                  // e.g. "Atmospheric & Epic"
  description: string            // tooltip / screen-reader hint
}

// ---------- Signature 3: Festival Poster ----------
export type PosterTheme = 'hellfire' | 'frostbite' | 'toxic-waste'

export interface LineupAct {
  artist: string
  tracks: Track[]
  runtimeMs: number
}

export interface FestivalLineup {
  headliners: LineupAct[]
  underbill: LineupAct[]
  totalRuntimeMs: number
  trackCount: number
}

// ---------- Signature 4: Riff Arena ----------
export interface BlindTestRound {
  answer: Track
  options: Track[]               // 4 tracks incl. the answer, shuffled, distinct artists
}

export interface BlindTestScore {
  correct: number
  played: number
  streak: number
  bestStreak: number
}

export type ComparisonWinner = 'a' | 'b' | 'tie' | 'none'

export interface ComparisonRow {
  label: string                  // e.g. "Duration"
  valueA: string                 // display-ready
  valueB: string
  winner: ComparisonWinner       // 'none' for non-numeric rows (e.g. explicit rating)
}
```

### `src/types/audio.ts`

```ts
export type EqPresetId = 'flat' | 'metalcore-scoop' | 'classic-tube-amp' | 'bass-drop'

export interface EqPreset {
  id: EqPresetId
  label: string                  // e.g. "Metalcore Scoop"
  bassDb: number                 // lowshelf gain
  midDb: number                  // peaking gain
  trebleDb: number               // highshelf gain
}
```

Each type is added in the task that first needs it. Task 1 created the track, filter, and fetch types.

### Component props (examples)

Each component declares and exports its own `Props` interface in its own file:

```ts
export interface TrackCardProps {
  track: Track
  inSetlist: boolean
  onToggleSetlist: (track: Track) => void
}

export interface MoodCapsulesProps {
  activeMood: MoodId | null
  onChange: (mood: MoodId | null) => void
}

export interface AudioPreviewPlayerProps {
  src: string
  title: string
}

export interface FestivalPosterProps {
  lineup: FestivalLineup
  theme: PosterTheme
  festivalName?: string
}

export interface StatusMessageProps {
  variant: 'loading' | 'error' | 'empty'
  message: string
  title?: string
  onRetry?: () => void
  action?: { label: string; to: string }   // e.g. "Back to Vault" → "/"
}

export interface NavbarProps {
  setlistCount: number
}
```

## 4. State Management Strategy

There are no external state libraries — just React state, custom hooks, and props. The rule: **state lives in the lowest component that all of its consumers share; anything that can be computed is derived, not stored.**

| State | Lives in | Why | Flows to |
| --- | --- | --- | --- |
| Catalog `tracks`, `status`, `error` (+ `requestId` for retries) | `App` (`useState` + `useEffect`) | Needed by Catalog, Detail, and Arena; fetched **once** (rate limits) and shared | Props → pages |
| `setlist: Track[]` + actions | `App` via `useSetlist()` | Needed by the Navbar badge, cards, Detail, and the Setlist page | Props → `Navbar`, pages → `TrackCard` / `SetlistButton` |
| `filters: TrackFilters` | `CatalogPage` (`useState`) | Only the catalog uses it | Props → `FilterBar`; `onChange` callback goes back up |
| `mood: MoodId \| null` | `CatalogPage` (`useState`) | Only the catalog uses it | Props → `MoodCapsules` |
| Visible tracks | Derived in `CatalogPage`: `useMemo(() => sortTracks(filterByMood(filterTracks(tracks, filters), mood), filters.sort))` | Derived data — never stored in state | Props → `TrackCard`s |
| Genre / artist options | Derived with `getUniqueGenres` / `getUniqueArtists` | Derived | Props → `FilterBar` |
| Current track | Derived in `TrackDetailPage` from `useParams().id` + `tracks` | Single source of truth is the URL | Local render |
| EQ preset, play state, progress | `AudioPreviewPlayer` (`useState`) | Local to one player | `useAmpConsole` |
| Audio graph nodes, animation frame id | `useAmpConsole` (`useRef`) | Mutable, non-render data | — |
| Poster theme | `SetlistPage` (`useState`) | Page-local | Props → `FestivalPoster` |
| Festival lineup | Derived in `SetlistPage`: `useMemo(() => buildFestivalLineup(setlist))` | Derived | Props → `FestivalPoster` |
| Round, guess, score, elapsed time | `BlindTestGame` (`useState`) | Local to the game | Local render |
| Head-to-Head selections (`trackAId`, `trackBId`) | `ArenaPage` (`useState`) | Page-local; ids are stored instead of objects to avoid stale copies | Props → `TrackSelect`s |
| Comparison rows | Derived in `ArenaPage` with `useMemo(compareTracks)` | Derived | Table |

**Data flows down via props; events flow up via callbacks** (`onChange`, `onToggleSetlist`, `onRemove`, `onClear`, `onRetry`).

### Catalog fetch — `useEffect` in `App` + `fetchCatalog()`

- `App` calls `fetchCatalog(signal)` inside `useEffect`. That call makes 3 parallel requests (`rock`, `metal`, `metalcore`) with `Promise.all`. It validates each body with `parseSearchResults` (dropping malformed entries), normalizes and de-duplicates the results by `trackId` (`normalizeTracks` → `dedupeTracks`) so React keys are always unique, and keeps only rock/metal-family genres (`isRockOrMetalGenre`).
- `App` holds `tracks`, `status: FetchStatus` (initially `'loading'`), and `error: string | null`, and passes them, plus `onRetry`, to Catalog, Detail, and Arena.
- **Retry:** `handleRetry` sets `status` back to `'loading'` and bumps a `requestId` counter, which is the effect's dependency, so the effect runs again. State is never set synchronously inside the effect body.
- Uses an `AbortController` in the effect cleanup; results and errors that arrive after an abort are ignored. React StrictMode's double-mount and fast navigation never update state from a stale request.
- Treats a non-OK HTTP response (`!response.ok`) as an error, not just a network failure. Network failures become a friendly "Couldn't reach the iTunes API" message (the original error is kept as `cause`).

### `useSetlist()` — persistence

- Lazy-initializes from `localStorage` key `rmv:setlist` via `parseStoredSetlist()`, which returns `[]` for missing, corrupted, or non-array data.
- Writes back to `localStorage` in a `useEffect` whenever the setlist changes.
- Stores **full `Track` objects** (not just ids), so `/setlist` and saved tracks' detail pages still work if the API is down.
- Exposes `{ setlist, isInSetlist(id), toggleTrack(track), removeTrack(id), clearSetlist() }`. All updates are immutable.

### Track detail lookup

`TrackDetailPage` parses `id` from `useParams` and looks it up in the catalog first, then (from Task 6) in the setlist. While the catalog is loading, it shows `StatusMessage` (loading). If the id isn't numeric or isn't found, it shows the "Track not found" state.

## 5. Signature Feature Design

### 1 — Sonic Mood Capsules

- `MOOD_CAPSULES: MoodCapsule[]` (in `trackUtils.ts`) defines the four pills in display order.
- `matchesMood(track, mood)` holds the rules: `≥ 300 000 ms`; `year ≥ 2010 && /metal/i.test(genre)`; `1970 ≤ year ≤ 1989`; `< 210 000 ms`. Tracks with a `null` year never match the year-based moods.
- `filterByMood(tracks, mood | null)` returns the list unchanged for `null`.

### 2 — Amp Console Player (`AudioPreviewPlayer` + `useAmpConsole`)

```
<audio crossOrigin="anonymous">
  → MediaElementAudioSourceNode
  → BiquadFilter lowshelf  (~120 Hz,  gain = bassDb)
  → BiquadFilter peaking   (~900 Hz,  Q ≈ 1, gain = midDb)
  → BiquadFilter highshelf (~4.5 kHz, gain = trebleDb)
  → AnalyserNode (fftSize 256)
  → AudioContext.destination
```

- **Lazy start:** the `AudioContext` and nodes are created on the first Play click (a user gesture, required by browser autoplay policies) and kept in refs. A media element can only be connected to one `MediaElementAudioSourceNode`, so the graph is built exactly once per element.
- **Live EQ:** switching presets calls `gain.setTargetAtTime(db, ctx.currentTime, 0.05)` on the three filters. The sound changes smoothly, and playback is never restarted.
- **Visualizer:** while playing, a `requestAnimationFrame` loop reads `analyser.getByteFrequencyData()`, reduces it to N bars with `bucketFrequencies()`, and draws on a `<canvas>`. The loop is cancelled on pause, on end, and on unmount.
- **Cleanup:** on unmount (or when `src` changes) the hook cancels the animation frame and closes the `AudioContext`.
- **CORS:** Apple serves previews with `Access-Control-Allow-Origin: *`, so `crossOrigin="anonymous"` keeps the analyser data from being silenced.
- `EQ_PRESETS` (in `audioUtils.ts`): `Flat` 0/0/0 · `Metalcore Scoop` +5/−6/+4 · `Classic Tube Amp` +2/+4/−2 · `Bass Drop` +9/−2/−1 (bass/mid/treble dB).

### 3 — Festival Lineup & Poster Builder

- `buildFestivalLineup(tracks)` groups setlist tracks by artist into `LineupAct`s. Acts are ranked by number of tracks (desc), then runtime (desc), then name. The top `min(3, ceil(acts / 3))` acts are **Headliners**; the rest are **Underbill**. `totalRuntimeMs` = `getTotalDuration(tracks)`.
- `FestivalPoster` is pure presentation. The theme is a `data-theme="hellfire|frostbite|toxic-waste"` attribute that swaps CSS custom properties, so there's no theme-specific JSX.

### 4 — Riff Blind-Test Challenge

- `buildBlindTestRound(tracks, random)` picks the answer with `pickRandomTrack`, then 3 decoys by **different artists** (so the answer is never ambiguous), and shuffles all 4 with `shuffle(items, random)`. It returns `null` when the catalog has fewer than 4 distinct artists.
- A plain `<audio>` element (not the Amp Console) starts on the "Start round" click. Its `timeupdate` events drive `elapsed`, and `getArtworkBlur(elapsed)` maps 0 → 30 s to 24px → 0px blur (CSS `filter: blur()`). After a guess, the blur goes to 0.
- `applyGuess(score, isCorrect)` returns the next `BlindTestScore` (streak resets on a miss; `bestStreak = max`).
- The Head-to-Head uses `compareTracks(a, b)` to build the comparison table.

## 6. Utility Functions

All of these are **pure functions** with no React and no DOM, so they are easy to unit-test with Vitest. Functions marked ✅ are covered in Task 4. The rest get tests in the task that introduces them.

### `src/utils/trackUtils.ts`

| Function | Signature | Behavior | Test |
| --- | --- | --- | --- |
| `formatDuration` | `(ms?: number) => string` | `245000 → "04:05"`; zero-padded `mm:ss`; ≥ 1 hour → `"h:mm:ss"` (for runtime totals); invalid/negative/undefined → `"00:00"`; rounds down to whole seconds | ✅ Task 4 |
| `upgradeArtworkUrl` | `(url: string, size?: number) => string` | Replaces `/\d+x\d+bb/` with `600x600bb` (default size); returns non-matching URLs unchanged | ✅ Task 4 |
| `getReleaseYear` | `(isoDate: string) => number \| null` | Uses `getUTCFullYear()` to avoid time-zone off-by-one; `null` for invalid dates | ✅ Task 4 |
| `isITunesTrackRaw` | `(value: unknown) => value is ITunesTrackRaw` | Runtime type guard: required fields present with the right types; `trackExplicitness` is a known value | ✅ Task 4 |
| `parseSearchResults` | `(data: unknown) => ITunesTrackRaw[]` | Throws for a body that isn't `{ results: [...] }`; drops malformed entries | ✅ Task 4 |
| `normalizeTrack` | `(raw: ITunesTrackRaw) => Track \| null` | Maps the API shape to `Track`; returns `null` for non-tracks or entries without `previewUrl` | ✅ Task 4 |
| `dedupeTracks` | `(tracks: Track[]) => Track[]` | Keeps the first occurrence of each `id` (iTunes `trackId`) so merged queries never produce duplicate React keys | ✅ Task 4 |
| `normalizeTracks` | `(raws: ITunesTrackRaw[]) => Track[]` | Normalizes, drops `null`s, de-duplicates by `id` | ✅ Task 4 |
| `isRockOrMetalGenre` | `(genre: string) => boolean` | Exact match against the `ROCK_METAL_GENRES` allowlist (Rock, Hard Rock, Metal, Alternative, Punk, …); used by `fetchCatalog` | ✅ Task 4 |
| `filterTracks` | `(tracks, filters: Pick<TrackFilters, 'search' \| 'genre' \| 'artist'>) => Track[]` | Case-insensitive, trimmed search across title/artist/album, combined (AND) with exact genre and artist match | ✅ Task 4 |
| `sortTracks` | `(tracks: Track[], sort: SortKey) => Track[]` | Returns a **new** array (never mutates the input); text sorts use `localeCompare` | ✅ Task 4 |
| `getTotalDuration` | `(tracks: Track[]) => number` | Sum of `durationMs` (0 for an empty list) | ✅ Task 4 |
| `getUniqueGenres` / `getUniqueArtists` | `(tracks: Track[]) => string[]` | Sorted, de-duplicated option lists for `FilterBar` | ✅ Task 4 |
| `matchesMood` / `filterByMood` | `(track, mood) => boolean` / `(tracks, mood \| null) => Track[]` | Sonic Mood Capsule rules (see §5) | ✅ Task 4 |
| `parseStoredSetlist` | `(raw: string \| null) => Track[]` | Safe `JSON.parse`; `[]` for null, invalid JSON, or non-arrays | Task 6 |
| `toggleTrackInList` | `(list: Track[], track: Track) => Track[]` | Adds the track if absent, removes it if present (immutable) | Task 6 |
| `buildFestivalLineup` | `(tracks: Track[]) => FestivalLineup` | Groups by artist, ranks, and splits into Headliners / Underbill | Task 6 |
| `pickRandomTrack` | `(tracks: Track[], random?: () => number) => Track \| null` | Injectable RNG (defaults to `Math.random`) for deterministic tests; `null` for an empty list | Task 7 |
| `shuffle` | `<T>(items: T[], random?: () => number) => T[]` | Fisher–Yates on a copy | Task 7 |
| `buildBlindTestRound` | `(tracks: Track[], random?: () => number) => BlindTestRound \| null` | Answer + 3 decoys by distinct artists, shuffled | Task 7 |
| `getArtworkBlur` | `(elapsedSec: number, totalSec?: number, maxBlurPx?: number) => number` | Linear 24px → 0px over 30s, clamped | Task 7 |
| `applyGuess` | `(score: BlindTestScore, isCorrect: boolean) => BlindTestScore` | Score/streak/best-streak update | Task 7 |
| `compareTracks` | `(a: Track, b: Track) => ComparisonRow[]` | Rows for duration, release year, explicit rating, album track count, each with a winner | Task 7 |

### `src/utils/audioUtils.ts`

| Function / constant | Signature | Behavior | Test |
| --- | --- | --- | --- |
| `EQ_PRESETS` | `Record<EqPresetId, EqPreset>` | The four Amp Console presets | Task 5 |
| `bucketFrequencies` | `(data: Uint8Array, bars: number) => number[]` | Averages FFT bins into `bars` values normalized to 0–1 | Task 5 |

**Test fixtures:** `src/data/mockTracks.json` uses the raw iTunes response shape. It feeds the static list in Tasks 1–2 and is reused as the test fixture after the switch to the real API in Task 3. The tests never hit the network.

## 7. Routing

| Path | Page | Navbar label | Notes |
| --- | --- | --- | --- |
| `/` | `CatalogPage` | Vault Catalog | Master list + Mood Capsules |
| `/tracks/:id` | `TrackDetailPage` | — | `useParams<{ id: string }>()`; Amp Console |
| `/setlist` | `SetlistPage` | Festival Poster | `localStorage`-backed; poster builder |
| `/arena` | `ArenaPage` | Riff Arena | Blind-Test + Head-to-Head |
| `*` | `NotFoundPage` | — | Fallback |

`App.tsx` renders `<BrowserRouter>` around the layout. `<Navbar>` sits outside `<Routes>`, so it renders on every page. The catalog is matched with `<NavLink to="/" end>`, so it isn't highlighted on every route.

## 8. Styling

- Plain CSS only: `index.css` holds theme tokens (CSS custom properties for colors, spacing, and fonts), and `App.css` holds layout and component styles.
- Dark Rock/Metal look: near-black background, steel greys, and a blood-red / amber accent. The Amp Console gets an amp-panel look (knurled-metal border, glowing "tubes" for the bars), and each poster theme overrides tokens under `[data-theme]`.
- Responsive: CSS Grid with `auto-fill, minmax(...)` for the card grid; a single-column layout and a wrapping Navbar below about 600px. The visualizer canvas scales to its container width.
- Accessibility: visible `:focus-visible` outlines, sufficient contrast, labelled controls (`aria-pressed` on pills and presets), and `prefers-reduced-motion` respected for hover animations and the unblur transition.

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
│   ├── riff.ts               # Guitar Riff Tab types
│   └── audio.ts              # EQ preset types
│
├── data/
│   └── mockTracks.json       # 9 rock/metal tracks in raw iTunes shape (Task 1; later a test fixture)
│
├── api/
│   ├── itunes.ts             # fetchCatalog({ signal, forceRefresh }): 3 searches + 1 artist lookup, cached
│   └── itunes.test.ts        # request-plan tests (no network)
│
├── hooks/
│   └── useAmpConsole.ts      # Web Audio graph (EQ filters + analyser) for the Amp Console
│
├── utils/
│   ├── trackUtils.ts         # Pure functions: validate, normalize + enrich, filter, sort, moods, lineup, arena
│   ├── trackUtils.test.ts    # Vitest unit tests (utils, enrichment, moods, riff tabs)
│   ├── setlistUtils.ts       # Setlist toggle/remove, localStorage load/save, festival lineup tiers
│   ├── setlistUtils.test.ts
│   ├── catalogCache.ts       # sessionStorage catalog cache (serialize / parse with TTL)
│   ├── catalogCache.test.ts
│   ├── artistMetadata.ts     # Curated artist → origin country/flag + subgenre map, with fallback
│   ├── riffTabs.ts           # Style-based 6-string practice riffs: profiles, templates, renderer
│   ├── audioUtils.ts         # Pure functions: EQ presets, frequency bucketing for the visualizer
│   └── audioUtils.test.ts
│
├── components/               # Reusable building blocks (one component per file)
│   ├── Navbar.tsx
│   ├── TrackCard.tsx
│   ├── FilterBar.tsx
│   ├── MoodCapsules.tsx      # Signature 1
│   ├── AudioPreviewPlayer.tsx# Signature 2 — the Amp Console
│   ├── RiffTabPanel.tsx      # Guitar Riff Tab panel (detail page)
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
<App>                                             owns: catalog fetch (useEffect), setlist (useState + localStorage)
└── <BrowserRouter>
    ├── <Navbar setlistCount />
    └── <Routes>
        ├── "/"            <CatalogPage tracks status error onRetry isInSetlist onToggleSetlist>
        │                   ├── <StatusMessage />          (loading / error / empty results)
        │                   ├── <FilterBar filters countries subgenres artists onChange resultCount totalCount />
        │                   ├── <MoodCapsules activeMood={filters.mood} onChange />
        │                   └── <TrackCard track inSetlist onToggleSetlist />  × N
        │                         └── <SetlistButton />
        │
        ├── "/tracks/:id"  <TrackDetailPage tracks status setlist isInSetlist onToggleSetlist>
        │                   ├── <StatusMessage />          (loading / not found)
        │                   ├── <AudioPreviewPlayer src title />   (Amp Console)
        │                   ├── <RiffTabPanel tab={getTrackRiffTab(track)} />
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
| `TrackCard` | 300px artwork, title, artist, origin flag + country, style badge, release year, duration, explicit badge; links to `/tracks/:id`. An `actions` slot outside the link holds the Task 6 setlist toggle | `track`, `actions?: ReactNode` |
| `FilterBar` | Controlled search input + Reset filters button, `MoodCapsules`, Origin Country `<select>` (flag + name), Style `<select>`, Artist `<select>`, Sort `<select>`, and a live "Showing X of Y tracks · total" summary | `filters`, `countries`, `subgenres`, `artists`, `resultCount`, `totalCount`, `resultDurationMs`, `canReset`, `onChange`, `onReset` |
| `MoodCapsules` | "All" + one toggle pill (`aria-pressed`) per `MOOD_CAPSULES` entry; clicking the active pill returns to All. Rendered inside `FilterBar` | `activeMood: MoodId \| null`, `onChange` |
| `AudioPreviewPlayer` | **Amp Console:** `<audio crossOrigin="anonymous">` + play/pause, scrubber and time display, `<canvas>` frequency bars, EQ preset buttons, and a plain-audio fallback note; uses `useAmpConsole` | `src`, `title`, `onProgress?(seconds, isPlaying)` |
| `StatusMessage` | One place for the Loading, Error (with optional retry), and Empty / Not-found UI states | `variant`, `message`, `title?`, `onRetry?`, `retryLabel?`, `action?` |
| `SetlistButton` | "Add to Setlist" / "Remove from Setlist" toggle (label and `aria-label` change with state); calls `preventDefault` + `stopPropagation`, so it never triggers a surrounding card link. `compact` variant on cards | `trackTitle`, `inSetlist`, `onToggle`, `variant?` |
| `FestivalPoster` | Renders a `FestivalLineup` as a poster: Headliners (large display type), Main Stage underbill, origin flags + styles, and tracks/bands/runtime stats; theme applied via a `data-theme` attribute | `lineup`, `theme`, `festivalName?` |
| `BlindTestGame` | Round flow (start → listen → guess → reveal → next), blurred artwork, 4 option buttons, score/streak | `tracks` |
| `RiffTabPanel` | Monospaced 6-line tab (`e B G D A E`) with tuning, BPM, and difficulty badges; labelled "Signature riff tab" or "Practice riff tab"; highlights the playhead column | `tab: GuitarRiffTab`, `subgenre`, `activeStep: number \| null` |
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

// ---------- Band origin & style enrichment ----------
export type OriginCountry =      // 19 countries + Unknown
  | 'United States' | 'United Kingdom' | 'Sweden' | 'Germany' | 'Australia'
  | 'France' | 'Canada' | 'Finland' | 'Norway' | 'Denmark' | 'Iceland' | 'Israel'
  | 'Netherlands' | 'Switzerland' | 'Poland' | 'Ukraine' | 'Greece' | 'Brazil' | 'Japan'
  | 'Unknown'                    // artist isn't in the curated map

export type Subgenre =           // 39 styles, e.g.
  | 'Metalcore' | 'Heavy Metal' | 'Thrash Metal' | 'Melodic Death Metal' | 'Black Metal'
  | 'Symphonic Black Metal' | 'Doom Metal' | 'Post-Metal' | 'Oriental / Folk Metal'
  | 'Djent / Extreme Metal' | 'Kawaii Metal' | "Black 'n' Roll" | 'Hard Rock' | …
  | 'Rock'                       // generic fallback

export interface ArtistMetadata {
  originCountry: OriginCountry
  subgenre: Subgenre
}

// ---------- App model ----------
export interface Track {
  id: number                     // iTunes trackId — unique across the catalog
  title: string
  artist: string
  album: string
  genre: string                  // iTunes primaryGenreName, e.g. "Metal"
  subgenre: Subgenre             // enriched style, e.g. "Thrash Metal"
  originCountry: OriginCountry   // where the band formed — not the storefront
  originFlag: string             // emoji flag, e.g. "🇬🇧" ("🌐" for Unknown)
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
  search: string                 // title/artist/album/subgenre/country; '' = no search
  country: OriginCountry | ''    // '' = all countries
  subgenre: Subgenre | ''        // '' = all styles
  artist: string                 // '' = all artists
  mood: MoodId | null            // Sonic Mood Capsule; null = none
  sort: SortKey
}

// ---------- Async state ----------
export type FetchStatus = 'loading' | 'error' | 'success'

// ---------- Signature 1: Sonic Mood Capsules ----------
export type MoodId =
  | 'atmospheric-epic'           // duration >= 5:00
  | 'modern-breakdown'           // year >= 2010 AND metal/metalcore (genre or subgenre)
  | 'legends-70s-80s'            // 1970 <= year <= 1989
  | 'quick-riff-blitz'           // duration < 3:30

export interface MoodCapsule {
  id: MoodId
  label: string                  // e.g. "Atmospheric & Epic"
  description: string            // tooltip / screen-reader hint
}

// ---------- Signature 3: Festival Poster ----------
export type PosterTheme = 'foggy-woodland' | 'blood-moon' | 'vintage-tour'

export interface PosterThemeOption {
  id: PosterTheme
  label: string                  // "Blood Moon"
  description: string
}

export interface LineupAct {
  artist: string
  originCountry: OriginCountry
  originFlag: string
  subgenre: Subgenre
  tracks: Track[]
  runtimeMs: number
}

export interface FestivalLineup {
  headliners: LineupAct[]        // top tier
  underbill: LineupAct[]         // Main Stage
  trackCount: number
  artistCount: number
  totalRuntimeMs: number
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

### `src/types/riff.ts`

```ts
export type GuitarString = 'e' | 'B' | 'G' | 'D' | 'A' | 'E'   // top line → bottom line
export type RiffDifficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type RiffFamily =
  | 'metalcore' | 'nu-metal' | 'alt-metal' | 'thrash' | 'heavy-metal'
  | 'progressive' | 'hard-rock' | 'classic-rock' | 'punk' | 'grunge'
export type RiffStep = Partial<Record<GuitarString, number>>  // one tab column (fret per string)

export interface TabColumn {
  width: number
  cells: Record<GuitarString, string>   // each string's cell padded to the column width
}

export type RiffTabKind = 'signature' | 'practice'

export interface GuitarRiffTab {
  kind: RiffTabKind              // curated song riff vs. style-based practice riff
  title: string                  // "Back In Black — signature riff" / "Metalcore practice riff"
  family: RiffFamily
  tuning: string                 // "Drop C (C G C F A D)"
  bpm: number                    // approximate tempo
  stepsPerBeat: number           // columns per beat (2 = eighths), drives the playhead
  difficulty: RiffDifficulty
  columns: TabColumn[]           // one per step, for the playhead highlight
  lines: Record<GuitarString, string>   // six equal-length lines, e.g. E: "|-0-0-3-|"
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

Each type is added in the task that first needs it. Task 1 created the track, filter, and fetch types; Task 4 added origin/style enrichment, moods, the extended filters, and riff tabs.

### Component props (examples)

Each component declares and exports its own `Props` interface in its own file:

```ts
export interface TrackCardProps {
  track: Track
  inSetlist: boolean
  onToggleSetlist: (track: Track) => void
}

export interface RiffTabPanelProps {
  tab: GuitarRiffTab
  subgenre: string
  activeStep: number | null      // playhead column from getRiffPlayheadIndex
}

export interface MoodCapsulesProps {
  activeMood: MoodId | null
  onChange: (mood: MoodId | null) => void
}

export interface AudioPreviewPlayerProps {
  src: string
  title: string
  onProgress?: (seconds: number, isPlaying: boolean) => void   // drives the riff playhead
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
| `setlist: Track[]` + actions | `App` (`useState` lazily loaded from `localStorage`, saved back in `useEffect`) | Needed by the Navbar badge, cards, Detail, and the Setlist page | Props → `Navbar`, pages → `TrackCard` / `SetlistButton` |
| `filters: TrackFilters` (search, country, subgenre, artist, mood, sort) | `CatalogPage` (`useState`) | Only the catalog uses it | Props → `FilterBar` and `MoodCapsules` (`filters.mood`); `onChange` callbacks go back up |
| Visible tracks | Derived in `CatalogPage`: `useMemo(() => sortTracks(filterTracks(tracks, filters), filters.sort))` | Derived data — never stored in state | Props → `TrackCard`s |
| Country / style / artist options | Derived with `getUniqueCountries` / `getUniqueSubgenres` / `getUniqueArtists` | Derived | Props → `FilterBar` |
| Riff tab | Derived in `TrackDetailView`: `useMemo(() => getTrackRiffTab(track))` | Derived (deterministic) | Props → `RiffTabPanel` |
| Current track | Derived in `TrackDetailPage` from `useParams().id` + `tracks` | Single source of truth is the URL | Rendered by `TrackDetailView` with `key={track.id}`, so playback state and the audio graph reset per track |
| Playback `{ seconds, isPlaying }` | `TrackDetailView` (`useState`), updated by `AudioPreviewPlayer`'s `onProgress` every animation frame | Shared by the Amp Console and the riff playhead | `getRiffPlayheadIndex` → `RiffTabPanel` `activeStep` |
| EQ preset, play state, progress | `AudioPreviewPlayer` (`useState`) | Local to one player | `useAmpConsole` |
| Audio graph nodes, animation frame id | `useAmpConsole` (`useRef`) | Mutable, non-render data | — |
| Poster theme | `SetlistPage` (`useState`) | Page-local | Props → `FestivalPoster` |
| Festival lineup | Derived in `SetlistPage`: `useMemo(() => buildFestivalLineup(setlist))` | Derived | Props → `FestivalPoster` |
| Round, guess, score, elapsed time | `BlindTestGame` (`useState`) | Local to the game | Local render |
| Head-to-Head selections (`trackAId`, `trackBId`) | `ArenaPage` (`useState`) | Page-local; ids are stored instead of objects to avoid stale copies | Props → `TrackSelect`s |
| Comparison rows | Derived in `ArenaPage` with `useMemo(compareTracks)` | Derived | Table |

**Data flows down via props; events flow up via callbacks** (`onChange`, `onToggleSetlist`, `onRemove`, `onClear`, `onRetry`).

### Catalog fetch — `useEffect` in `App` + `fetchCatalog()`

- `App` calls `fetchCatalog({ signal, forceRefresh: requestId > 0 })` inside `useEffect`.
- **Request plan (4 requests):** 3 searches (`rock`, `metal`, `metalcore`, 50 songs each) plus 1 **Lookup API** call with every `SPOTLIGHT_ARTIST_IDS` id (`lookup?id=…&entity=song&limit=3`; Apple applies the limit per artist). Ids are chunked at 100 per lookup. Each request has a 15 s timeout (`AbortSignal.timeout`), and HTTP 429 gets a rate-limit message.
- `Promise.allSettled`: if some requests fail, the others still produce a catalog (not written to the session cache, so the next session retries). It only throws when nothing came back.
- Every body is validated with `parseSearchResults` (dropping malformed entries and Lookup's artist wrappers), normalized + enriched, de-duplicated by `trackId` (`normalizeTracks` → `dedupeTracks`) so React keys are always unique, and filtered with `isVaultTrack`.
- **Caching & sharing:** memory cache → `sessionStorage` (`rmv:catalog:v2`, 30 min TTL, re-validated via `parseCatalogCache`) → one shared in-flight batch. The batch is owned by the module, not the component: each caller's `signal` only stops *that caller* waiting (`abortable`), so StrictMode's mount → unmount → mount fires the network batch once. `forceRefresh` (Retry) clears both caches and starts a new batch.
- `App` holds `tracks`, `status: FetchStatus` (initially `'loading'`), and `error: string | null`, and passes them, plus `onRetry`, to Catalog, Detail, and Arena.
- **Retry:** `handleRetry` sets `status` back to `'loading'` and bumps a `requestId` counter, which is the effect's dependency, so the effect runs again. State is never set synchronously inside the effect body.
- Uses an `AbortController` in the effect cleanup; results and errors that arrive after an abort are ignored. React StrictMode's double-mount and fast navigation never update state from a stale request.
- Treats a non-OK HTTP response (`!response.ok`) as an error, not just a network failure. Network failures become a friendly "Couldn't reach the iTunes API" message (the original error is kept as `cause`).

### Setlist persistence — `App.tsx` + `setlistUtils.ts`

- `useState(() => loadSetlist(getBrowserStorage()))` lazily loads the `localStorage` key `rmv:setlist`. `getBrowserStorage()` returns `null` where storage access throws (private mode, sandboxing). `loadSetlist` → `parseStoredSetlist` returns `[]` for missing, corrupted, or non-array data, drops malformed entries and duplicate ids, and **re-derives origin/flag/style** with `getArtistMetadata`, so saved tracks pick up artist-map updates.
- A `useEffect` calls `saveSetlist(storage, setlist)` whenever the setlist changes; it returns `false` instead of throwing when storage is full or blocked.
- Stores **full `Track` objects** (not just ids), so `/setlist` and saved tracks' detail pages still work if the API is down.
- `App` passes `isInSetlist(id)` (backed by a memoized `Set` of ids), `toggleSetlistTrack(track)`, `removeSetlistTrack(id)`, and `clearSetlist()` down as props, plus `setlist.length` to the `Navbar` badge. All updates are immutable (`toggleTrackInList`, `removeTrackFromList`).

### Track detail lookup

`TrackDetailPage` parses `id` from `useParams` and looks it up in the catalog first, then in the setlist. A track found in either place renders immediately, even while the catalog is loading or after a fetch error. Otherwise it shows `StatusMessage` (loading / error with Retry), and if the id isn't numeric or isn't found, the "Track not found" state.

## 5. Signature Feature Design

### 1 — Sonic Mood Capsules

- `MOOD_CAPSULES: MoodCapsule[]` (in `trackUtils.ts`) defines the four pills in display order.
- `matchesMood(track, mood)` holds the rules: `≥ 300 000 ms`; `year ≥ 2010 && (/metal/i.test(genre) || /metal|core/i.test(subgenre))`; `1970 ≤ year ≤ 1989`; `< 210 000 ms`. Tracks with a `null` year never match the year-based moods. The style check means "Hard Rock"-tagged metalcore bands (e.g. Bring Me The Horizon) still count.
- The mood is part of `TrackFilters`, and `filterTracks` applies it (`mood: null` = no capsule), so moods combine (AND) with search and the other filters.

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

- **Hook API:** `useAmpConsole(audioRef, preset)` returns `{ engine: 'idle' | 'active' | 'unavailable', connect(), readFrequencies() }`.
- **Graceful fallback:** if `AudioContext` is missing or graph creation throws, `engine` becomes `'unavailable'`. The plain `<audio>` element keeps playing, the EQ buttons are disabled, and a note explains why.
- **Lazy start:** the `AudioContext` and nodes are created on the first Play click (a user gesture, required by browser autoplay policies) and kept in refs. A media element can only be connected to one `MediaElementAudioSourceNode`, so the graph is built exactly once per element.
- **Live EQ:** switching presets calls `gain.setTargetAtTime(db, ctx.currentTime, 0.05)` on the three filters. The sound changes smoothly, and playback is never restarted.
- **Visualizer:** while playing, a `requestAnimationFrame` loop reads `analyser.getByteFrequencyData()`, reduces it to N bars with `bucketFrequencies()`, and draws on a `<canvas>`. The loop is cancelled on pause, on end, and on unmount.
- **Cleanup:** on unmount (or when `src` changes) the hook cancels the animation frame and closes the `AudioContext`.
- **CORS:** Apple serves previews with `Access-Control-Allow-Origin: *`, so `crossOrigin="anonymous"` keeps the analyser data from being silenced.
- `EQ_PRESETS` (in `audioUtils.ts`): `Flat` 0/0/0 · `Metalcore Scoop` +5/−6/+4 · `Classic Tube Amp` +2/+4/−2 · `Bass Drop` +9/−2/−1 (bass/mid/treble dB).

### 3 — Festival Lineup & Poster Builder

- `buildFestivalLineup(tracks)` groups setlist tracks by artist into `LineupAct`s (carrying the act's origin flag/country and style). Acts are ranked by number of tracks (desc), then runtime (desc), then name. The top `getHeadlinerCount(acts) = min(3, ceil(acts / 3))` acts are **Headliners**; the rest form the **Main Stage** underbill. `totalRuntimeMs` = `getTotalDuration(tracks)`.
- `SetlistPage` shows the theme switcher (a radio group), the poster, and the **running order** (saved order, durations, detail links, Remove buttons, and a two-step "Clear Lineup" confirmation).
- `FestivalPoster` is pure presentation. The theme is a `data-theme="foggy-woodland|blood-moon|vintage-tour"` attribute that swaps CSS custom properties (`--poster-bg`, `--poster-ink`, `--poster-accent`, `--poster-font`), so there's no theme-specific JSX.

### 4 — Riff Blind-Test Challenge

- `buildBlindTestRound(tracks, random)` picks the answer with `pickRandomTrack`, then 3 decoys by **different artists** (so the answer is never ambiguous), and shuffles all 4 with `shuffle(items, random)`. It returns `null` when the catalog has fewer than 4 distinct artists.
- A plain `<audio>` element (not the Amp Console) starts on the "Start round" click. Its `timeupdate` events drive `elapsed`, and `getArtworkBlur(elapsed)` maps 0 → 30 s to 24px → 0px blur (CSS `filter: blur()`). After a guess, the blur goes to 0.
- `applyGuess(score, isCorrect)` returns the next `BlindTestScore` (streak resets on a miss; `bestStreak = max`).
- The Head-to-Head uses `compareTracks(a, b)` to build the comparison table.

## 5b. Music-Data Enrichments

### Band origin & style (`artistMetadata.ts`)

- `ARTIST_ENTRIES` is a curated list of ~170 rock/metal/metalcore artists (`[name, originCountry, subgenre, itunesArtistId?]`) across 19 countries, stored in a `Map` keyed by `normalizeArtistKey(name)`. The key is accent-stripped ("Sólstafir" → "solstafir"), lowercased, has a trailing `"(US)"`-style qualifier removed, uses straight quotes, and has its whitespace collapsed. The ~60 international "spotlight" bands carry their Apple artist id, which feeds `SPOTLIGHT_ARTIST_IDS` (the Lookup request).
- `findArtistMetadata(artist, artistId?, genre?)` matches in order: (1) the **Apple artist id** (survives credits like "BABYMETAL & Electric Callboy"); (2) the normalized name, unless the ids differ **and** the genre isn't rock/metal, which marks a **namesake** (hip-hop "Ghost", electronic "Avatar"); (3) the **lead artist** of a collaboration. It returns `null` when the artist isn't listed.
- `getArtistMetadata(artist, itunesGenre, artistId?)` never fails. Unlisted artists get `originCountry: 'Unknown'` (we never guess a country) and a style mapped from the iTunes genre (`Metal` → Heavy Metal, `Punk` → Punk Rock, … else `Rock`).
- `normalizeTrack` calls it, so every `Track` (live or fixture) carries `originCountry`, `originFlag` (`COUNTRY_FLAGS`), and `subgenre`.
- **Catalog membership:** `isVaultTrack(track)` = genre on `ROCK_METAL_GENRES` **or** artist in the curated map (by id or name), whatever Apple files the album under ("World", "Worldwide", "Singer/Songwriter", "Electronic"). "Alternative" is not on the allowlist, so pop-leaning Alternative acts (twenty one pilots, Hozier, …) are dropped, while curated bands (Linkin Park, Green Day, …) stay.

### 6-String Guitar Riff Tab (`riffTabs.ts`)

- **Signature riffs first:** `SIGNATURE_RIFFS` holds simplified tabs of a few iconic opening riffs (Iron Man, Back In Black, Smoke on the Water, Smells Like Teen Spirit, Sweet Child O' Mine, Crazy Train, Nothing Else Matters). `findSignatureRiff` matches on `normalizeArtistKey(artist)` + `normalizeTitleKey(title)`, so "(2012 Remaster)" / "[Live]" / " - Remastered" variants still match. Only riffs that can be tabbed reliably are listed.
- **Practice riffs otherwise:** every other track gets a **style-based practice riff, not a transcription**. The UI labels it that way (e.g. "Metalcore practice riff").
- `SUBGENRE_RIFF_FAMILIES: Record<Subgenre, RiffFamily>` maps every style to one of 12 families (incl. `black-metal` tremolo picking and slow `doom`). `RIFF_PROFILES: Record<RiffFamily, …>` gives each family a tuning (Drop C, Drop B, Drop D, D Standard, E Standard), a BPM range, a difficulty, and two riff templates.
- Templates are lists of `RiffStep`s built from helpers: `chug(fret)` (low-string chug), `dropFive` (one-finger drop power chord), `powerE` / `powerA` (standard power chords), and `note`.
- `getTabColumns(steps)` pads each step into a column as wide as its widest fret (so `10` never breaks alignment); `renderTab(steps)` joins the columns into six `|-…-|` lines.
- **Playhead:** `getRiffPlayheadIndex(seconds, bpm, columns, stepsPerBeat)` = `floor(seconds × bpm × stepsPerBeat / 60) mod columns`, so the highlight loops through the riff in time with the preview.
- `getTrackRiffTab(track)` is deterministic: the style picks the profile, and `track.id` picks the template and a BPM within the range.

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
| `isRockOrMetalGenre` | `(genre: string) => boolean` | Exact match against the `ROCK_METAL_GENRES` allowlist (Rock, Hard Rock, Metal, Punk, …; no "Alternative") | ✅ Task 4 |
| `isVaultTrack` | `(track: Pick<Track, 'genre' \| 'artist' \| 'artistId'>) => boolean` | Allowlisted genre **or** curated artist (by id or name, namesakes excluded); used by `fetchCatalog` | ✅ Task 4 + expansion |
| `filterTracks` | `(tracks, filters: Omit<TrackFilters, 'sort'>) => Track[]` | Case-insensitive, trimmed search across title/artist/album/subgenre/country, combined (AND) with exact country, subgenre, and artist matches and the mood capsule | ✅ Task 4 |
| `sortTracks` | `(tracks: Track[], sort: SortKey) => Track[]` | Returns a **new** array (never mutates the input); text sorts use `localeCompare` | ✅ Task 4 |
| `getTotalDuration` | `(tracks: Track[]) => number` | Sum of `durationMs` (0 for an empty list) | ✅ Task 4 |
| `getUniqueCountries` / `getUniqueSubgenres` / `getUniqueArtists` | `(tracks: Track[]) => OriginCountry[] / Subgenre[] / string[]` | Sorted, de-duplicated option lists for `FilterBar` ("Unknown" country last) | ✅ Task 4 |
| `DEFAULT_FILTERS` / `hasActiveFilters` | `TrackFilters` / `(filters) => boolean` | Starting/reset filter state (sorted by artist); whether anything narrows the list (sort and blank search don't count) | ✅ Task 5 |
| `MOOD_CAPSULES` / `matchesMood` | `MoodCapsule[]` / `(track, mood: MoodId) => boolean` | Sonic Mood Capsule definitions and rules (see §5) | ✅ Task 4 |
| `pickRandomTrack` | `(tracks: Track[], random?: () => number) => Track \| null` | Injectable RNG (defaults to `Math.random`) for deterministic tests; `null` for an empty list | Task 7 |
| `shuffle` | `<T>(items: T[], random?: () => number) => T[]` | Fisher–Yates on a copy | Task 7 |
| `buildBlindTestRound` | `(tracks: Track[], random?: () => number) => BlindTestRound \| null` | Answer + 3 decoys by distinct artists, shuffled | Task 7 |
| `getArtworkBlur` | `(elapsedSec: number, totalSec?: number, maxBlurPx?: number) => number` | Linear 24px → 0px over 30s, clamped | Task 7 |
| `applyGuess` | `(score: BlindTestScore, isCorrect: boolean) => BlindTestScore` | Score/streak/best-streak update | Task 7 |
| `compareTracks` | `(a: Track, b: Track) => ComparisonRow[]` | Rows for duration, release year, explicit rating, album track count, each with a winner | Task 7 |

### `src/utils/artistMetadata.ts`

| Function / constant | Signature | Behavior | Test |
| --- | --- | --- | --- |
| `COUNTRY_FLAGS` | `Record<OriginCountry, string>` | Emoji flag per country (`🌐` for Unknown) | ✅ Task 4 |
| `normalizeArtistKey` | `(name: string) => string` | Case/quote/qualifier/whitespace-insensitive lookup key | ✅ Task 4 |
| `findArtistMetadata` | `(artist: string) => ArtistMetadata \| null` | Curated lookup (exact, then lead artist of a collaboration) | ✅ Task 4 |
| `getArtistMetadata` | `(artist: string, itunesGenre: string) => ArtistMetadata` | Curated data or the deterministic `Unknown` + genre-derived fallback | ✅ Task 4 |

### `src/utils/riffTabs.ts`

| Function / constant | Signature | Behavior | Test |
| --- | --- | --- | --- |
| `GUITAR_STRINGS` | `readonly GuitarString[]` | `['e', 'B', 'G', 'D', 'A', 'E']` — tab line order | ✅ Task 4 |
| `SUBGENRE_RIFF_FAMILIES` / `RIFF_PROFILES` | `Record<Subgenre, RiffFamily>` / `Record<RiffFamily, RiffProfile>` | Style → family → tuning, BPM range, difficulty, templates | ✅ Task 4 |
| `renderTab` | `(steps: readonly RiffStep[]) => Record<GuitarString, string>` | Six aligned `\|-…-\|` lines; multi-digit frets widen the whole column | ✅ Task 4 |
| `getTabColumns` | `(steps: readonly RiffStep[]) => TabColumn[]` | Padded per-step columns (used by the playhead and `renderTab`) | ✅ Task 5 |
| `SIGNATURE_RIFFS` / `normalizeTitleKey` / `findSignatureRiff` | — / `(title) => string` / `(track) => SignatureRiff \| null` | Curated signature riffs and title-variant-tolerant matching | ✅ Task 5 |
| `getTrackRiffTab` | `(track: Pick<Track, 'id' \| 'subgenre' \| 'artist' \| 'title'>) => GuitarRiffTab` | Signature riff when listed, otherwise a deterministic practice riff | ✅ Task 4–5 |
| `getRiffPlayheadIndex` | `(seconds, bpm, stepCount, stepsPerBeat?) => number \| null` | Looping playhead column; `null` when nothing can be highlighted | ✅ Task 5 |

### `src/utils/setlistUtils.ts`

| Function / constant | Signature | Behavior | Test |
| --- | --- | --- | --- |
| `toggleTrackInList` / `removeTrackFromList` | `(list, track) => Track[]` / `(list, trackId) => Track[]` | Append-or-remove / remove by id; immutable, running order preserved | ✅ Task 6 |
| `reviveStoredTrack` | `(value: unknown) => Track \| null` | Validates stored JSON and re-derives origin/flag/style | ✅ Task 6 |
| `parseStoredSetlist` | `(raw: string \| null) => Track[]` | Safe `JSON.parse`; `[]` for null, invalid JSON, or non-arrays; drops malformed entries and duplicates | ✅ Task 6 |
| `getBrowserStorage` / `loadSetlist` / `saveSetlist` | `() => Storage \| null` / `(storage) => Track[]` / `(storage, tracks) => boolean` | `localStorage` access that never throws (`SETLIST_STORAGE_KEY = 'rmv:setlist'`) | ✅ Task 6 |
| `POSTER_THEMES` | `PosterThemeOption[]` | Foggy Woodland, Blood Moon, Vintage Tour | ✅ Task 6 |
| `getHeadlinerCount` / `buildFestivalLineup` | `(acts) => number` / `(tracks) => FestivalLineup` | Top-third headliners (1–3); groups, ranks, and splits into Headliners / Main Stage | ✅ Task 6 |

### `src/utils/catalogCache.ts` & `src/api/itunes.ts` (pure parts)

| Function / constant | Signature | Behavior | Test |
| --- | --- | --- | --- |
| `CATALOG_CACHE_KEY` / `CATALOG_CACHE_TTL_MS` | `'rmv:catalog:v2'` / 30 min | Versioned session cache key and lifetime | ✅ expansion |
| `serializeCatalogCache` / `parseCatalogCache` | `(tracks, now) => string` / `(raw, now, ttl?) => Track[] \| null` | `null` when missing, corrupted, expired, from the future, or empty; tracks are re-validated | ✅ expansion |
| `buildSearchUrl` / `buildLookupUrls` / `getCatalogRequestUrls` | `(term) => string` / `(ids) => string[]` / `() => string[]` | The request plan: 3 searches + lookups of ≤ 100 ids (≤ 5 requests) | ✅ expansion |

### `src/utils/audioUtils.ts`

| Function / constant | Signature | Behavior | Test |
| --- | --- | --- | --- |
| `EQ_BANDS` | `{ bass, mid, treble }` | Filter type + frequency (+ Q) per band | — |
| `EQ_PRESETS` / `EQ_PRESET_IDS` | `Record<EqPresetId, EqPreset>` / `readonly EqPresetId[]` | The four Amp Console presets and their button order | ✅ Task 5 |
| `bucketFrequencies` | `(data: ArrayLike<number>, bars: number, usableFraction = 0.75) => number[]` | Averages the lower 75% of FFT bins into `bars` values normalized to 0–1 | ✅ Task 5 |

**Test fixtures:** `src/data/mockTracks.json` (10 real iTunes records from US, UK, and Australian bands) uses the raw iTunes response shape, and tests load it through `parseSearchResults`, the same validation the live API uses. It feeds the static list in Tasks 1–2 and is reused as the test fixture after the switch to the real API in Task 3. The tests never hit the network.

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

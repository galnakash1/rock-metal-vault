# Rock & Metal Vault — Architecture

> Product requirements: [../PRD.md](../PRD.md) · Build plan: [../tasks.md](../tasks.md)

This document describes how the app is structured: folders, the component hierarchy, TypeScript types, where state lives, and which pure utility functions are unit-tested.

## 1. Folder Structure

```
src/
├── main.tsx                  # React root + <BrowserRouter>
├── App.tsx                   # Layout (Navbar + <Routes>), owns the shared state
├── index.css                 # Global theme: CSS variables, reset, typography
├── App.css                   # Layout + component styles
│
├── types/
│   └── track.ts              # All shared TypeScript types (raw API + app models)
│
├── data/
│   └── mockTracks.json       # 8 rock/metal tracks in raw iTunes shape (Task 1; later a test fixture)
│
├── api/
│   └── itunes.ts             # fetchCatalog(): calls the iTunes Search API, returns Track[]
│
├── hooks/
│   ├── useTracks.ts          # Fetches the catalog in useEffect → { status, tracks, error, retry }
│   └── useSetlist.ts         # Setlist state, synced to localStorage
│
├── utils/
│   ├── trackUtils.ts         # Pure functions: normalize, format, filter, sort, stats
│   └── trackUtils.test.ts    # Vitest unit tests
│
├── components/               # Reusable, presentational (one component per file)
│   ├── Navbar.tsx
│   ├── TrackCard.tsx
│   ├── FilterBar.tsx
│   ├── AudioPreviewPlayer.tsx
│   ├── StatusMessage.tsx
│   ├── SetlistButton.tsx
│   ├── TrackSelect.tsx
│   └── StatCard.tsx
│
└── pages/                    # One component per route
    ├── CatalogPage.tsx       # /
    ├── TrackDetailsPage.tsx  # /tracks/:id
    ├── SetlistPage.tsx       # /setlist
    ├── ArenaPage.tsx         # /arena
    └── NotFoundPage.tsx      # *
```

## 2. Component Hierarchy

**Pages** are route-level containers. They receive shared data as props, own page-local UI state, and compose components.
**Components** are reusable, mostly presentational building blocks. They get data and callbacks through props and never fetch data themselves.

```
<BrowserRouter>                                   (main.tsx)
└── <App>                                         owns: useTracks(), useSetlist()
    ├── <Navbar setlistCount />
    └── <Routes>
        ├── "/"            <CatalogPage tracks status error onRetry isInSetlist onToggleSetlist>
        │                   ├── <StatusMessage />          (loading / error / empty results)
        │                   ├── <FilterBar filters genres artists onChange resultCount totalCount />
        │                   └── <TrackCard track inSetlist onToggleSetlist />  × N
        │                         └── <SetlistButton />
        │
        ├── "/tracks/:id"  <TrackDetailsPage tracks status setlist isInSetlist onToggleSetlist>
        │                   ├── <StatusMessage />          (loading / not found)
        │                   ├── <AudioPreviewPlayer src title />
        │                   └── <SetlistButton />
        │
        ├── "/setlist"     <SetlistPage setlist onRemove onClear>
        │                   ├── <StatusMessage />          (empty setlist)
        │                   └── rows → <AudioPreviewPlayer /> + Remove button
        │
        ├── "/arena"       <ArenaPage tracks status>
        │                   ├── <StatusMessage />
        │                   ├── <TrackSelect /> × 2        (Head-to-Head pickers)
        │                   ├── comparison table           (from compareTracks())
        │                   ├── <StatCard /> × N           (from getCatalogStats())
        │                   └── <TrackCard />              (random track result)
        │
        └── "*"            <NotFoundPage />
```

### Reusable components

| Component | Responsibility | Key props |
| --- | --- | --- |
| `Navbar` | Brand logo + `NavLink`s (Vault / Setlist / Arena); highlights the active route; shows the setlist count badge | `setlistCount: number` |
| `TrackCard` | Artwork, title, artist, album, duration, explicit badge; links to `/tracks/:id`; contains the setlist toggle | `track`, `inSetlist`, `onToggleSetlist` |
| `FilterBar` | Controlled search input, genre `<select>`, artist `<select>`, sort `<select>`, results count | `filters`, `genres`, `artists`, `onChange`, `resultCount`, `totalCount` |
| `AudioPreviewPlayer` | HTML5 `<audio controls preload="none">` for the 30s preview, with an accessible label; shows a fallback when `src` is missing | `src`, `title` |
| `StatusMessage` | One place for the Loading, Error (with optional retry), and Empty / Not-found UI states | `variant`, `message`, `onRetry?`, `action?` |
| `SetlistButton` | Add / Remove toggle with an `aria-pressed` state; stops click propagation when used inside a card link | `inSetlist`, `onToggle` |
| `TrackSelect` | Labelled `<select>` listing catalog tracks (used twice in the Arena) | `label`, `tracks`, `value`, `onChange` |
| `StatCard` | A single labelled statistic tile | `label`, `value`, `hint?` |

The first five (`Navbar`, `TrackCard`, `FilterBar`, `AudioPreviewPlayer`, `StatusMessage`) are required. `SetlistButton`, `TrackSelect`, and `StatCard` are small helpers added in Tasks 6–7 to avoid duplicated markup.

## 3. TypeScript Interfaces (`src/types/track.ts`)

All types live in one file. **No `any` anywhere.** The raw API shape is kept separate from the app model, so the rest of the app never depends on Apple's field names.

```ts
// ---------- Raw iTunes API shapes ----------
export type ITunesExplicitness = 'explicit' | 'notExplicit' | 'cleaned';

export interface ITunesTrackRaw {
  wrapperType: string;            // "track" for songs
  kind?: string;                  // "song"
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  primaryGenreName: string;
  releaseDate: string;            // ISO 8601
  trackExplicitness: ITunesExplicitness;
  trackCount?: number;            // tracks on the album
  trackNumber?: number;
  trackViewUrl?: string;
}

export interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesTrackRaw[];
}

// ---------- App model ----------
export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  genre: string;
  artworkUrl: string;             // original 100x100
  artworkUrlLarge: string;        // upgraded 600x600
  previewUrl: string;
  durationMs: number;
  releaseDate: string;            // ISO 8601
  releaseYear: number;
  isExplicit: boolean;
  albumTrackCount: number | null; // null when the API omits it
  storeUrl: string | null;
}

// ---------- Filtering & sorting ----------
export type SortKey =
  | 'title-asc'
  | 'title-desc'
  | 'artist-asc'
  | 'year-newest'
  | 'year-oldest'
  | 'duration-shortest'
  | 'duration-longest';

export interface TrackFilters {
  search: string;                 // free text; '' = no search
  genre: string;                  // '' = all genres
  artist: string;                 // '' = all artists
  sort: SortKey;
}

// ---------- Async state ----------
export type FetchStatus = 'loading' | 'error' | 'success';

// ---------- Arena ----------
export type ComparisonWinner = 'a' | 'b' | 'tie' | 'none';

export interface ComparisonRow {
  label: string;                  // e.g. "Duration"
  valueA: string;                 // display-ready
  valueB: string;
  winner: ComparisonWinner;       // 'none' for non-numeric rows (e.g. explicit rating)
}

export interface CatalogStats {
  totalTracks: number;
  uniqueArtists: number;
  averageDurationMs: number;
  longestTrack: Track | null;
  shortestTrack: Track | null;
  oldestYear: number | null;
  newestYear: number | null;
  explicitPercent: number;        // 0–100, rounded
  genreCounts: Record<string, number>;
}
```

### Component props (examples)

Each component declares and exports its own `Props` interface in its own file:

```ts
export interface TrackCardProps {
  track: Track;
  inSetlist: boolean;
  onToggleSetlist: (track: Track) => void;
}

export interface FilterBarProps {
  filters: TrackFilters;
  genres: string[];
  artists: string[];
  resultCount: number;
  totalCount: number;
  onChange: (next: TrackFilters) => void;
}

export interface StatusMessageProps {
  variant: 'loading' | 'error' | 'empty';
  message: string;
  onRetry?: () => void;
  action?: { label: string; to: string };   // e.g. "Back to Vault" → "/"
}

export interface AudioPreviewPlayerProps {
  src: string;
  title: string;
}

export interface NavbarProps {
  setlistCount: number;
}
```

## 4. State Management Strategy

There are no external state libraries — just React state, custom hooks, and props. The rule: **state lives in the lowest component that all of its consumers share; anything that can be computed is derived, not stored.**

| State | Lives in | Why | Flows to |
| --- | --- | --- | --- |
| Catalog `tracks`, `status`, `error` | `App` via `useTracks()` | Needed by Catalog, Details, and Arena; fetched **once** (rate limits) and shared | Props → pages |
| `setlist: Track[]` + actions | `App` via `useSetlist()` | Needed by the Navbar badge, cards, Details, and the Setlist page | Props → `Navbar`, pages → `TrackCard` / `SetlistButton` |
| `filters: TrackFilters` | `CatalogPage` (`useState`) | Only the catalog uses it | Props → `FilterBar`; `onChange` callback goes back up |
| Visible (filtered + sorted) tracks | Derived in `CatalogPage` with `useMemo(() => sortTracks(filterTracks(tracks, filters), filters.sort))` | Derived data — never stored in state | Props → `TrackCard`s |
| Genre / artist options | Derived with `getUniqueGenres` / `getUniqueArtists` | Derived | Props → `FilterBar` |
| Arena selections (`trackAId`, `trackBId`) and random pick | `ArenaPage` (`useState`) | Page-local; ids are stored instead of objects to avoid stale copies | Props → `TrackSelect`s |
| Catalog stats, comparison rows | Derived in `ArenaPage` with `useMemo` | Derived | Props → `StatCard`s / table |
| Current track | Derived in `TrackDetailsPage` from `useParams().id` + `tracks` | Single source of truth is the URL | Local render |

**Data flows down via props; events flow up via callbacks** (`onChange`, `onToggleSetlist`, `onRemove`, `onClear`, `onRetry`).

### `useTracks()` — data fetching

- Runs `fetchCatalog(signal)` inside `useEffect`. That call makes 3 parallel requests (`rock`, `metal`, `metalcore`) with `Promise.all`, then normalizes and de-duplicates the results.
- Exposes `{ status: FetchStatus, tracks: Track[], error: string | null, retry: () => void }`.
- Uses an `AbortController` in the effect cleanup, so React StrictMode's double-mount and fast navigation never update state after unmount.
- Treats a non-OK HTTP response (`!response.ok`) as an error, not just a network failure.

### `useSetlist()` — persistence

- Lazy-initializes from `localStorage` key `rmv:setlist` via `parseStoredSetlist()`, which returns `[]` for missing, corrupted, or non-array data.
- Writes back to `localStorage` in a `useEffect` whenever the setlist changes.
- Stores **full `Track` objects** (not just ids), so `/setlist` and saved tracks' detail pages still work if the API is down.
- Exposes `{ setlist, isInSetlist(id), toggleTrack(track), removeTrack(id), clearSetlist() }`. All updates are immutable.

### Track details lookup

`TrackDetailsPage` parses `id` from `useParams` and looks it up in the catalog first, then in the setlist. While the catalog is loading, it shows `StatusMessage` (loading). If the id isn't numeric or isn't found, it shows the "Track not found" state.

## 5. Utility Functions (`src/utils/trackUtils.ts`)

All of these are **pure functions** with no React and no DOM, so they are easy to unit-test with Vitest. Functions marked ✅ are covered in Task 4. The rest get tests in the task that introduces them.

| Function | Signature | Behavior | Test |
| --- | --- | --- | --- |
| `formatDuration` | `(ms: number \| undefined) => string` | `245000 → "04:05"`; zero-padded `mm:ss`; ≥ 1 hour → `"h:mm:ss"` (for setlist totals); invalid/negative/undefined → `"00:00"`; rounds down to whole seconds | ✅ Task 4 |
| `upgradeArtworkUrl` | `(url: string, size?: number) => string` | Replaces `/\d+x\d+bb/` with `600x600bb` (default size); returns non-matching URLs unchanged | ✅ Task 4 |
| `getReleaseYear` | `(isoDate: string) => number` | Uses `getUTCFullYear()` to avoid time-zone off-by-one; `NaN`-safe | ✅ Task 4 |
| `normalizeTrack` | `(raw: ITunesTrackRaw) => Track \| null` | Maps the API shape to `Track`; returns `null` for non-songs or entries without `previewUrl` | ✅ Task 4 |
| `normalizeTracks` | `(raws: ITunesTrackRaw[]) => Track[]` | Normalizes, drops `null`s, de-duplicates by `id` | ✅ Task 4 |
| `filterTracks` | `(tracks: Track[], filters: TrackFilters) => Track[]` | Case-insensitive, trimmed search across title/artist/album, combined (AND) with exact genre and artist match | ✅ Task 4 |
| `sortTracks` | `(tracks: Track[], sort: SortKey) => Track[]` | Returns a **new** array (never mutates the input); text sorts use `localeCompare` | ✅ Task 4 |
| `getTotalDuration` | `(tracks: Track[]) => number` | Sum of `durationMs` (0 for an empty list) | ✅ Task 4 |
| `getUniqueGenres` / `getUniqueArtists` | `(tracks: Track[]) => string[]` | Sorted, de-duplicated option lists for `FilterBar` | ✅ Task 4 |
| `parseStoredSetlist` | `(raw: string \| null) => Track[]` | Safe `JSON.parse`; `[]` for null, invalid JSON, or non-arrays | Task 6 |
| `toggleTrackInList` | `(list: Track[], track: Track) => Track[]` | Adds the track if absent, removes it if present (immutable) | Task 6 |
| `compareTracks` | `(a: Track, b: Track) => ComparisonRow[]` | Rows for duration, release year, explicit rating, album track count, each with a winner | Task 7 |
| `getCatalogStats` | `(tracks: Track[]) => CatalogStats` | Aggregates for the stats dashboard; safe for an empty catalog | Task 7 |
| `pickRandomTrack` | `(tracks: Track[], random?: () => number) => Track \| null` | Takes an injectable RNG (defaults to `Math.random`) so tests are deterministic; `null` for an empty list | Task 7 |

**Test fixtures:** `src/data/mockTracks.json` uses the raw iTunes response shape. It feeds the static list in Task 1 and is reused as the test fixture after the switch to the real API in Task 3. The tests never hit the network.

## 6. Routing

| Path | Page | Notes |
| --- | --- | --- |
| `/` | `CatalogPage` | Master list |
| `/tracks/:id` | `TrackDetailsPage` | `useParams<{ id: string }>()` |
| `/setlist` | `SetlistPage` | `localStorage`-backed |
| `/arena` | `ArenaPage` | Head-to-Head + stats + random |
| `*` | `NotFoundPage` | Fallback |

`<BrowserRouter>` wraps `<App>` in `main.tsx`. `<Navbar>` sits outside `<Routes>`, so it renders on every page.

## 7. Styling

- Plain CSS only: `index.css` holds theme tokens (CSS custom properties for colors, spacing, and fonts), and `App.css` holds layout and component styles.
- Dark Rock/Metal look: near-black background, steel greys, and a blood-red / amber accent.
- Responsive: CSS Grid with `auto-fill, minmax(...)` for the card grid; a single-column layout and a wrapping Navbar below about 600px.
- Accessibility: visible `:focus-visible` outlines, sufficient contrast, and `prefers-reduced-motion` respected for hover animations.

# Rock & Metal Vault — Build Plan

> Requirements: [PRD.md](PRD.md) · Design: [docs/architecture.md](docs/architecture.md)

**Rules (see [AGENTS.md](AGENTS.md)):** one task at a time, in order. At the end of each task, stop and explain what changed in 3 sentences. The developer reviews and runs `git commit`; the agent never commits.

**Signature features (exactly four, nothing extra):** ① Sonic Mood Capsules (Task 4 logic, Task 5 UI) · ② Amp Console Player (Task 5) · ③ Festival Poster Builder (Task 6) · ④ Riff Blind-Test Challenge (Task 7).

**Music-data enrichments:** Band Origin & Style, Country/Style filtering, and the 6-String Guitar Riff Tab (Task 4 logic and tests, Task 5 UI).

---

## Task 1 — Types, mock data, utilities, and a static list

- [x] **Goal:** Lay the typed data foundation and render something real on screen.
- **Files:** `src/types/track.ts`, `src/data/mockTracks.json`, `src/utils/trackUtils.ts`, `src/App.tsx` (and clean up the Vite template in `App.css` / `index.css`)
- **Steps:**
  1. In `src/types/track.ts`, define `ITunesTrackRaw`, `ITunesSearchResponse`, `Track`, `TrackFilters`, `SortKey`, and `FetchStatus`, as described in the architecture doc.
  2. Create `src/data/mockTracks.json` with **8–10 rock/metal tracks** in the raw iTunes response shape (`{ resultCount, results: [...] }`).
  3. In `src/utils/trackUtils.ts`, implement `formatDuration`, `upgradeArtworkUrl`, `getReleaseYear`, `normalizeTrack`, `dedupeTracks`, `normalizeTracks`, `filterTracks`, `sortTracks`, `getTotalDuration`, `getUniqueGenres`, and `getUniqueArtists`.
  4. In `App.tsx`, import the mock JSON, normalize it, and render a simple static list (artwork, title, artist, `mm:ss` duration).
- **Done when:** `npm run dev` shows the mock tracks with formatted `mm:ss` durations, and `npm run build` passes with zero TypeScript errors and no `any`.

---

## Task 2 — Routing, Navbar, and the detail page

- [x] **Goal:** Turn the single view into a multi-page SPA.
- **Files:** `package.json`, `src/App.tsx`, `src/components/Navbar.tsx`, `src/pages/CatalogPage.tsx`, `src/pages/TrackDetailPage.tsx`, `src/pages/SetlistPage.tsx`, `src/pages/ArenaPage.tsx`, `src/pages/NotFoundPage.tsx`, `src/App.css`
- **Steps:**
  1. Run `npm install react-router-dom`.
  2. In `App.tsx`, wrap the layout in `<BrowserRouter>` and define `<Routes>` for `/`, `/tracks/:id`, `/setlist`, `/arena`, and `*`.
  3. Build `Navbar` with `NavLink`s (Vault Catalog `/`, Festival Poster `/setlist`, Riff Arena `/arena`) that highlight the active route, plus a setlist count badge (0 until the setlist arrives in Task 6).
  4. Move the static list into `CatalogPage` (`.map()` with `key={track.id}`), with each item linking to `/tracks/${track.id}` via `Link`.
  5. Make `TrackDetailPage` read `id` with `useParams` and receive `tracks` via props. It shows 600×600 artwork, title, artist, album, release year, `mm:ss` duration, genre, and an explicit badge, plus a basic `<audio controls>` placeholder for the Task 5 Amp Console. Unknown ids show a "Track not found" message.
  6. Add shell pages for the Festival Poster (`/setlist`) and Riff Arena (`/arena`), and a real 404 page.
- **Done when:** clicking a track opens `/tracks/:id` with its correct details; the Navbar links switch pages without a full reload and highlight the active link; `/tracks/999` shows "Track not found"; an unknown URL shows the 404 page; and `npm run build` and `npm run lint` pass.

---

## Task 3 — Real data from the iTunes API with Loading / Error / Data states

- [x] **Goal:** Replace the mock data with live data, handling every async state.
- **Files:** `src/api/itunes.ts`, `src/utils/trackUtils.ts`, `src/components/StatusMessage.tsx`, `src/App.tsx`, the pages
- **Steps:**
  1. In `src/api/itunes.ts`, write `fetchCatalog(signal)`. It fetches `rock`, `metal`, and `metalcore` (`media=music&entity=song&limit=50`) in parallel, checks `response.ok`, validates the bodies (`parseSearchResults`), normalizes and de-duplicates the results by `trackId`, and keeps only rock/metal-family genres (`isRockOrMetalGenre` allowlist).
  2. In `App.tsx`, call `fetchCatalog` inside `useEffect` with an `AbortController` cleanup, holding `tracks`, `status`, and `error` in state, plus a `requestId` counter that Retry bumps to re-run the effect.
  3. Build the reusable `StatusMessage` component (`loading` / `error` with an optional retry / `empty`).
  4. Pass `tracks`, `status`, `error`, and `onRetry` down as props to Catalog, Detail, and Arena.
  5. Keep `mockTracks.json` as the test fixture only; the UI no longer imports it.
- **Done when:** the catalog shows a loading message, then the real iTunes tracks with no duplicate-key warnings in the console; with the network turned off (DevTools → Offline), a friendly error with a working "Try again" button appears; and the detail page works for live track ids.

---

## Task 4 — Music-data enrichments, Mood Capsule logic, Vitest, and unit tests

- [x] **Goal:** Enrich the track model, finish the pure logic for moods, filters and riff tabs, and prove it all works with automated tests.
- **Files:** `package.json`, `src/types/track.ts`, `src/types/riff.ts`, `src/utils/trackUtils.ts`, `src/utils/artistMetadata.ts`, `src/utils/riffTabs.ts`, `src/api/itunes.ts`, `src/data/mockTracks.json`, `src/utils/trackUtils.test.ts`
- **Steps:**
  1. **Band origin & style:** add the `OriginCountry`, `Subgenre`, and `ArtistMetadata` types, and add `originCountry`, `originFlag`, and `subgenre` to `Track`. Create `artistMetadata.ts`, a curated artist map with case/qualifier/collaboration-tolerant lookup and a deterministic "Unknown" + genre-derived fallback. `normalizeTrack` enriches every track.
  2. **Tighter catalog:** drop "Alternative" from the genre allowlist and add `isVaultTrack` (allowlisted genre **or** curated artist), used by `fetchCatalog`.
  3. **Moods & filters** (signature ①, logic only): add `MoodId` / `MoodCapsule`, `MOOD_CAPSULES`, and `matchesMood`. Extend `TrackFilters` with `country`, `subgenre`, and `mood` (Style replaces the coarse genre filter). `filterTracks` applies all of them, and search also matches subgenre and country. Add `getUniqueCountries` and `getUniqueSubgenres`.
  4. **Guitar Riff Tab:** add `src/types/riff.ts` (`GuitarRiffTab`, …) and `riffTabs.ts` (style profiles, templates, `renderTab`, and `getTrackRiffTab`). These are style-based practice riffs, not transcriptions.
  5. Add a 10th fixture track (AC/DC, Australia) so country filters cover three countries.
  6. Run `npm install -D vitest @vitest/ui`, then add the scripts `"test": "vitest run"` and `"test:ui": "vitest --ui"`.
  7. Write **8–10+ meaningful tests** in `src/utils/trackUtils.test.ts`, using `mockTracks.json` (loaded through `parseSearchResults`) plus edge cases:
     - `formatDuration` (`mm:ss`, ≥ 1 hour, invalid input) and `getTotalDuration` (setlist total, empty list)
     - `upgradeArtworkUrl` (`100x100bb` → `600x600bb`, custom size, non-matching URLs)
     - `parseSearchResults`, `normalizeTrack`, `normalizeTracks` / `dedupeTracks` (duplicate `trackId`s, unplayable entries)
     - Origin/style enrichment (curated, case/qualifier/collaboration matching, Unknown fallback) and `isVaultTrack`
     - `filterTracks` by search (incl. subgenre and country), origin country, style, artist, and combined AND
     - All 4 Sonic Mood Capsules, including boundaries (exactly 5:00 and 3:30; 1969/1970/1989/1990; 2009/2010; non-metal)
     - `sortTracks` (ordering, no mutation) and `getTrackRiffTab` / `renderTab` (tuning by style, six aligned lines, determinism, two-digit frets)
- **Done when:** `npm test` runs 8–10+ passing tests with zero failures; `npm run test:ui` opens the Vitest UI; and `npm run build` and `npm run lint` pass with zero `any`.

---

## Task 5 — Catalog components, Mood Capsules UI, Amp Console, and Riff Tab panel

- [x] **Goal:** Make the catalog interactive, and give the detail page its signature player and riff tab.
- **Files:** `src/components/TrackCard.tsx`, `src/components/FilterBar.tsx`, `src/components/MoodCapsules.tsx`, `src/components/AudioPreviewPlayer.tsx`, `src/components/RiffTabPanel.tsx`, `src/hooks/useAmpConsole.ts`, `src/types/audio.ts`, `src/utils/audioUtils.ts` (+ tests), `src/pages/CatalogPage.tsx`, `src/pages/TrackDetailPage.tsx`
- **Steps:**
  0. Data touches: add HARDY to `artistMetadata.ts`; add simplified **signature riff tabs** for iconic songs to `riffTabs.ts` (practice riffs stay the default), plus `getTabColumns` and `getRiffPlayheadIndex` with tests.
  1. Build `TrackCard`: artwork, title, artist, origin flag + country, style badge, release year, duration, and an explicit badge. It links to the detail page and has an `actions` slot for the Task 6 setlist toggle.
  2. Build `FilterBar`: a controlled search input with a Reset filters button, the mood pills, Origin Country select (flag + name), Style/Subgenre select, Artist select, sort select, and a live summary ("Showing X of Y tracks · total duration"). Every control has a `<label>`.
  3. Build `MoodCapsules` (signature ①): 4 toggle pills with `aria-pressed`; clicking the active pill clears it.
  4. In `CatalogPage`, keep `filters: TrackFilters` (including `mood`) in `useState`, and derive the visible list with `useMemo(sortTracks(filterTracks(tracks, filters), filters.sort))`. Show an `empty` `StatusMessage` when nothing matches.
  5. Add `EQ_PRESETS` and `bucketFrequencies` to `audioUtils.ts`, with tests.
  6. Write the `useAmpConsole` hook. It creates the `AudioContext` lazily on the first play, then wires the source → lowshelf/peaking/highshelf filters → analyser → destination. Preset changes use `setTargetAtTime`, and the hook cleans up the animation frame and context on unmount.
  7. Build `AudioPreviewPlayer` as the Amp Console (signature ②): `<audio crossOrigin="anonymous">`, play/pause and progress controls, a `<canvas>` frequency-bar visualizer, and 4 EQ preset buttons (`Flat`, `Metalcore Scoop`, `Classic Tube Amp`, `Bass Drop`). It replaces the placeholder player on `TrackDetailPage`.
  8. Build `RiffTabPanel`: a monospaced 6-line tab (`e B G D A E`) with tuning, BPM, and difficulty, labelled as a signature or practice riff, with a playhead column synced to the Amp Console's playback. Show it on `TrackDetailPage` next to the Amp Console, along with the origin flag/country and style in the track facts.
- **Done when:** typing in the search box filters the cards live (including by style or country); the country, style, and artist filters, the mood pills, and every sort option work together; the results count updates; "no matches" shows the empty state; the detail page plays the preview with moving frequency bars; switching EQ presets mid-play changes the sound without restarting it; the riff tab panel shows a correctly aligned tab with tuning, BPM, and difficulty; and `npm test` passes.

---

## Task 6 — Setlist with `localStorage` and the Festival Poster Builder

- [x] **Goal:** Let users build a persistent setlist and turn it into a festival poster.
- **Files:** `src/utils/setlistUtils.ts` (+ `setlistUtils.test.ts`), `src/types/track.ts`, `src/components/SetlistButton.tsx`, `src/components/FestivalPoster.tsx`, `src/pages/SetlistPage.tsx`, `src/pages/CatalogPage.tsx`, `src/pages/TrackDetailPage.tsx`, `src/App.tsx`, `src/App.css`
- **Steps:**
  1. Add `setlistUtils.ts`, with unit tests: `toggleTrackInList`, `removeTrackFromList`, `reviveStoredTrack` / `parseStoredSetlist`, `getBrowserStorage` / `loadSetlist` / `saveSetlist`, `POSTER_THEMES`, `getHeadlinerCount`, and `buildFestivalLineup`. Also add the `PosterTheme`, `LineupAct`, and `FestivalLineup` types.
  2. In `App.tsx`, lazily load the setlist from `localStorage` (`rmv:setlist`), save it back in `useEffect`, and pass `isInSetlist`, toggle, remove, and clear handlers down as props. The `Navbar` badge shows `setlist.length`.
  3. Build `SetlistButton` ("Add to Setlist" / "Remove from Setlist"; never triggers card navigation), and use it in the `TrackCard` `actions` slot and on `TrackDetailPage`. The detail page also falls back to the setlist when an id isn't in the catalog.
  4. Build `FestivalPoster` (signature ③): Headliners in large display type, the Main Stage underbill, origin flags + styles, and tracks/bands/runtime stats, themed via `data-theme`.
  5. Build `SetlistPage`: a poster theme switcher (`Foggy Woodland` / `Blood Moon` / `Vintage Tour`), the poster, the running order (durations, detail links, Remove buttons), a "Clear Lineup" button with confirmation, and an empty state linking back to `/`.
- **Done when:** adding and removing from cards and the detail page updates the button and the Navbar badge immediately; the poster shows the correct Headliner/Main Stage split and runtime; switching themes restyles the poster instantly; the lineup survives a page reload; Remove and Clear update the poster; and `npm test` passes, including the new tests.

---

## Catalog expansion (between Tasks 6 and 7) — Global bands, smarter fetching

- [x] **Goal:** A rich global spectrum of rock & metal countries, scenes, and styles, without hitting Apple's rate limit.
- **Files:** `src/types/track.ts`, `src/types/riff.ts`, `src/utils/artistMetadata.ts`, `src/utils/riffTabs.ts`, `src/utils/trackUtils.ts`, `src/utils/setlistUtils.ts`, `src/utils/catalogCache.ts` (+ test), `src/api/itunes.ts` (+ test), `src/App.tsx`, `src/utils/trackUtils.test.ts`
- **Steps:**
  1. Add ~60 international bands (Israel, Sweden, Finland, Norway, Denmark, Iceland, France, Germany, Ukraine, Poland, the Netherlands, Switzerland, Greece, Brazil, Japan, Canada) with their styles and Apple artist ids, plus 10 new countries and 14 new styles (with riff families for black metal and doom).
  2. Track `artistId`. Enrichment matches by id first, then by accent-insensitive name, and rejects off-genre namesakes. Curated bands are always kept, even under "World"/"Electronic" genres.
  3. `fetchCatalog`: 3 searches + 1 multi-artist Lookup request, a 15 s timeout, partial-failure tolerance, memory + `sessionStorage` cache, shared in-flight batch (StrictMode fires once), and Retry bypassing the cache.
- **Done when:** the live catalog shows 15+ countries (incl. Israel, Sweden, Finland, Norway) and 12+ styles in the `FilterBar`, with one network batch per session; and `npm test`, `npm run build`, and `npm run lint` pass.

---

## UX fixes (between Tasks 6 and 7) — Remembered filters, persistent audio, faster loading

- [x] **Goal:** Fix 3 issues found while testing in the browser.
- **Files:** `src/App.tsx`, `src/pages/CatalogPage.tsx`, `src/components/FilterBar.tsx`, `src/audio/playerEngine.ts`, `src/hooks/usePlayer.ts` (replaces `useAmpConsole.ts`), `src/components/AudioPreviewPlayer.tsx`, `src/components/MiniPlayer.tsx`, `src/pages/TrackDetailPage.tsx`, `src/api/itunes.ts`, `src/utils/catalogCache.ts`, `src/utils/audioUtils.ts`, `src/App.css` (+ tests)
- **Steps:**
  1. Lift `TrackFilters` (incl. sort) from `CatalogPage` into `App`, so filters survive navigation.
  2. Move playback into a module-level player engine (one `<audio>` + Web Audio graph, `useSyncExternalStore`). The Amp Console becomes a view onto it, and a `MiniPlayer` outside `<Routes>` keeps it controllable on other routes.
  3. Progressive catalog rendering (`onProgress` after each request, `mergeCatalogTracks`), a 6 h `localStorage` cache read synchronously on the first render, and lookups split into 4 × ~16 ids (uncached: ~2 s instead of 5–12 s).
- **Done when:** filters survive `/tracks/:id`, `/setlist`, `/arena`, and Back; a preview keeps playing across routes with the mini-bar, and returning to its page continues it; a new tab shows the cached catalog instantly with no requests; and `npm test`, `npm run build`, and `npm run lint` pass.

---

## Task 7 — Riff Arena: Blind-Test Challenge and Head-to-Head

- [x] **Goal:** Add the interactive guessing game and track comparison.
- **Files:** `src/pages/ArenaPage.tsx`, `src/components/BlindTestGame.tsx`, `src/components/HeadToHead.tsx`, `src/components/TrackSelect.tsx`, `src/utils/arenaUtils.ts`, `src/audio/playerEngine.ts`, `src/types/track.ts`, `src/App.tsx`, `src/App.css`, `src/utils/trackUtils.test.ts`
- **Steps:**
  1. Add the `BlindTestRound`, `BlindTestScore`, and `ComparisonRow` types, and `arenaUtils.ts`: `shuffle` / `pickRandomTrack` (injectable RNG), `buildBlindTestRound` (realistic decoys, recent-answer exclusion), `getArtworkBlur`, `getGuessPoints` (speed scoring), `applyGuess`, best-streak `localStorage` helpers, and `compareTracks`, plus unit tests.
  2. Add **concealed** playback to the player engine so Blind-Test rounds don't appear in the Now Playing bar.
  3. Build `BlindTestGame` (signature ④): a concealed preview through `playerEngine`, artwork unblurring from 24px to 0px with the playback time, 4 option buttons (green/red feedback and a reveal), speed-based points, streak and persisted best streak, "Next Riff", and stopping on leave.
  4. Build `HeadToHead` with two searchable `TrackSelect`s, contender cards (preview + setlist toggle), and a comparison table highlighting the longer track and the earlier release, plus tuning and tempo from the riff tab.
  4. Handle the loading and error states (and a catalog with fewer than 4 distinct artists) with `StatusMessage`.
- **Done when:** a round plays a hidden preview with progressively sharper artwork; answering shows green/red feedback and updates the score, streak, and saved best streak; leaving the arena stops the round; picking any two tracks updates the comparison immediately with correct highlights; and `npm test`, `npm run build`, and `npm run lint` pass.

---

## Blind-Test set loop (between Tasks 7 and 8) — 5 rounds, 3 lives, Final Scoreboard

- [x] **Goal:** Give the Riff Blind-Test a clear ending instead of endless rounds.
- **Files:** `src/types/track.ts`, `src/utils/arenaUtils.ts`, `src/audio/playerEngine.ts` (`onTrackEnded`), `src/components/BlindTestGame.tsx`, `src/pages/ArenaPage.tsx`, `src/App.css`, `src/index.css`, `src/utils/trackUtils.test.ts`
- **Steps:**
  1. Replace the endless score model with `RoundResult[]` plus pure helpers: `summarizeSet`, `getSetStatus` (game-over evaluation), `getRankTitle`, and the all-time records helpers (`load` / `save` / `mergeArenaRecords`), with unit tests.
  2. Make timeouts count: the player engine emits `onTrackEnded`, and an unanswered round whose concealed preview ends costs a life.
  3. Show "Round X of 5" and the amp-tube lives; on the set's final result show "See Final Results", which stops the audio and opens the Final Scoreboard (banner, rank, score out of 5,000, accuracy, best streak, all-time records, recap with setlist buttons, and "Play New Set").
- **Done when:** a 5-round set ends in "Set Complete!" and losing 3 lives ends in "Game Over — Amp Blown!" (both checked in headless Chrome, including a real timeout); records persist; and `npm test`, `npm run build`, and `npm run lint` pass.

---

## Task 8 — Dark Rock/Metal theme and responsive design

- [x] **Goal:** Make it look like a metal album cover, on every screen size.
- **Files:** `src/index.css`, `src/App.css` (plain CSS only, no UI libraries)
- **Steps:**
  1. Define theme tokens as CSS custom properties: near-black backgrounds, steel greys, a blood-red / amber accent, and a heavy display font for headings (Google Fonts or a system fallback).
  2. Style the Navbar (sticky; active-link accent), the card grid (`auto-fill, minmax(...)` with hover lift), the FilterBar and mood pills, the detail layout (artwork beside info on desktop, stacked on mobile), the Amp Console panel, the three poster themes, the blind-test and Head-to-Head views, and the status messages.
  3. Add breakpoints for narrow screens (about 375px): a single column, a wrapping Navbar, full-width controls, and no horizontal scroll.
  4. Accessibility polish: `:focus-visible` outlines, sufficient contrast, and `prefers-reduced-motion`.
- **Done when:** every page uses the consistent dark theme; every route (`/`, `/tracks/:id`, `/setlist` in all 3 themes, `/arena` mid-round and on the Final Scoreboard, and the 404) works at 375px, 768px, and 1280px in headless Chrome with `scrollWidth <= clientWidth` and no element outside the viewport; the mini-player never covers content; no UI library is in `package.json`; and `npm test`, `npm run build`, and `npm run lint` pass.

---

## Task 9 — Final polish, README, and verification

- [x] **Goal:** Ship-ready project.
- **Files:** `README.md`, `public/favicon.svg`, `PRD.md`, `docs/architecture.md`, `tasks.md`; removed `src/assets/*` and `public/icons.svg`
- **Steps:**
  1. Rewrite `README.md`:
     - overview and routes, signature features, and tech stack;
     - how to run (`npm install`, `npm run dev`, `npm run build`, `npm run preview`) and test (`npm test`, `npm run test:ui`);
     - the API and data architecture (Search + Lookup endpoints, progressive loading, the `localStorage` cache, enrichment);
     - the project structure, and links to `PRD.md`, `tasks.md`, `docs/architecture.md`, and `PROMPTS.md`.
  2. Remove leftover Vite template assets (`src/assets/hero.png`, `react.svg`, `vite.svg`, `public/icons.svg`) and replace the Vite favicon with a guitar-pick icon. Make sure there is no `any`, `console.*`, or `debugger` in `src`.
  3. Align `PRD.md` and `docs/architecture.md` with the shipped code (curated artist count, fixture size, request plan, UI labels "Retry" and "Clear Lineup", the test count, and documentation links).
  4. Audit: `npm run build`, `npm run lint --max-warnings 0`, and `npm test`. Then walk every route and the main flows in headless Chrome (dev server with StrictMode, and the production build), recording console messages, exceptions, browser log entries, and failed requests.
- **Done when:** build, lint, and the 114 tests pass with zero errors or warnings; there is no `any`; both browser runs report zero console, browser, or network issues across `/`, `/tracks/:id`, `/setlist`, `/arena`, the 404 page, and an unknown track id; and the README lets a new developer run the app and its tests from scratch.

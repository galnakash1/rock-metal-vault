# Rock & Metal Vault — Build Plan

> Requirements: [PRD.md](PRD.md) · Design: [docs/architecture.md](docs/architecture.md)

**Rules (see [AGENTS.md](AGENTS.md)):** one task at a time, in order. At the end of each task, stop and explain what changed in 3 sentences. The developer reviews and runs `git commit`; the agent never commits.

**Signature features (exactly four, nothing extra):** ① Sonic Mood Capsules (Task 4 helper, Task 5 UI) · ② Amp Console Player (Task 5) · ③ Festival Poster Builder (Task 6) · ④ Riff Blind-Test Challenge (Task 7).

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

- [ ] **Goal:** Turn the single view into a multi-page SPA.
- **Files:** `package.json`, `src/App.tsx`, `src/components/Navbar.tsx`, `src/pages/CatalogPage.tsx`, `src/pages/TrackDetailPage.tsx`, `src/pages/SetlistPage.tsx`, `src/pages/ArenaPage.tsx`, `src/pages/NotFoundPage.tsx`, `src/App.css`
- **Steps:**
  1. Run `npm install react-router-dom`.
  2. In `App.tsx`, wrap the layout in `<BrowserRouter>` and define `<Routes>` for `/`, `/tracks/:id`, `/setlist`, `/arena`, and `*`.
  3. Build `Navbar` with `NavLink`s (Vault Catalog `/`, Festival Poster `/setlist`, Riff Arena `/arena`) that highlight the active route, plus a setlist count badge (0 until `useSetlist` arrives in Task 6).
  4. Move the static list into `CatalogPage` (`.map()` with `key={track.id}`), with each item linking to `/tracks/${track.id}` via `Link`.
  5. Make `TrackDetailPage` read `id` with `useParams` and receive `tracks` via props. It shows 600×600 artwork, title, artist, album, release year, `mm:ss` duration, genre, and an explicit badge, plus a basic `<audio controls>` placeholder for the Task 5 Amp Console. Unknown ids show a "Track not found" message.
  6. Add shell pages for the Festival Poster (`/setlist`) and Riff Arena (`/arena`), and a real 404 page.
- **Done when:** clicking a track opens `/tracks/:id` with its correct details; the Navbar links switch pages without a full reload and highlight the active link; `/tracks/999` shows "Track not found"; an unknown URL shows the 404 page; and `npm run build` and `npm run lint` pass.

---

## Task 3 — Real data from the iTunes API with Loading / Error / Data states

- [ ] **Goal:** Replace the mock data with live data, handling every async state.
- **Files:** `src/api/itunes.ts`, `src/hooks/useTracks.ts`, `src/components/StatusMessage.tsx`, `src/App.tsx`, the pages
- **Steps:**
  1. In `src/api/itunes.ts`, write `fetchCatalog(signal)`. It fetches `rock`, `metal`, and `metalcore` (`media=music&entity=song&limit=50`) in parallel, checks `response.ok`, then normalizes and de-duplicates the results by `trackId`.
  2. Write the `useTracks()` hook: `fetch` inside `useEffect`, with an `AbortController` cleanup, returning `{ status, tracks, error, retry }`.
  3. Build the reusable `StatusMessage` component (`loading` / `error` with an optional retry / `empty`).
  4. Call `useTracks()` once in `App`, and pass the results down as props to Catalog, Detail, and Arena.
  5. Keep `mockTracks.json` as the test fixture only; the UI no longer imports it.
- **Done when:** the catalog shows a loading message, then the real iTunes tracks with no duplicate-key warnings in the console; with the network turned off (DevTools → Offline), a friendly error with a working "Try again" button appears; and the detail page works for live track ids.

---

## Task 4 — Vitest setup, Mood Capsule helper, and unit tests

- [ ] **Goal:** Prove the core logic works, with automated tests.
- **Files:** `package.json`, `vite.config.ts` (or `vitest.config.ts`), `src/types/track.ts`, `src/utils/trackUtils.ts`, `src/utils/trackUtils.test.ts`
- **Steps:**
  1. Run `npm install -D vitest @vitest/ui`.
  2. Add the scripts `"test": "vitest run"` and `"test:ui": "vitest --ui"`.
  3. Add the `MoodId` / `MoodCapsule` types and `MOOD_CAPSULES`, `matchesMood`, and `filterByMood` to `trackUtils.ts` (signature ①, logic only).
  4. Write **at least 6** tests in `src/utils/trackUtils.test.ts`, using `mockTracks.json` as the fixture. They should cover real logic:
     - `formatDuration`: `245000 → "04:05"`, zero-padding, ≥ 1 hour, invalid input → `"00:00"`
     - `upgradeArtworkUrl`: `100x100bb` → `600x600bb`; non-matching URLs are left unchanged
     - `filterTracks`: case-insensitive search across title/artist/album, genre filter, and the combined (AND) behavior
     - `sortTracks`: duration and year ordering, and the original array is not mutated
     - `getTotalDuration`: the setlist total, and `0` for an empty list
     - `normalizeTracks`: drops entries without a `previewUrl` and de-duplicates by `trackId`
     - `filterByMood`: each of the 4 moods, including boundaries (exactly 5:00, exactly 3:30, 1969/1970/1989/1990, 2010 non-metal) and `null` = no filter
- **Done when:** `npm test` runs at least 6 passing tests with zero failures (including the mood tests), and `npm run test:ui` opens the Vitest UI.

---

## Task 5 — Catalog components, Mood Capsules UI, and the Amp Console

- [ ] **Goal:** Make the catalog interactive and give the detail page its signature player.
- **Files:** `src/components/TrackCard.tsx`, `src/components/FilterBar.tsx`, `src/components/MoodCapsules.tsx`, `src/components/AudioPreviewPlayer.tsx`, `src/hooks/useAmpConsole.ts`, `src/types/audio.ts`, `src/utils/audioUtils.ts` (+ tests), `src/pages/CatalogPage.tsx`, `src/pages/TrackDetailPage.tsx`
- **Steps:**
  1. Build `TrackCard`: artwork, title, artist, album, duration, and an explicit badge. It links to the detail page.
  2. Build `FilterBar`: a controlled search input, genre select, artist select, sort select, and a results count. Every control has a `<label>`.
  3. Build `MoodCapsules` (signature ①): 4 toggle pills with `aria-pressed`; clicking the active pill clears it.
  4. In `CatalogPage`, keep `filters` and `mood` in `useState`, and derive the visible list with `useMemo(sortTracks(filterByMood(filterTracks(...), mood), sort))`. Show an `empty` `StatusMessage` when nothing matches.
  5. Add `EQ_PRESETS` and `bucketFrequencies` to `audioUtils.ts`, with tests.
  6. Write the `useAmpConsole` hook. It creates the `AudioContext` lazily on the first play, then wires the source → lowshelf/peaking/highshelf filters → analyser → destination. Preset changes use `setTargetAtTime`, and the hook cleans up the animation frame and context on unmount.
  7. Build `AudioPreviewPlayer` as the Amp Console (signature ②): `<audio crossOrigin="anonymous">`, play/pause and progress controls, a `<canvas>` frequency-bar visualizer, and 4 EQ preset buttons (`Flat`, `Metalcore Scoop`, `Classic Tube Amp`, `Bass Drop`). It replaces the placeholder player on `TrackDetailPage`.
- **Done when:** typing in the search box filters the cards live; the genre and artist filters, the mood pills, and every sort option work together; the results count updates; "no matches" shows the empty state; the detail page plays the preview with moving frequency bars; switching EQ presets mid-play changes the sound without restarting it; and `npm test` passes.

---

## Task 6 — Setlist with `localStorage` and the Festival Poster Builder

- [ ] **Goal:** Let users build a persistent setlist and turn it into a festival poster.
- **Files:** `src/hooks/useSetlist.ts`, `src/components/SetlistButton.tsx`, `src/components/FestivalPoster.tsx`, `src/pages/SetlistPage.tsx`, `src/components/TrackCard.tsx`, `src/pages/TrackDetailPage.tsx`, `src/App.tsx`, `src/types/track.ts`, `src/utils/trackUtils.ts` (+ tests)
- **Steps:**
  1. Add `parseStoredSetlist`, `toggleTrackInList`, and `buildFestivalLineup` (plus the `LineupAct`, `FestivalLineup`, and `PosterTheme` types) to `trackUtils.ts`, with unit tests.
  2. Write the `useSetlist()` hook: lazy init from `localStorage` (`rmv:setlist`), sync back in `useEffect`, and expose `isInSetlist`, `toggleTrack`, `removeTrack`, and `clearSetlist`. Call it in `App` and feed the real count to the `Navbar` badge.
  3. Build `SetlistButton` (Add / Remove toggle with `aria-pressed`), and use it on `TrackCard` and `TrackDetailPage`. The detail page also falls back to the setlist when an id isn't in the catalog.
  4. Build `FestivalPoster` (signature ③): Headliners in large type, Underbill below, total festival runtime, and act and track counts, themed via `data-theme`.
  5. Build `SetlistPage`: a poster theme switcher (`Hellfire` / `Frostbite` / `Toxic Waste`), the poster, a compact manage list with Remove buttons, a "Clear setlist" button with confirmation, and an empty state.
- **Done when:** adding and removing from cards and the detail page updates the button and the Navbar badge immediately; the poster shows the correct Headliner/Underbill split and runtime; switching themes restyles the poster instantly; the lineup survives a page reload; Remove and Clear update the poster; and `npm test` passes, including the new tests.

---

## Task 7 — Riff Arena: Blind-Test Challenge and Head-to-Head

- [ ] **Goal:** Add the interactive guessing game and track comparison.
- **Files:** `src/pages/ArenaPage.tsx`, `src/components/BlindTestGame.tsx`, `src/components/TrackSelect.tsx`, `src/types/track.ts`, `src/utils/trackUtils.ts` (+ tests)
- **Steps:**
  1. Add the `BlindTestRound`, `BlindTestScore`, and `ComparisonRow` types. Add `pickRandomTrack`, `shuffle`, `buildBlindTestRound` (injectable RNG), `getArtworkBlur`, `applyGuess`, and `compareTracks`, plus unit tests.
  2. Build `BlindTestGame` (signature ④): "Start round" plays a random preview; the artwork unblurs as the preview plays (`timeupdate` → `getArtworkBlur`); 4 option buttons (green when correct, red when wrong, then a full reveal); score, streak, and best-streak display; and a "Next round" button. The audio stops on unmount.
  3. Head-to-Head: two `TrackSelect`s (default to the first two tracks) and a side-by-side table showing duration, release year, explicit rating, and album track count, with the winner highlighted in each numeric row.
  4. Handle the loading and error states (and a catalog with fewer than 4 distinct artists) with `StatusMessage`.
- **Done when:** a round plays a preview with progressively sharper artwork; answering updates the score and streak correctly; picking any two tracks updates the comparison immediately with correct highlights; and `npm test` passes, including the new tests.

---

## Task 8 — Dark Rock/Metal theme and responsive design

- [ ] **Goal:** Make it look like a metal album cover, on every screen size.
- **Files:** `src/index.css`, `src/App.css` (plain CSS only, no UI libraries)
- **Steps:**
  1. Define theme tokens as CSS custom properties: near-black backgrounds, steel greys, a blood-red / amber accent, and a heavy display font for headings (Google Fonts or a system fallback).
  2. Style the Navbar (sticky; active-link accent), the card grid (`auto-fill, minmax(...)` with hover lift), the FilterBar and mood pills, the detail layout (artwork beside info on desktop, stacked on mobile), the Amp Console panel, the three poster themes, the blind-test and Head-to-Head views, and the status messages.
  3. Add breakpoints for narrow screens (about 375px): a single column, a wrapping Navbar, full-width controls, and no horizontal scroll.
  4. Accessibility polish: `:focus-visible` outlines, sufficient contrast, and `prefers-reduced-motion`.
- **Done when:** every page uses the consistent dark theme; the layout works at 375px, 768px, and 1440px wide (checked in DevTools) with no horizontal scrolling; and no UI library is in `package.json`.

---

## Task 9 — Final polish, README, and verification

- [ ] **Goal:** Ship-ready project.
- **Files:** `README.md`, plus any small fixes
- **Steps:**
  1. Rewrite `README.md`: what the app does, the four signature features, the pages, the tech stack, how to install and run it (`npm install`, `npm run dev`), how to test (`npm test`, `npm run test:ui`), the API used (the iTunes Search API endpoint and its fields), the project structure, and links to `PRD.md`, `docs/architecture.md`, and `tasks.md`.
  2. Remove leftover Vite template assets and unused code; make sure there is no `any` and no `console.log`.
  3. Walk through every acceptance criterion in `PRD.md` by hand.
  4. Run `npm run lint`, `npm test`, and `npm run build`.
- **Done when:** `npm run build` and `npm test` both finish with zero errors (and `npm run lint` is clean); every PRD acceptance criterion is verified; and the README lets a new developer run the app and its tests from scratch.

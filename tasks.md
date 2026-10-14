# Rock & Metal Vault — Build Plan

> Requirements: [PRD.md](PRD.md) · Design: [docs/architecture.md](docs/architecture.md)

**Rules (see [AGENTS.md](AGENTS.md)):** one task at a time, in order. At the end of each task, stop and explain what changed in 3 sentences. The developer reviews and runs `git commit`; the agent never commits.

---

## Task 1 — Types, mock data, utilities, and a static list

- [ ] **Goal:** Lay the typed data foundation and render something real on screen.
- **Files:** `src/types/track.ts`, `src/data/mockTracks.json`, `src/utils/trackUtils.ts`, `src/App.tsx` (and clean up the Vite template in `App.css` / `index.css`)
- **Steps:**
  1. In `src/types/track.ts`, define `ITunesTrackRaw`, `ITunesSearchResponse`, `Track`, `TrackFilters`, `SortKey`, and `FetchStatus`, as described in the architecture doc.
  2. Create `src/data/mockTracks.json` with **8 rock/metal tracks** in the raw iTunes response shape (`{ resultCount, results: [...] }`).
  3. In `src/utils/trackUtils.ts`, implement `formatDuration`, `upgradeArtworkUrl`, `getReleaseYear`, `normalizeTrack`, `normalizeTracks`, `filterTracks`, `sortTracks`, `getTotalDuration`, `getUniqueGenres`, and `getUniqueArtists`.
  4. In `App.tsx`, import the mock JSON, normalize it, and render a simple static list (artwork, title, artist, `mm:ss` duration).
- **Done when:** `npm run dev` shows the 8 mock tracks with formatted `mm:ss` durations, and `npm run build` passes with zero TypeScript errors and no `any`.

---

## Task 2 — Routing, Navbar, and the detail page

- [ ] **Goal:** Turn the single view into a multi-page SPA.
- **Files:** `package.json`, `src/main.tsx`, `src/App.tsx`, `src/components/Navbar.tsx`, `src/pages/CatalogPage.tsx`, `src/pages/TrackDetailsPage.tsx`, `src/pages/SetlistPage.tsx`, `src/pages/ArenaPage.tsx`, `src/pages/NotFoundPage.tsx`
- **Steps:**
  1. Run `npm install react-router-dom`.
  2. Wrap `<App>` in `<BrowserRouter>` in `main.tsx`.
  3. In `App.tsx`, define `<Routes>` for `/`, `/tracks/:id`, `/setlist`, `/arena`, and `*`.
  4. Build `Navbar` with `NavLink`s that highlight the active route.
  5. Move the static list into `CatalogPage`, and make each item link to `/tracks/:id`.
  6. Make `TrackDetailsPage` read `id` with `useParams`, find the track, and show 600×600 artwork, artist, album, release year, `mm:ss` duration, and genre. Show a "Track not found" message for unknown ids.
  7. Add placeholder pages for Setlist and Arena, and a real 404 page.
- **Done when:** clicking a track opens `/tracks/:id` with its correct details; the Navbar links switch pages without a full reload and highlight the active link; `/tracks/999` shows "Track not found"; and an unknown URL shows the 404 page.

---

## Task 3 — Real data from the iTunes API with Loading / Error / Data states

- [ ] **Goal:** Replace the mock data with live data, handling every async state.
- **Files:** `src/api/itunes.ts`, `src/hooks/useTracks.ts`, `src/components/StatusMessage.tsx`, `src/App.tsx`, the pages
- **Steps:**
  1. In `src/api/itunes.ts`, write `fetchCatalog(signal)`. It fetches `rock`, `metal`, and `metalcore` (`media=music&entity=song&limit=50`) in parallel, checks `response.ok`, then normalizes and de-duplicates the results.
  2. Write the `useTracks()` hook: `fetch` inside `useEffect`, with an `AbortController` cleanup, returning `{ status, tracks, error, retry }`.
  3. Build the reusable `StatusMessage` component (`loading` / `error` with an optional retry / `empty`).
  4. Call `useTracks()` once in `App`, and pass the results down as props to Catalog, Details, and Arena.
  5. Keep `mockTracks.json` as the test fixture only; the UI no longer imports it.
- **Done when:** the catalog shows a loading message, then the real iTunes tracks; with the network turned off (DevTools → Offline), a friendly error with a working "Try again" button appears; and the detail page works for live track ids.

---

## Task 4 — Vitest setup and unit tests

- [ ] **Goal:** Prove the core logic works, with automated tests.
- **Files:** `package.json`, `vite.config.ts` (or `vitest.config.ts`), `src/utils/trackUtils.test.ts`
- **Steps:**
  1. Run `npm install -D vitest @vitest/ui`.
  2. Add the scripts `"test": "vitest run"` and `"test:ui": "vitest --ui"`.
  3. Write **at least 6** tests in `src/utils/trackUtils.test.ts`, using `mockTracks.json` as the fixture. They should cover real logic:
     - `formatDuration`: `245000 → "04:05"`, zero-padding, ≥ 1 hour, invalid input → `"00:00"`
     - `upgradeArtworkUrl`: `100x100bb` → `600x600bb`; non-matching URLs are left unchanged
     - `filterTracks`: case-insensitive search across title/artist/album, genre filter, and the combined (AND) behavior
     - `sortTracks`: duration and year ordering, and the original array is not mutated
     - `getTotalDuration`: the setlist total, and `0` for an empty list
     - `normalizeTracks`: drops entries without a `previewUrl` and de-duplicates by id
- **Done when:** `npm test` runs at least 6 passing tests with zero failures, and `npm run test:ui` opens the Vitest UI.

---

## Task 5 — Reusable components and live search / filter / sort

- [ ] **Goal:** Make the catalog interactive and componentized.
- **Files:** `src/components/TrackCard.tsx`, `src/components/FilterBar.tsx`, `src/components/AudioPreviewPlayer.tsx`, `src/pages/CatalogPage.tsx`, `src/pages/TrackDetailsPage.tsx`
- **Steps:**
  1. Build `TrackCard`: artwork, title, artist, album, duration, and an explicit badge. It links to the detail page.
  2. Build `FilterBar`: a controlled search input, genre select, artist select, sort select, and a results count. Every control has a `<label>`.
  3. Build `AudioPreviewPlayer`: an HTML5 `<audio controls preload="none">` for the `previewUrl`, with a fallback when the URL is missing. Use it on the detail page.
  4. In `CatalogPage`, keep `filters` in `useState` and derive the visible list with `useMemo(sortTracks(filterTracks(...)))`.
  5. Show an `empty` `StatusMessage` when nothing matches.
- **Done when:** typing in the search box filters the cards live; the genre and artist filters and every sort option work together; the results count updates; "no matches" shows the empty state; and the detail page plays the 30-second preview.

---

## Task 6 — Setlist (Favorites) page with `localStorage`

- [ ] **Goal:** Let users build a persistent concert setlist.
- **Files:** `src/hooks/useSetlist.ts`, `src/components/SetlistButton.tsx`, `src/pages/SetlistPage.tsx`, `src/components/TrackCard.tsx`, `src/pages/TrackDetailsPage.tsx`, `src/components/Navbar.tsx`, `src/utils/trackUtils.ts` (+ tests)
- **Steps:**
  1. Add `parseStoredSetlist` and `toggleTrackInList` to `trackUtils.ts`, with unit tests.
  2. Write the `useSetlist()` hook: lazy init from `localStorage` (`rmv:setlist`), sync back in `useEffect`, and expose `isInSetlist`, `toggleTrack`, `removeTrack`, and `clearSetlist`.
  3. Build `SetlistButton` (Add / Remove toggle with `aria-pressed`), and use it on `TrackCard` and `TrackDetailsPage`.
  4. Build `SetlistPage`: rows with a preview, a details link, and a Remove button; a summary showing the track count and total duration (`formatDuration(getTotalDuration(...))`); a "Clear setlist" button with confirmation; and an empty state.
  5. Show the setlist count badge in `Navbar`.
- **Done when:** adding and removing from cards and the detail page updates the button and the Navbar badge immediately; the setlist survives a page reload; Remove and Clear update the totals; and `npm test` still passes, including the new tests.

---

## Task 7 — Arena: Head-to-Head, stats dashboard, and random track

- [ ] **Goal:** Add the interactive comparison and stats page.
- **Files:** `src/pages/ArenaPage.tsx`, `src/components/TrackSelect.tsx`, `src/components/StatCard.tsx`, `src/utils/trackUtils.ts` (+ tests), `src/types/track.ts`
- **Steps:**
  1. Add the `ComparisonRow` and `CatalogStats` types. Add `compareTracks`, `getCatalogStats`, and `pickRandomTrack` (with an injectable RNG), plus unit tests.
  2. Head-to-Head: two `TrackSelect`s (default to the first two tracks) and a side-by-side table showing duration, release year, explicit rating, and album track count, with the winner highlighted in each numeric row.
  3. Stats dashboard: a grid of `StatCard`s showing total tracks, unique artists, average duration, longest and shortest track, oldest and newest year, explicit %, and a genre breakdown.
  4. Random track: a "Roll a random track" button that shows a `TrackCard` with a link to its details.
  5. Handle the loading and error states with `StatusMessage`.
- **Done when:** picking any two tracks updates the comparison immediately with correct highlights; the stats match the loaded catalog; every roll shows a random track whose link opens its detail page; and `npm test` passes, including the new tests.

---

## Task 8 — Dark Rock/Metal theme and responsive design

- [ ] **Goal:** Make it look like a metal album cover, on every screen size.
- **Files:** `src/index.css`, `src/App.css` (plain CSS only, no UI libraries)
- **Steps:**
  1. Define theme tokens as CSS custom properties: near-black backgrounds, steel greys, a blood-red / amber accent, and a heavy display font for headings (Google Fonts or a system fallback).
  2. Style the Navbar (sticky; active-link accent), the card grid (`auto-fill, minmax(...)` with hover lift), the FilterBar, the detail layout (artwork beside info on desktop, stacked on mobile), the setlist rows, the Arena table and stat tiles, and the status messages.
  3. Add breakpoints for narrow screens (about 375px): a single column, a wrapping Navbar, full-width controls, and no horizontal scroll.
  4. Accessibility polish: `:focus-visible` outlines, sufficient contrast, and `prefers-reduced-motion`.
- **Done when:** every page uses the consistent dark theme; the layout works at 375px, 768px, and 1440px wide (checked in DevTools) with no horizontal scrolling; and no UI library is in `package.json`.

---

## Task 9 — Final polish, README, and verification

- [ ] **Goal:** Ship-ready project.
- **Files:** `README.md`, plus any small fixes
- **Steps:**
  1. Rewrite `README.md`: what the app does, its features and pages, the tech stack, how to install and run it (`npm install`, `npm run dev`), how to test (`npm test`, `npm run test:ui`), the API used (the iTunes Search API endpoint and its fields), the project structure, and links to `PRD.md`, `docs/architecture.md`, and `tasks.md`.
  2. Remove leftover Vite template assets and unused code; make sure there is no `any` and no `console.log`.
  3. Walk through every acceptance criterion in `PRD.md` by hand.
  4. Run `npm run lint`, `npm test`, and `npm run build`.
- **Done when:** `npm run build` and `npm test` both finish with zero errors (and `npm run lint` is clean); every PRD acceptance criterion is verified; and the README lets a new developer run the app and its tests from scratch.

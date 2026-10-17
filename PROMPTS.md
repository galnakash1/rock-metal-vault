# יומן פרומפטים

## 2026-10-14

**17:01 · claude**

> Please read CLAUDE.md and AGENTS.md in the root directory to understand our project workflow and constraints. Confirm that you understand the rules (specifically working one task at a time and not running git commit yourself). Do not modify or create any files yet.

**17:11 · claude**

> <pasted_content id="5dbb">
> We are building "Rock & Metal Vault", a front-end React + Vite + TypeScript master-detail web application exploring Rock, Metal, and Metalcore tracks using the public, keyless Apple iTunes Search API (e.g., `https://itunes.apple.com/search?term=metalcore&media=music&entity=song&limit=60`).
> 
> Before writing any application code, please create our three foundational planning documents:
> 
> 1. `PRD.md`:
>    - Purpose & Target Audience: For rock and metal fans who want to discover tracks, preview 30-second audio riffs, build a personal concert setlist, and compare tracks head-to-head.
>    - Pages (4 main routes + 404 fallback):
>      a) `/` (Vault Catalog - Master List): Displays track cards with search input, genre/artist filter, and sorting.
>      b) `/tracks/:id` (Track Details - Detail View): Reads `id` via `useParams`, displays high-res album artwork (upgraded from 100x100 to 600x600), artist, album, release year, formatted duration (`mm:ss`), genre, and an HTML5 audio player for the 30-second `previewUrl`.
>      c) `/setlist` (Personal Setlist / Favorites): Interactive page where users view and manage their saved tracks (persisted in `localStorage`), see total setlist duration and track count, and clear or remove items.
>      d) `/arena` (Head-to-Head Track Arena & Stats): Interactive page allowing users to select any two tracks from the catalog to compare their attributes side-by-side (duration, release year, explicit rating, album track count), view catalog statistics, and roll a random track.
>      e) `*` (404 Not Found page).
>    - Include at least 6 clear acceptance criteria using the exact "When I..., I see..." format.
>    - Link to `docs/architecture.md`.
> 
> 2. `docs/architecture.md`:
>    - Document our component hierarchy (Pages vs. at least 5 reusable Components in separate files: `Navbar`, `TrackCard`, `FilterBar`, `AudioPreviewPlayer`, `StatusMessage`), TypeScript interfaces (`Track`, filter types, props with zero `any`), state management strategy (where state lives and how props flow), and utility functions that will be unit-tested with Vitest.
> 
> 3. `tasks.md`:
>    - Create a 9-task sequential build plan following our course rules. Each task MUST include a clear "Done when:" line:
>      - Task 1: Define TypeScript interfaces (`src/types/track.ts`), mock JSON data (`src/data/mockTracks.json` with 8 rock/metal tracks), data transformation/filter utilities (`src/utils/trackUtils.ts`), and render the initial static list in `App.tsx`.
>      - Task 2: Install `react-router-dom` and set up routing (`/`, `/tracks/:id`, `/setlist`, `/arena`, `*`) with a `Navbar` component using `NavLink` and a working detail page reading `useParams`.
>      - Task 3: Replace mock JSON with real `fetch` inside `useEffect` calling the iTunes Search API, handling all three UI states (Loading, Error, Data) via a reusable `StatusMessage` component.
>      - Task 4: Set up Vitest and `@vitest/ui` (`test` and `test:ui` scripts) and write at least 6 unit tests in `src/utils/trackUtils.test.ts` testing real logic (duration formatting `mm:ss`, artwork URL upgrading to 600x600, search/genre filtering, sorting, and setlist total duration calculation).
>      - Task 5: Build reusable components (`TrackCard`, `FilterBar`, `AudioPreviewPlayer`) and implement live search, subgenre/artist filtering, and sorting on the Catalog page.
>      - Task 6: Implement the `/setlist` (Favorites) page with `localStorage` persistence, add/remove toggle buttons on cards and detail view, and total duration summary.
>      - Task 7: Implement the `/arena` (Head-to-Head comparison, catalog stats dashboard, and random track generator) page.
>      - Task 8: Craft a custom, responsive dark-mode Rock/Metal aesthetic in plain CSS (no heavy UI libraries) that looks great on both desktop and narrow mobile screens.
>      - Task 9: Final polish, write comprehensive project `README.md` (what it does, how to run app & tests, API used), and verify `npm run build` and `npm test` pass with zero errors.
> 
> Create only `PRD.md`, `docs/architecture.md`, and `tasks.md` now, and then stop and summarize in 3 sentences.
> </pasted_content id="5dbb">
Reviewed PRD.md, tasks.md, and docs/architecture.md. Approved combining rock, metal, and metalcore queries and keeping catalog state in App.tsx.

**18:13 · claude**

> <pasted_content id="5dbb">
> Your architectural choices in `docs/architecture.md` (combining rock, metal, and metalcore queries in `App`, storing full `Track` objects in the setlist, and adding `SetlistButton`, `TrackSelect`, and `StatCard`) are approved. One important safeguard: when combining multiple search queries, make sure our normalization/deduplication utility removes duplicate `trackId` entries so React keys are always strictly unique.
> 
> Please proceed with **Task 1** from `tasks.md` ONLY:
> 1. Create the TypeScript interfaces/types (e.g., `Track`, raw iTunes API response types, filter/sort types) with strict typing and zero `any`.
> 2. Create the local mock JSON dataset with 8–10 great Rock, Metal, and Metalcore tracks (include realistic fields matching our `Track` model, such as tracks by bands like Bad Omens, Architects, Metallica, Iron Maiden, Black Sabbath, Bring Me The Horizon, Procol Harum, etc.).
> 3. Create the pure utility functions in `src/utils/` (duration formatting `mm:ss`, artwork URL upgrading from `100x100bb` to `600x600bb`, deduplication by `trackId`, filtering, sorting, and setlist total duration calculation) so they are ready for use and later Vitest testing.
> 4. Update `src/App.tsx` to render the initial static list of tracks from the mock JSON using `.map()` with a unique `key={track.trackId}`, showing basic track details (artwork, title, artist, album, genre, and formatted duration).
> 5. Verify that `npm run build` passes with zero TypeScript or bundler errors.
> 
> Stop after completing Task 1 and explain what changed in 3 sentences.
> </pasted_content id="5dbb">
Checked the app in the browser with npm run dev (all 9 tracks and total duration rendered cleanly with no console errors). Manually updated Procol Harum's primaryGenreName from "Pop" to "Classic Rock" in mockTracks.json and marked Task 1 as done in tasks.md.

## 2026-10-16

**12:40 · claude**

> <pasted_content id="5dbb">
> Task 1 is verified and committed. Before executing Task 2, we want to refine our product vision so the app stands out with 4 focused signature features (and nothing extra beyond these 4 to keep the UI clean and uncluttered):
> 
> 1. **Sonic Mood Capsules (on `/` CatalogPage):** Quick mood filter pills above the track list (`Atmospheric & Epic` for tracks >= 5 mins, `Modern Breakdown` for 2010+ metal/metalcore, `70s–80s Legends` for 1970–1989 classics, and `Quick Riff Blitz` for tracks < 3.5 mins), supported by a pure helper function in `trackUtils.ts` so we can also unit-test it in Task 4.
> 2. **Amp Console Player with Live EQ & Visualizer (on `/tracks/:id` TrackDetailPage):** An HTML5 + Web Audio API preview player featuring a real-time frequency bar visualizer and selectable Rock/Metal EQ presets (`Flat`, `Metalcore Scoop`, `Classic Tube Amp`, `Bass Drop`).
> 3. **Festival Lineup & Poster Builder (on `/setlist` SetlistPage):** Turns the user's saved `localStorage` tracks into a stylized rock/metal festival poster (automatically grouping selections into Headliners and Underbill tiers, showing total festival runtime, and allowing poster theme switching).
> 4. **Riff Blind-Test Challenge (on `/arena` ArenaPage):** An interactive audio guessing game where a random track's 30s preview plays with blurred album artwork that progressively unblurs, 4 multiple-choice buttons, score/streak tracking, plus head-to-head track comparison.
> 
> Please do the following now:
> 1. Briefly update `PRD.md`, `docs/architecture.md`, and `tasks.md` to reflect these exact 4 signature features (and mark Task 1 as completed in `tasks.md`).
> 2. Execute **Task 2** from `tasks.md` ONLY:
>    - Install `react-router-dom`.
>    - Create `src/components/Navbar.tsx` using `NavLink` to navigate between `/` (Vault Catalog), `/setlist` (Festival Poster), and `/arena` (Riff Arena), displaying the current setlist count badge.
>    - Set up `BrowserRouter` and `Routes` in `App.tsx` for `/`, `/tracks/:id`, `/setlist`, `/arena`, and `*` (`NotFoundPage`).
>    - Build `CatalogPage.tsx` (rendering the list with `.map()` and `key={track.id}`, where each item links to `/tracks/${track.id}` via `Link`) and `TrackDetailPage.tsx` (reading `:id` with `useParams()`, receiving tracks via props, rendering full track metadata, upgraded 600x600 artwork, and a clean placeholder/basic audio preview ready for the Task 5 Amp Console, plus handling unknown track IDs gracefully).
>    - Create clean initial shell pages for `SetlistPage.tsx`, `ArenaPage.tsx`, and `NotFoundPage.tsx`.
> 3. Ensure zero `any` types and verify `npm run build` and `npm run lint` pass with zero errors.
> 
> Stop after completing Task 2 and explain what changed in 3 sentences.
> </pasted_content id="5dbb">
Tested all routes in the browser (/, /tracks/:id, /setlist, /arena, and invalid URLs for 404/unknown track ID). Confirmed audio preview plays on the detail page and marked Task 2 as done in tasks.md.
## 2026-10-17

**10:42 · claude**

> <pasted_content id="5dbb">
> Your decisions from Task 2 are all approved (keeping catalog search, genre/artist filters, and sorting is essential, and dropping `StatCard`/stats dashboard keeps the Arena focused on the Riff Blind-Test and Head-to-Head comparison). Also, if Task 5 feels large later, we can still execute it cleanly in one well-structured step as written in `tasks.md`.
> 
> Now please proceed with **Task 3** from `tasks.md` ONLY:
> 1. Create the reusable `StatusMessage` component in `src/components/StatusMessage.tsx` to cleanly present Loading, Error (with a functional "Retry" button callback), and Empty states.
> 2. In `App.tsx` (or via a dedicated fetch helper called inside `useEffect` in `App.tsx`), replace the static mock data initialization with live `fetch()` requests inside `useEffect` querying the public Apple iTunes Search API for our rock/metal/metalcore catalog.
> 3. Properly manage the three required screen states (`loading`, `error`, `success` / data ready):
>    - Use `AbortController` cleanup in `useEffect` (or safe state handling) so unmounting/re-fetching never causes console warnings.
>    - Normalize and deduplicate the combined API results using our `trackUtils` functions so every track has a unique `id` and valid fields.
>    - Pass a retry handler so if the network fails, clicking "Retry" in `StatusMessage` re-triggers the fetch.
>    - Keep `src/data/mockTracks.json` in the repo so we can use it as deterministic fixture data for our Vitest unit tests in Task 4.
> 4. Ensure zero `any` types and verify that `npm run build` and `npm run lint` pass with zero errors.
> 
> Stop after completing Task 3 and explain what changed in 3 sentences.
> </pasted_content id="5dbb">
Verified live iTunes API fetch in the browser (129 rock/metal tracks loaded cleanly) and tested loading, empty, and error retry states via StatusMessage. Marked Task 3 as done in tasks.md.
**11:10 · claude**

> <pasted_content id="5dbb">
> Task 3 is verified and committed. Before executing Task 4, we want to enrich our track model and utility layer with 3 music-focused enhancements so we can unit-test their logic now in Task 4 and render them in the UI in Task 5:
> 
> 1. **Band Origin Country & Subgenre Enrichment:**
>    - Since Apple's `country` field only reflects the storefront ("USA") rather than where the band was formed, add a clean metadata enrichment step during track normalization (e.g., via a lookup map of major rock/metal/metalcore artists in `src/utils/` with a deterministic fallback for any unlisted artist) that populates:
>      - `originCountry` (e.g., `"United Kingdom"`, `"United States"`, `"Sweden"`, `"Germany"`, `"Australia"`, `"France"`, `"Canada"`, `"Finland"`) and `originFlag` (matching flag emoji).
>      - `subgenre` / style (e.g., `"Metalcore"`, `"Heavy Metal"`, `"Thrash Metal"`, `"Alternative Metal"`, `"Hard Rock"`, `"Progressive Rock"`, `"Classic Rock"`). Also tighten the genre allowlist if needed so pop-leaning tracks like twenty one pilots don't dilute the rock/metal catalog.
> 2. **Search & Filtering by Country and Style/Subgenre:**
>    - Extend `TrackFilters` and `filterTracks` so users can filter the catalog by **Origin Country**, **Style/Subgenre**, **Artist**, **Sonic Mood Capsule**, and free-text search (matching title, artist, album, subgenre, or origin country). Add helper `getUniqueCountries(tracks)`.
> 3. **Interactive 6-String Guitar Riff Tab Data (for `/tracks/:id` in Task 5):**
>    - Add a `GuitarRiffTab` type and resolver helper (e.g., `getTrackRiffTab(track)`) that returns guitar playing metadata for any track: `tuning` (e.g., `"Drop C (C G C F A D)"`, `"Drop B"`, `"E Standard"`), `bpm`, `difficulty`, and a structured 6-string tab (`e`, `B`, `G`, `D`, `A`, `E` string lines) so guitarists can read and play along with the riff on the Track Detail page alongside the Amp Console.
> 
> Please do the following now for **Task 4**:
> 1. Briefly update `PRD.md`, `docs/architecture.md`, and `tasks.md` to include these 3 enrichments (Band Origin Country, Country/Style filtering, and Guitar Riff Tab panel on `/tracks/:id`), and implement their types and pure utility functions in `src/types/` and `src/utils/` (and update `mockTracks.json` if needed).
> 2. Install `vitest` and `@vitest/ui`, and configure `"test": "vitest run"` and `"test:ui": "vitest --ui"` in `package.json`.
> 3. Create a comprehensive unit test suite in `src/utils/trackUtils.test.ts` (using `mockTracks.json` and edge-case inputs) with at least 8–10 meaningful tests covering:
>    - Duration formatting (`mm:ss`) and total setlist duration calculation.
>    - Artwork URL upgrading (`100x100bb` to `600x600bb`).
>    - Normalization, deduplication by `trackId`, and Band Origin / Subgenre enrichment.
>    - Filtering by search query, Origin Country, Style/Subgenre, and Sonic Mood Capsules (`Atmospheric & Epic`, `Modern Breakdown`, `70s–80s Legends`, `Quick Riff Blitz`).
>    - Sorting tracks and resolving a track's 6-string Guitar Riff Tab (`getTrackRiffTab`).
> 4. Verify that `npm test`, `npm run build`, and `npm run lint` all pass with zero errors and zero `any`.
> 
> Stop after completing Task 4 and explain what changed in 3 sentences.
> </pasted_content id="5dbb">
Ran npm test and npm run test:ui in the browser and verified all 37 unit tests pass across duration formatting, country/style enrichment, mood filtering, deduplication, and guitar riff tab generation. Marked Task 4 as done in tasks.md.
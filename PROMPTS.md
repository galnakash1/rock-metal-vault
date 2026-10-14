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

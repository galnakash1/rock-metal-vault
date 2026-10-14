# Rock & Metal Vault — Product Requirements Document

> Technical design: [docs/architecture.md](docs/architecture.md) · Build plan: [tasks.md](tasks.md)

## 1. Purpose

**Rock & Metal Vault** is a front-end web application for exploring Rock, Metal, and Metalcore tracks. Users can browse a catalog, open a detail page for any track, listen to its 30-second preview, build a personal concert setlist, and compare two tracks head-to-head.

It is a master-detail Single Page Application (SPA) built with **React + Vite + TypeScript**. All data comes from the public, keyless **Apple iTunes Search API**. There is no backend, no login, and no API key.

## 2. Target Audience

Rock and metal fans who want to:

- **Discover** tracks across rock, metal, and metalcore in one place.
- **Preview** a 30-second riff before committing to a full listen.
- **Curate** a personal "concert setlist" of favorite tracks that persists between visits.
- **Compare** two tracks side by side and explore fun stats about the catalog.

## 3. Tech Stack & Constraints

| Area | Choice |
| --- | --- |
| Framework | React 19 + Vite + TypeScript (strict, **zero `any`**) |
| Routing | `react-router-dom` (client-side routing) |
| Data | Apple iTunes Search API, called with `fetch` inside `useEffect` |
| Persistence | Browser `localStorage` (setlist only) |
| Styling | Plain CSS — custom dark Rock/Metal theme, responsive, **no UI libraries** |
| Testing | Vitest + `@vitest/ui` (unit tests for utility functions) |

## 4. Data Source

**Apple iTunes Search API** — public, free, no API key, CORS-enabled.

```
https://itunes.apple.com/search?term=metalcore&media=music&entity=song&limit=60
```

- The catalog is built from three searches (`rock`, `metal`, `metalcore`) that are merged and de-duplicated by `trackId`.
- Fields used: `trackId`, `trackName`, `artistName`, `collectionName`, `artworkUrl100`, `previewUrl`, `trackTimeMillis`, `primaryGenreName`, `releaseDate`, `trackExplicitness`, `trackCount`.
- Artwork is upgraded from `100x100` to `600x600` by rewriting the URL (`…/100x100bb.jpg` → `…/600x600bb.jpg`).
- Results without a `previewUrl` are dropped, because every track in the Vault must be playable.
- Apple rate-limits the API (roughly 20 requests per minute), so the catalog is fetched **once** per page load and shared across all pages.

## 5. Pages & Routes

### a) `/` — Vault Catalog (Master List)

- A grid of **track cards**. Each card shows artwork, track title, artist, album, and duration, and has an add/remove-from-setlist button.
- A **search input** that filters live (as you type) by track title, artist, or album, ignoring case.
- A **genre filter** (values come from the data, e.g. Metal, Rock, Hard Rock) and an **artist filter**.
- A **sort selector**: Title A–Z / Z–A, Artist A–Z, Newest / Oldest release, Shortest / Longest duration.
- A results count (e.g. "Showing 24 of 142 tracks") and an empty-state message when nothing matches.
- Clicking a card opens that track's detail page.
- Shows a loading state while the catalog is fetched, and an error state if the request fails.

### b) `/tracks/:id` — Track Details (Detail View)

- Reads `id` from the URL with `useParams`.
- Shows **high-resolution album artwork** (upgraded to 600×600), track title, artist, album, **release year**, **duration formatted as `mm:ss`**, genre, and an explicit badge if applicable.
- An **HTML5 audio player** for the 30-second `previewUrl`.
- An add/remove-from-setlist toggle button.
- A "Back to Vault" link.
- If the id is invalid or not found, shows a clear "Track not found" message with a link back to the catalog.

### c) `/setlist` — Personal Setlist (Favorites)

- Lists every track the user has saved. The list is persisted in `localStorage`, so it survives page reloads.
- A summary panel shows the **track count** and **total setlist duration**.
- Each row has a preview player, a link to the track's details, and a **Remove** button.
- A **Clear setlist** button (with a confirmation step) empties the list.
- An empty state ("Your setlist is empty — go find some riffs") links to the catalog.

### d) `/arena` — Head-to-Head Track Arena & Stats

- **Head-to-Head:** two selectors let the user pick any two tracks from the catalog. Their attributes appear side by side:
  - Duration (`mm:ss`)
  - Release year
  - Explicit rating
  - Album track count

  The "winning" value in each numeric row is highlighted. Picking the same track twice is handled gracefully.
- **Catalog Stats dashboard:** total tracks, unique artists, average duration, longest and shortest track, oldest and newest release year, percentage of explicit tracks, and a per-genre breakdown.
- **Random track generator:** a "Roll a random track" button shows a random track from the catalog with a link to its detail page.

### e) `*` — 404 Not Found

- Any unknown URL shows a themed "404 — This track doesn't exist" page with a link back to the Vault.

### Global layout

- A persistent **Navbar** on every page with links to Vault, Setlist (with a live count badge), and Arena. The active route is highlighted with `NavLink`.

## 6. Acceptance Criteria

1. **When I** open `/`, **I see** a loading message, and then a grid of rock/metal track cards fetched from the iTunes API.
2. **When I** open `/` while the network request fails, **I see** an error message that explains the problem, plus a "Try again" button.
3. **When I** type "metallica" into the search box, **I see** the list immediately narrow to tracks whose title, artist, or album contains "metallica", ignoring case.
4. **When I** choose a genre or artist from the filters, **I see** only matching tracks, along with an updated results count.
5. **When I** choose "Longest duration" in the sort selector, **I see** the cards reordered from the longest track to the shortest.
6. **When I** search for something with no matches, **I see** a "No tracks match your filters" message instead of an empty page.
7. **When I** click a track card, **I see** the `/tracks/:id` page with 600×600 artwork, artist, album, release year, a `mm:ss` duration, genre, and a working 30-second audio preview.
8. **When I** visit `/tracks/123` with an id that doesn't exist, **I see** a "Track not found" message and a link back to the Vault.
9. **When I** click "Add to Setlist" on a card or detail page, **I see** the button switch to "Remove from Setlist" and the Navbar setlist count increase by one.
10. **When I** reload the browser on `/setlist`, **I see** the same saved tracks, with the correct track count and total duration.
11. **When I** click "Remove" on a setlist row or confirm "Clear setlist", **I see** the track (or all tracks) disappear and the totals update immediately.
12. **When I** pick two tracks in `/arena`, **I see** their duration, release year, explicit rating, and album track count side by side, with the higher value in each row highlighted.
13. **When I** click "Roll a random track" in `/arena`, **I see** a random track from the catalog, with a link to its detail page.
14. **When I** navigate to an unknown URL such as `/blast-beats`, **I see** the 404 page with a link back to the Vault.
15. **When I** open the app on a narrow mobile screen (~375px wide), **I see** a single-column layout with no horizontal scrolling and a usable Navbar.

## 7. Non-Functional Requirements

- **Type safety:** TypeScript strict mode, zero `any`; API responses are typed and normalized into app models.
- **Quality:** `npm run build`, `npm run lint`, and `npm test` all pass with zero errors.
- **Testing:** at least 6 meaningful unit tests covering the real logic in `src/utils/trackUtils.ts`.
- **Accessibility:** semantic HTML, labelled form controls, `alt` text on artwork, and visible keyboard focus.
- **Responsiveness:** works from about 360px mobile width up to wide desktop.

## 8. Out of Scope

- User accounts, authentication, or a backend / database.
- Playing full tracks (previews only — 30 seconds, provided by Apple).
- Syncing the setlist across devices (`localStorage` only).
- Third-party UI or state-management libraries.

## 9. Further Reading

- Component hierarchy, types, state strategy, and tested utilities: **[docs/architecture.md](docs/architecture.md)**
- Step-by-step build plan: **[tasks.md](tasks.md)**

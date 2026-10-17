# Rock & Metal Vault — Product Requirements Document

> Technical design: [docs/architecture.md](docs/architecture.md) · Build plan: [tasks.md](tasks.md)

## 1. Purpose

**Rock & Metal Vault** is a front-end web application for exploring Rock, Metal, and Metalcore tracks. Users can browse a catalog, open a detail page for any track, play its 30-second preview through an amp-style console, turn their saved tracks into a festival poster, and test their ears in a riff guessing game.

It is a master-detail Single Page Application (SPA) built with **React + Vite + TypeScript**. All data comes from the public, keyless **Apple iTunes Search API**. There is no backend, no login, and no API key.

## 2. Target Audience

Rock and metal fans who want to:

- **Discover** tracks across rock, metal, and metalcore in one place, including by mood.
- **Preview** a 30-second riff before committing to a full listen, and shape its sound with EQ presets.
- **Curate** a personal setlist that persists between visits and becomes a shareable-looking festival poster.
- **Play** a blind-test game to see who can name a track from its riff, and compare two tracks side by side.

## 2a. Signature Features

The app has exactly **four** signature features. To keep the UI clean and uncluttered, nothing beyond these four is added on top of the core catalog, detail, and setlist functionality.

| # | Feature | Page | In short |
| --- | --- | --- | --- |
| 1 | **Sonic Mood Capsules** | `/` | Mood filter pills above the track list, powered by a pure, unit-tested helper |
| 2 | **Amp Console Player** | `/tracks/:id` | HTML5 + Web Audio API preview player with a live frequency-bar visualizer and Rock/Metal EQ presets |
| 3 | **Festival Lineup & Poster Builder** | `/setlist` | Saved tracks become a festival poster with Headliner and Underbill tiers, total runtime, and switchable themes |
| 4 | **Riff Blind-Test Challenge** | `/arena` | Guess the track from its preview while blurred artwork slowly sharpens, with score and streak, plus a head-to-head comparison |

## 3. Tech Stack & Constraints

| Area | Choice |
| --- | --- |
| Framework | React 19 + Vite + TypeScript (strict, **zero `any`**) |
| Routing | `react-router-dom` (client-side routing) |
| Data | Apple iTunes Search API, called with `fetch` inside `useEffect` |
| Audio | HTML5 `<audio>` + Web Audio API (`BiquadFilterNode` EQ, `AnalyserNode` visualizer) |
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
- Preview audio (`audio-ssl.itunes.apple.com`) and artwork are served with `Access-Control-Allow-Origin: *`, so the Web Audio API can analyze and EQ them when the audio element sets `crossOrigin="anonymous"`.

## 5. Pages & Routes

### a) `/` — Vault Catalog (Master List)

- A grid of **track cards**. Each card shows artwork, track title, artist, album, and duration, and has an add/remove-from-setlist button.
- A **search input** that filters live (as you type) by track title, artist, or album, ignoring case.
- A **genre filter** (values come from the data, e.g. Metal, Rock, Hard Rock) and an **artist filter**.
- A **sort selector**: Title A–Z / Z–A, Artist A–Z, Newest / Oldest release, Shortest / Longest duration.
- **Sonic Mood Capsules** (signature feature 1): a row of mood pills above the list. Clicking a pill applies that mood; clicking the active pill again clears it. One mood can be active at a time, and it combines (AND) with search, filters, and sort.

  | Pill | Rule |
  | --- | --- |
  | Atmospheric & Epic | duration ≥ 5:00 |
  | Modern Breakdown | released 2010 or later **and** genre contains "metal" (Metal, Metalcore, …) |
  | 70s–80s Legends | released 1970–1989 |
  | Quick Riff Blitz | duration < 3:30 |
- A results count (e.g. "Showing 24 of 142 tracks") and an empty-state message when nothing matches.
- Clicking a card opens that track's detail page.
- Shows a loading state while the catalog is fetched, and an error state if the request fails.

### b) `/tracks/:id` — Track Details (Detail View)

- Reads `id` from the URL with `useParams`.
- Shows **high-resolution album artwork** (upgraded to 600×600), track title, artist, album, **release year**, **duration formatted as `mm:ss`**, genre, and an explicit badge if applicable.
- **Amp Console Player** (signature feature 2): an HTML5 `<audio>` element for the 30-second `previewUrl`, routed through the Web Audio API:
  - Custom play/pause and progress controls, styled like an amp.
  - A **real-time frequency bar visualizer** (`<canvas>` driven by an `AnalyserNode`).
  - Selectable **EQ presets**, applied live while playing: `Flat`, `Metalcore Scoop` (boosted lows and highs, scooped mids), `Classic Tube Amp` (warm mid push, softened highs), and `Bass Drop` (heavy low-end boost).
- An add/remove-from-setlist toggle button.
- A "Back to Vault" link.
- If the id is invalid or not found, shows a clear "Track not found" message with a link back to the catalog.

### c) `/setlist` — Festival Lineup & Poster Builder

- Saved tracks are persisted in `localStorage`, so they survive page reloads.
- **Festival Poster** (signature feature 3): the saved tracks are grouped by artist into acts and shown as a stylized festival poster:
  - **Headliners:** the top acts (up to 3, about the top third), ranked by number of saved tracks, then by total runtime. They get big type at the top of the poster.
  - **Underbill:** every other act, in smaller type below.
  - **Total festival runtime** (`h:mm:ss` / `mm:ss`) and the act and track counts.
  - **Poster theme switcher:** `Hellfire` (red/black), `Frostbite` (icy blue), and `Toxic Waste` (acid green). The poster restyles instantly.
- **Manage setlist:** a compact list under the poster with a link to each track's details and a **Remove** button. A **Clear setlist** button (with a confirmation step) empties it.
- An empty state ("Your lineup is empty — go find some riffs") links to the catalog.

### d) `/arena` — Riff Arena

- **Riff Blind-Test Challenge** (signature feature 4):
  - "Start round" picks a random catalog track and plays its 30-second preview.
  - The album artwork starts **heavily blurred** and **progressively unblurs** as the preview plays. It is fully revealed once the user answers.
  - **4 multiple-choice buttons** ("Title — Artist"): the correct track plus 3 decoys by different artists, in random order.
  - After a guess, the correct button turns green and a wrong pick turns red. **Score**, **current streak**, and **best streak** update, and a "Next round" button appears.
- **Head-to-Head comparison:** two selectors let the user pick any two tracks from the catalog. Their duration (`mm:ss`), release year, explicit rating, and album track count appear side by side. The "winning" value in each numeric row is highlighted, and picking the same track twice is handled gracefully.

### e) `*` — 404 Not Found

- Any unknown URL shows a themed "404 — This track doesn't exist" page with a link back to the Vault.

### Global layout

- A persistent **Navbar** on every page with links to **Vault Catalog** (`/`), **Festival Poster** (`/setlist`, with a live setlist count badge), and **Riff Arena** (`/arena`). The active route is highlighted with `NavLink`.

## 6. Acceptance Criteria

1. **When I** open `/`, **I see** a loading message, and then a grid of rock/metal track cards fetched from the iTunes API.
2. **When I** open `/` while the network request fails, **I see** an error message that explains the problem, plus a "Try again" button.
3. **When I** type "metallica" into the search box, **I see** the list immediately narrow to tracks whose title, artist, or album contains "metallica", ignoring case.
4. **When I** choose a genre or artist from the filters, **I see** only matching tracks, along with an updated results count.
5. **When I** choose "Longest duration" in the sort selector, **I see** the cards reordered from the longest track to the shortest.
6. **When I** search for something with no matches, **I see** a "No tracks match your filters" message instead of an empty page.
7. **When I** click the "Atmospheric & Epic" mood pill, **I see** it highlighted and only tracks of 5:00 or longer. **When I** click it again, **I see** the full list return.
8. **When I** click a track card, **I see** the `/tracks/:id` page with 600×600 artwork, artist, album, release year, a `mm:ss` duration, and genre.
9. **When I** press play on the Amp Console, **I see** the frequency bars move with the music. **When I** switch the EQ preset to "Bass Drop" while it plays, **I see** it marked as active, and the bass boost applies immediately without the preview restarting.
10. **When I** visit `/tracks/123` with an id that doesn't exist, **I see** a "Track not found" message and a link back to the Vault.
11. **When I** click "Add to Setlist" on a card or detail page, **I see** the button switch to "Remove from Setlist" and the Navbar setlist count increase by one.
12. **When I** open `/setlist` with saved tracks, **I see** a festival poster with Headliners in large type, Underbill acts below, and the total festival runtime. **When I** pick another poster theme, **I see** the poster restyle instantly.
13. **When I** reload the browser on `/setlist`, **I see** the same lineup. **When I** remove a track or confirm "Clear setlist", **I see** the poster and runtime update immediately.
14. **When I** start a Riff Blind-Test round in `/arena`, **I see** blurred artwork that gets sharper as the preview plays, and 4 answer buttons. **When I** pick one, **I see** whether I was right, along with my updated score and streak.
15. **When I** pick two tracks in the Head-to-Head section, **I see** their duration, release year, explicit rating, and album track count side by side, with the higher value in each row highlighted.
16. **When I** navigate to an unknown URL such as `/blast-beats`, **I see** the 404 page with a link back to the Vault.
17. **When I** open the app on a narrow mobile screen (~375px wide), **I see** a single-column layout with no horizontal scrolling and a usable Navbar.

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
- Third-party UI, audio, or state-management libraries.
- Features beyond the four signature features (e.g. stats dashboards, random-track rollers, playlists export).

## 9. Further Reading

- Component hierarchy, types, state strategy, and tested utilities: **[docs/architecture.md](docs/architecture.md)**
- Step-by-step build plan: **[tasks.md](tasks.md)**

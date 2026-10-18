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
| 3 | **Festival Lineup & Poster Builder** | `/setlist` | Saved tracks become a festival poster with Headliners and a Main Stage underbill, origin flags, stats, and switchable themes |
| 4 | **Riff Blind-Test Challenge** | `/arena` | Guess the track from its preview while blurred artwork slowly sharpens, with score and streak, plus a head-to-head comparison |

Supporting the features above are three **music-data enrichments**, which add data rather than extra UI:

| Enrichment | Where it shows | In short |
| --- | --- | --- |
| **Band Origin & Style** | Cards, `/tracks/:id`, filters | Each track gets the band's origin country + flag and a style/subgenre (e.g. 🇬🇧 Metalcore) from a curated artist map |
| **Country & Style filtering** | `/` | Filter by Origin Country and Style/Subgenre; search also matches style and country |
| **6-String Guitar Riff Tab** | `/tracks/:id` | A simplified **signature riff** for a few iconic songs, otherwise a practice riff for the track's style: tuning, BPM, difficulty, a 6-line tab, and a playhead synced to the preview |

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

- The catalog is built from **7 requests on a cold load**: three broad searches (`rock`, `metal`, `metalcore`) for the mainstream, plus 4 parallel **Lookup API** calls (`https://itunes.apple.com/lookup?id=…&entity=song&limit=3`, ~16 artist ids each) that fetch 3 songs from each of ~60 curated international bands by Apple artist id (Israel, Sweden, Finland, Norway, Denmark, Iceland, France, Germany, Ukraine, Poland, the Netherlands, Switzerland, Greece, Brazil, Japan, Canada). Results are merged and de-duplicated by `trackId` (about 290 tracks, 19 countries, 30+ styles).
- **Fast loading:** tracks render as soon as the fastest request lands (progressive rendering), and later responses merge in. The finished catalog is cached in memory and in **`localStorage`** for 6 hours, so reloads and new tabs show it instantly with no requests.
- **Rate-limit protection:** concurrent loads (e.g. React StrictMode's double mount) share one in-flight batch, and cached loads make no requests. **Retry** bypasses the cache. If some requests fail, the rest still load the catalog.
- Generic searches also match off-genre hits (e.g. "Jingle Bell Rock", country songs), so a track is kept only when its `primaryGenreName` is on a rock/metal allowlist (Rock, Hard Rock, Metal, Punk, Grunge, …) **or** its artist is a curated rock/metal band — whatever Apple files the album under (Orphaned Land, Wardruna and KALEO may be "World", "Worldwide", or "Alternative"). iTunes' "Alternative" genre mixes rock bands with pop acts (e.g. twenty one pilots), so it isn't on the allowlist; curated bands such as Linkin Park still get in.
- **Band origin & style enrichment:** Apple's `country` field is the storefront ("USA"), not where a band formed. During normalization, each track is enriched from a curated map of ~170 rock/metal/metalcore artists with `originCountry` + `originFlag` (19 countries, from United States 🇺🇸 and United Kingdom 🇬🇧 to Israel 🇮🇱, Sweden 🇸🇪, Finland 🇫🇮, Norway 🇳🇴, Iceland 🇮🇸, Ukraine 🇺🇦, Brazil 🇧🇷 and Japan 🇯🇵) and a `subgenre` (Metalcore, Melodic Death Metal, Black Metal, Oriental / Folk Metal, Kawaii Metal, …). Matching uses Apple's **artist id** first (so a hip-hop "Ghost" never becomes Sweden's Ghost), then the accent- and case-insensitive name. Unlisted artists fall back deterministically to **"Unknown" 🌐** (a country is never guessed) and a style derived from the iTunes genre.
- Fields used: `trackId`, `artistId`, `trackName`, `artistName`, `collectionName`, `artworkUrl100`, `previewUrl`, `trackTimeMillis`, `primaryGenreName`, `releaseDate`, `trackExplicitness`, `trackCount`.
- Artwork is upgraded from `100x100` to `600x600` by rewriting the URL (`…/100x100bb.jpg` → `…/600x600bb.jpg`).
- Results without a `previewUrl` are dropped, because every track in the Vault must be playable.
- Apple rate-limits the API (roughly 20 requests per minute), so the catalog is fetched **once** per page load and shared across all pages.
- Preview audio (`audio-ssl.itunes.apple.com`) and artwork are served with `Access-Control-Allow-Origin: *`, so the Web Audio API can analyze and EQ them when the audio element sets `crossOrigin="anonymous"`.

## 5. Pages & Routes

### a) `/` — Vault Catalog (Master List)

- A grid of **track cards**. Each card shows artwork, track title, artist, album, origin flag, style, and duration, and has an add/remove-from-setlist button.
- A **search input** that filters live (as you type) by track title, artist, album, style/subgenre, or origin country, ignoring case.
- **Origin Country**, **Style/Subgenre**, and **Artist** filters (options come from the loaded data; Style replaces the coarse iTunes genre).
- A **sort selector**: Title A–Z / Z–A, Artist A–Z, Newest / Oldest release, Shortest / Longest duration.
- **Sonic Mood Capsules** (signature feature 1): a row of mood pills above the list. Clicking a pill applies that mood; clicking the active pill again clears it. One mood can be active at a time, and it combines (AND) with search, filters, and sort.

  | Pill | Rule |
  | --- | --- |
  | Atmospheric & Epic | duration ≥ 5:00 |
  | Modern Breakdown | released 2010 or later **and** metal/metalcore (iTunes genre contains "metal", or style contains "metal"/"core") |
  | 70s–80s Legends | released 1970–1989 |
  | Quick Riff Blitz | duration < 3:30 |
- A results count (e.g. "Showing 24 of 142 tracks") and an empty-state message when nothing matches.
- Clicking a card opens that track's detail page.
- Shows a loading state while the catalog is fetched, and an error state if the request fails.

### b) `/tracks/:id` — Track Details (Detail View)

- Reads `id` from the URL with `useParams`.
- Shows **high-resolution album artwork** (upgraded to 600×600), track title, artist, album, **release year**, **duration formatted as `mm:ss`**, genre, **style/subgenre**, **band origin** (flag + country), and an explicit badge if applicable.
- **Guitar Riff Tab panel**, next to the Amp Console: a monospaced 6-string tab (`e B G D A E` lines) with **tuning** (e.g. "Drop C (C G C F A D)"), approximate **BPM**, and **difficulty**. A highlighted **playhead** column follows the preview at the riff's tempo.
  - **Signature riff tab:** for a curated set of iconic songs (Iron Man, Back In Black, Smoke on the Water, Smells Like Teen Spirit, Sweet Child O' Mine, Crazy Train, Nothing Else Matters), a simplified tab of the song's own opening riff.
  - **Practice riff tab:** for every other track, a riff in the track's style (e.g. "Metalcore practice riff"), clearly labelled as not a transcription of the recording.
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
  - **Headliners:** the top acts (up to 3, about the top third), ranked by number of saved tracks, then by total runtime, then name. They get big display type at the top of the poster.
  - **Main Stage (underbill):** every other act, in smaller type below.
  - Each act shows its **origin flag + country** and **style**.
  - **Summary stats:** total tracks, bands, and total festival runtime (`h:mm:ss` / `mm:ss`).
  - **Poster theme switcher:** `Foggy Woodland` (misty greens), `Blood Moon` (black sky, crimson moon), and `Vintage Tour` (cream paper and ink). The poster restyles instantly.
- **Running order:** the saved tracks in the order they were added, with artwork, formatted durations, links to `/tracks/:id`, and a **Remove** button each. A **Clear Lineup** button (with a confirmation step) empties it.
- An empty state ("Your lineup is empty") links back to the catalog.
- **Add to Setlist** buttons on every track card and on the detail page toggle a track in and out of the setlist without navigating away. Saved tracks open on `/tracks/:id` even when the catalog is still loading or the API is down.

### d) `/arena` — Riff Arena

- **Riff Blind-Test Challenge** (signature feature 4):
  - "Start the challenge" picks a random catalog track (avoiding the last 15 answers) and plays its 30-second preview through the app's player. The preview is **concealed**: the Now Playing bar stays hidden so it can't give the answer away.
  - The album artwork starts at **`blur(24px)`** and **progressively unblurs to `blur(0px)`** over the 30-second preview. It is fully revealed once the user answers; until then its alt text doesn't name it.
  - **4 multiple-choice buttons** ("Title" + artist): the correct track plus 3 **realistic decoys**, preferring the answer's style and country, all by different artists and with different titles, in random order.
  - After a guess, the correct button turns green, a wrong pick turns red, and the answer is revealed with a link to its page. **Points reward speed** (1000 for an instant correct guess, down to 100 at the end of the preview; 0 when wrong). **Score**, **current streak**, **best streak** (saved in `localStorage`), and accuracy update, and a **"Next Riff"** button starts the next round.
  - Leaving the arena or starting the next round stops the previous riff.
- **Head-to-Head Track Battle:** two **searchable** pickers (Track A vs Track B) let the user choose any two catalog tracks. Side-by-side cards show artwork, title, artist, origin flag and country, and style, with a **preview play button** and a **setlist toggle** each. A comparison table lists duration (the **longer** track is highlighted), release year (the **earlier, vintage** release is highlighted), style, origin, guitar tuning, and riff tempo (from the riff tab). Picking the same track twice is handled gracefully.

### e) `*` — 404 Not Found

- Any unknown URL shows a themed "404 — This track doesn't exist" page with a link back to the Vault.

### Global layout

- **Filters are remembered:** search, mood, country, style, artist and sort survive visiting a track, the setlist, or the arena and coming back.
- **Now Playing mini-bar:** a preview keeps playing while you browse. When the playing track's detail page isn't open, a bottom bar shows its artwork, title, artist and flag, the EQ preset, play/pause, a link back to the Amp Console, and a stop button. Reopening the track's page picks up the same playback without restarting it.
- A persistent **Navbar** on every page with links to **Vault Catalog** (`/`), **Festival Poster** (`/setlist`, with a live setlist count badge), and **Riff Arena** (`/arena`). The active route is highlighted with `NavLink`.

## 6. Acceptance Criteria

1. **When I** open `/`, **I see** a loading message, and then a grid of rock/metal track cards fetched from the iTunes API.
2. **When I** open `/` while the network request fails, **I see** an error message that explains the problem, plus a "Try again" button.
3. **When I** type "metallica" into the search box, **I see** the list immediately narrow to tracks whose title, artist, or album contains "metallica", ignoring case.
4. **When I** choose an Origin Country, Style, or Artist from the filters, **I see** only matching tracks, along with an updated results count.
5. **When I** choose "Longest duration" in the sort selector, **I see** the cards reordered from the longest track to the shortest.
6. **When I** search for something with no matches, **I see** a "No tracks match your filters" message instead of an empty page.
7. **When I** click the "Atmospheric & Epic" mood pill, **I see** it highlighted and only tracks of 5:00 or longer. **When I** click it again, **I see** the full list return.
8. **When I** click a track card, **I see** the `/tracks/:id` page with 600×600 artwork, artist, album, release year, a `mm:ss` duration, genre, style, and the band's origin flag and country.
9. **When I** press play on the Amp Console, **I see** the frequency bars move with the music. **When I** switch the EQ preset to "Bass Drop" while it plays, **I see** it marked as active, and the bass boost applies immediately without the preview restarting.
10. **When I** open a metalcore track's detail page, **I see** a Guitar Riff Tab panel with a "Drop C" tuning, a BPM, a difficulty, and six aligned tab lines labelled e, B, G, D, A, E.
11. **When I** type "australia" or "thrash" into the search box, **I see** only tracks by Australian bands or with a Thrash Metal style.
12. **When I** visit `/tracks/123` with an id that doesn't exist, **I see** a "Track not found" message and a link back to the Vault.
13. **When I** click "Add to Setlist" on a card or detail page, **I see** the button switch to "Remove from Setlist" and the Navbar setlist count increase by one.
14. **When I** open `/setlist` with saved tracks, **I see** a festival poster with Headliners in large type, Main Stage acts below, origin flags and styles, and the total festival runtime. **When I** pick another poster theme, **I see** the poster restyle instantly.
15. **When I** reload the browser on `/setlist`, **I see** the same lineup. **When I** remove a track or confirm "Clear setlist", **I see** the poster and runtime update immediately.
16. **When I** start a Riff Blind-Test round in `/arena`, **I see** blurred artwork that gets sharper as the preview plays, and 4 answer buttons. **When I** pick one, **I see** green for the right answer (and red for my wrong pick), the points I earned for my speed, and my updated score, streak, and saved best streak.
17. **When I** pick two tracks in the Head-to-Head section, **I see** them side by side with origin, style, duration, release year, tuning, and tempo, with the longer track and the earlier release highlighted.
18. **When I** navigate to an unknown URL such as `/blast-beats`, **I see** the 404 page with a link back to the Vault.
19. **When I** open the app on a narrow mobile screen (~375px wide), **I see** a single-column layout with no horizontal scrolling and a usable Navbar.

## 7. Non-Functional Requirements

- **Type safety:** TypeScript strict mode, zero `any`; API responses are typed and normalized into app models.
- **Quality:** `npm run build`, `npm run lint`, and `npm test` all pass with zero errors.
- **Testing:** at least 8–10 meaningful unit tests (Vitest) covering the real logic in `src/utils/` — formatting, normalization, enrichment, filtering, moods, sorting, and riff tabs.
- **Accessibility:** semantic HTML, labelled form controls, `alt` text on artwork, and visible keyboard focus.
- **Responsiveness:** works from about 360px mobile width up to wide desktop.

## 8. Out of Scope

- User accounts, authentication, or a backend / database.
- Playing full tracks (previews only — 30 seconds, provided by Apple).
- Syncing the setlist across devices (`localStorage` only).
- Third-party UI, audio, or state-management libraries.
- Features beyond the four signature features and three enrichments (e.g. stats dashboards, random-track rollers, playlists export).
- Full or exhaustive transcriptions: only a few short, simplified signature opening riffs are tabbed; everything else uses a style-based practice riff.

## 9. Further Reading

- Component hierarchy, types, state strategy, and tested utilities: **[docs/architecture.md](docs/architecture.md)**
- Step-by-step build plan: **[tasks.md](tasks.md)**

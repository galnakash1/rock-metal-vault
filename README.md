# 🤘 Rock & Metal Vault

**Rock & Metal Vault** is a dark, stage-lit web app for rock and metal fans. You can explore rock, metal and metalcore tracks from around the world, and play their 30-second previews through an amp console with EQ presets and a live visualizer. Each track has a 6-string riff tab you can play along with. You can turn your favourite tracks into a festival poster with a world tour, test your ears in a 4-stage riff guessing tournament, and get a personal 10-track playlist from a 5-question Sonic Diagnostic.

It is a front-end-only single-page app built with **React 19 + TypeScript + Vite**. All music data comes from Apple's public, keyless **iTunes Search & Lookup API**. There is no backend, no login and no API key.

> Built as a full-stack course project, one task at a time with an AI coding agent. See [Project documentation](#project-documentation).

---

## Pages & routes

| Route | Page | What you can do |
| --- | --- | --- |
| `/` | **Vault Catalog** | Browse ~1,030 studio tracks as cards (rendered 48 at a time as you scroll, or with **Show More Tracks**). Search live, pick a Sonic Mood Capsule, filter by origin country / style / artist, sort (including **Vault Picks**), press ▶ on any card to queue the filtered list from that track, and add tracks to your setlist. |
| `/tracks/:id` | **Track Detail** | 600×600 artwork and track facts, full-song links (Apple Music, Spotify, YouTube), the **Amp Console** (preview player with live EQ and visualizer), the **6-String Guitar Riff Tab** with a playhead that follows the music, and **More Like This**: up to 6 related tracks to explore next. |
| `/setlist` | **Festival Lineup & Poster Builder** | Your saved tracks become a festival poster (Headliners, Main Stage and World Tour dates) in one of 6 themes. Play the whole lineup in running order (⏮ / ⏭, auto-advance), or any single row, and open full songs on Apple Music, Spotify or YouTube. |
| `/arena` | **Riff Arena** | The **Riff Blind-Test Tournament** (4 stages of 5 rounds, 3 amp-tube lives, final scoreboard) and the **Head-to-Head Track Battle**. |
| `/builder` | **Playlist Builder** | A 5-question **Sonic Diagnostic** names your **Metal Persona** and builds a tailored 10-track playlist: preview, play all, swap tracks, add them all to your setlist. |
| `*` | **404** | "This track doesn't exist", with a link back to the Vault. |

A **Now Playing mini-player** stays at the bottom of every page, so a preview keeps playing while you browse. It has its own EQ preset selector.

## Signature features

- **🎚️ Sonic Mood Capsules:** one-click mood filters that combine with search, filters and sort:
  - **Atmospheric & Epic:** 5:00 or longer.
  - **Modern Breakdown:** 2010+ metal and metalcore.
  - **70s–80s Legends:** released 1970–1989.
  - **Quick Riff Blitz:** under 3:30.
- **🌍 Band origin & style enrichment:** every track is tagged with where the band formed, using a flag and a country, plus a style. That's **19 countries**, including Israel 🇮🇱, Sweden 🇸🇪, Finland 🇫🇮, Norway 🇳🇴, Iceland 🇮🇸, Ukraine 🇺🇦, Brazil 🇧🇷 and Japan 🇯🇵. Live tracks span **32 styles**, from Metalcore and Melodic Death Metal to Black 'n' Roll, Oriental / Folk Metal and Kawaii Metal. You can filter and search by country and style.
- **🔊 Amp Console (Web Audio API):** `<audio>` playback runs through a 3-band EQ (`BiquadFilterNode`) with presets: Flat, Metalcore Scoop, Classic Tube Amp and Bass Drop.
  - Presets change the sound live, without restarting.
  - An `AnalyserNode` drives a real-time frequency-bar visualizer.
  - If Web Audio isn't available, playback falls back to the plain `<audio>` element.
  - Playback is **persistent**: it keeps going across routes, controlled by the mini-player.
- **🎸 6-String Guitar Riff Tabs:**
  - **Signature riffs:** simplified tabs of famous opening riffs (Iron Man, Back In Black, Smoke on the Water, Smells Like Teen Spirit, Sweet Child O' Mine, Crazy Train, Nothing Else Matters).
  - **Practice riffs:** every other track gets a riff in its style, clearly labelled as a practice riff.
  - Each tab shows the tuning, an approximate BPM and a difficulty, with a highlighted playhead synced to the preview.
- **🪧 Festival Poster Builder:** the bands you saved most become Headliners in huge type, and the rest form the Main Stage underbill. It shows track, band and runtime stats, in six designs: **Hellfire Forge**, **Catacomb Black**, **Thrash Pit '86**, **Foggy Woodland**, **Blood Moon** and **Vintage '70s Arena**. **▶ Play Full Festival Lineup** queues the running order, with auto-advance, ⏮ / ⏭, play buttons on each row, and a queue position ("Setlist 2 / 7") in the mini-player and the Amp Console.
- **🎯 Riff Blind-Test Tournament:**
  - A hidden preview plays while the blurred artwork sharpens over 30 seconds. You pick the track from 4 options. Faster correct guesses score more (up to 1,000 points × the stage multiplier).
  - **4 stages of 5 rounds**, each harder than the last:

    | Stage | Bands | Start blur | Decoys | Points |
    | --- | --- | --- | --- | --- |
    | 1 · Easy | Mainstream headliners (Metallica, Nirvana, AC/DC, Iron Maiden…) | 14px | random | ×1 |
    | 2 · Medium | Modern heavyweights (Bring Me The Horizon, Bad Omens, Gojira, Rammstein…) | 22px | similar style/country | ×1.5 |
    | 3 · Hard | Meshuggah, Nordic extreme metal, Israeli metal | 28px | same style | ×2 |
    | 4 · Elite | Deep cuts from the curated global scene | 32px | same style | ×2.5 |

  - **3 amp-tube lives for the whole run.** A wrong answer or a timeout costs a life. Clearing a stage shows a **"Stage X Cleared!"** screen and restores one life (max 3).
  - The run ends with **Tournament Conquered!** or **Game Over**. The **Final Scoreboard** shows the stage reached, your rank (Garage Roadie → Immortal Riff God, out of 35,000 points), accuracy, streaks, your all-time records (saved in `localStorage`) and a round-by-round recap with Add to Setlist buttons.
- **🧪 Playlist Builder (Sonic Diagnostic):** five questions (tempo & energy, era & guitar tone, mood, regional scene, iconic vs deep cuts). A pure, unit-tested scoring function ranks every catalog track. You get a **Metal Persona** (e.g. *Black Metal Frost Wraith*) and a 10-track playlist with at most 2 songs per band. Preview any song, **▶ Play All 10 Tracks**, **⇄ Swap** a single track, **Add All 10 to Festival Setlist**, or re-run the diagnostic.
- **⭐ Vault Picks — Curated Favorites:** a Sort by option that puts editorial picks first, using the app's curated metadata. It is **not** a popularity chart (no streams, sales or chart data). It has three tiers:
  1. featured releases (all of *Sempiternal*, and the Limp Bizkit and Saliva studio hits);
  2. flagship bands (the headliner and deep-catalog lists, so Meshuggah too);
  3. everything else.

  Inside each tier the bands take turns: each band's first track (bands A–Z), then each band's second, and so on, earliest release first. That keeps the first results from being one band in a row. It only reorders the current search and filter results, never removes a track, and gives the same order however the catalog batches arrive. A short note under the dropdown says it's not an official popularity chart.
- **🔗 More Like This:** every track page ends with a horizontal strip of up to 6 related tracks from the catalog already loaded (no extra API requests). Same style first, preferring other artists and the closest release years; then, only if needed, the same iTunes genre. Unrelated tracks are never used as filler, so a rare style may show fewer cards or none. The order is deterministic, and the strip updates as later catalog batches arrive.
- **🎧 Full-song links:** the API only has 30-second previews, so the detail page, the running order and the playlist link each song to Apple Music (the exact track), Spotify and YouTube (searches).
- **⚔️ Head-to-Head Track Battle:** pick any two tracks with searchable pickers. They're compared on duration (longer wins), release year (earlier wins), style, origin, guitar tuning and riff tempo. Each card has a preview button and a setlist toggle.

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19, TypeScript 6 (strict mode, **zero `any`**), Vite 8 |
| Routing | React Router 7 (`BrowserRouter`, `NavLink`, `useParams`) |
| Audio | HTML5 `<audio>` + Web Audio API |
| State | React state and props, plus one small external store for the player (`useSyncExternalStore`). No state library. |
| Persistence | `localStorage` (setlist, catalog cache, arena records) |
| Styling | Plain CSS with custom properties: a concert stage backdrop (diamond-plate floor, amp-grille mesh, swaying crimson and molten-amber light beams, a lightning strike, rising embers, a stage truss under the navbar) behind slightly translucent metal panels; chrome titles, bevels; responsive from 375px. **No UI library.** |
| Testing | Vitest 5 + `@vitest/ui` |

## Getting started

**Requirements:** Node.js **22.12 or newer** (Vitest 5 needs it) and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (http://localhost:5173)
npm run dev

# 3. Production build (type-checks with tsc, then bundles with Vite into dist/)
npm run build

# 4. Serve the production build locally (http://localhost:4173)
npm run preview

# Lint the whole project
npm run lint
```

## Running the unit tests

```bash
# Run all unit tests once, headless (CI-style)
npm test

# Open the interactive Vitest UI dashboard in your browser (already signed in)
npm run test:ui
```

`npm run test:ui` runs [`scripts/test-ui.mjs`](scripts/test-ui.mjs). It starts the tests in watch mode with **@vitest/ui** and opens the UI's `?token=` URL, so the browser is authenticated straight away. Vitest 5 protects its UI with a token, and plain `vitest --ui --open` reopens the bare URL after the first run, which shows "Vitest UI requires authentication" in a browser that doesn't have the cookie yet. Set `BROWSER=none` to only print the URL.

There are **208 unit tests in 8 files**. They cover the app's pure logic and never touch the network:

| Test file | Covers |
| --- | --- |
| `src/utils/trackUtils.test.ts` | Duration formatting, artwork upgrade, response validation, the studio-only (no live) filter, the compilation filter, normalization and de-duplication, the catalog tiers, band origin and style enrichment, the genre allowlist and namesake rejection, filtering, Sonic Mood Capsules (with boundaries), sorting (including Vault Picks tiers, artist rotation and determinism), riff tabs and playhead, and the Riff Arena rules (rounds and decoy modes, blur, scoring, tournament stages, stage pools, lives across stages, ranks, records, Head-to-Head metrics) |
| `src/utils/setlistUtils.test.ts` | Setlist toggle, remove and bulk add, `localStorage` parsing (including corrupted data), poster tiers (Headliners vs Main Stage), the 6 poster themes, and the world tour dates |
| `src/utils/builderUtils.test.ts` | The Sonic Diagnostic: questions, profile scoring, ranking, the 10-track playlist (max 2 per band), swapping, and Metal Personas |
| `src/utils/streamingLinks.test.ts` | Apple Music / Spotify / YouTube links and search queries |
| `src/utils/relatedTracks.test.ts` | More Like This: exact-style matches, the iTunes-genre fallback, blank values never matching, excluding the current track, duplicate ids, deterministic ordering (release year, artist variety), the 6-track cap, too few matches, and later catalog batches |
| `src/utils/catalogCache.test.ts` | The catalog cache TTL and validation, the progressive merge, song-level de-duplication (the original release wins), the 25-songs-per-band cap, and canonical album artwork |
| `src/utils/audioUtils.test.ts` | EQ presets, visualizer frequency bucketing, mini-player visibility, and lineup queue navigation (⏮ / ⏭ / auto-advance) |
| `src/api/itunes.test.ts` | The request plan (deep, headliner and spotlight tiers; stays under Apple's rate limit), and `fetchCatalog` caching against a mocked API: a fully successful batch is cached, a partially failed batch still returns its tracks but isn't cached (the next load fetches again), and a completely failed batch rejects |

The tests use `src/test/fixtures/mockTracks.json` as a fixture: 10 real iTunes records, loaded through the same validation as live data. **Only the test files import it**; the app never does, and none of its data is in the production bundle.

## API & data architecture

**100% of the catalog is fetched live** from Apple's public, keyless iTunes API: [`https://itunes.apple.com/search`](https://itunes.apple.com/search?term=metal&media=music&entity=song&limit=5) and `https://itunes.apple.com/lookup`. No track data is hardcoded in the app. The curated artist map (`src/utils/artistMetadata.ts`) only stores band facts (origin country, style, Apple artist ids) and the ids of a few releases to fetch; every title, album, cover, preview and duration comes from the API.

### Endpoints (public, no API key)

| Endpoint | Used for |
| --- | --- |
| `https://itunes.apple.com/search?term=…&media=music&entity=song&limit=50` | Three broad searches (`rock`, `metal`, `metalcore`) for the mainstream catalog |
| `https://itunes.apple.com/lookup?id=…&entity=song&limit=50` | **Deep tier:** the top 50 songs of 22 flagship bands (Metallica, Meshuggah, Slipknot, Bring Me The Horizon, Nirvana, Limp Bizkit…), by Apple artist id (3 lookups of up to 8 ids). After filtering, each band keeps 20–25 studio songs (Bring Me The Horizon: up to 35). |
| `https://itunes.apple.com/lookup?id=…&entity=song&limit=10` | **Headliner tier:** the top 10 songs of 18 more headliners, including Saliva (2 lookups) |
| `https://itunes.apple.com/lookup?id=598282638,1440754477,…&entity=song&limit=200` | **Featured releases:** one lookup for what top-song lookups miss — every track of Bring Me The Horizon's *Sempiternal* (by album id) and the exact studio versions of Limp Bizkit's and Saliva's hits (by track id). These tracks are pinned: the per-band cap never drops them, and they win de-duplication. |
| `https://itunes.apple.com/lookup?id=…&entity=song&limit=5` | **Spotlight tier:** 5 songs from each of 55 other curated bands, mostly the international scene (Israel, Scandinavia, Japan…) (4 lookups of ~16 ids) |

Preview audio and artwork are served with `Access-Control-Allow-Origin: *`, which lets the Web Audio API analyse and EQ the previews.

### Loading pipeline

1. **Instant from cache.** The normalized catalog is cached in memory and in **`localStorage`** for 6 hours, and shared by every tab. A cached load renders the full catalog on the first frame, with no network requests.
2. **Progressive network load.** On a cold start, the 13 requests run in parallel. Tracks appear as soon as the fastest search returns; the rest merge in under a "Loading more bands…" note. If one request fails, the others still load.
3. **Validate → normalize → enrich → de-duplicate → filter.** Responses are checked at runtime (`parseSearchResults`), mapped to the app's `Track` model, and enriched.
   - **Studio recordings only:** live versions ("(Live)", "- Live", "Live at Wembley"…), commentary, karaoke, interview and unplugged releases are rejected by `isStudioRecording`.
   - **No compilations:** Greatest Hits (and Limp Bizkit's "Greatest Hitz"), Best Of, Anthology, Essential, Icon, 20th Century Masters, Retrospective, The Singles (and soundtracks) are rejected by `isCompilationAlbum`.
   - **One copy per song:** duplicate `trackId`s are dropped (unique React keys), and so are repeat releases of the same song on another album. The **original (earliest) release wins** (`dedupeSongs`), so Nirvana's "Lithium" shows *Nevermind*, not the 2002 self-titled best-of.
   - **One cover per album:** every song from the same studio album (deluxe and remastered editions included) gets the artwork of its earliest release (`canonicalizeAlbumArtwork`).
   - **At most 25 songs per band** (`capTracksPerArtist`; Bring Me The Horizon gets 35, so all of *Sempiternal* fits next to their other hits).
   - **Off-genre filter:** hits like "Jingle Bell Rock" are removed.
4. **Rate-limit friendly.** Apple allows roughly 20 requests per minute, and a cold load makes 13. React StrictMode's double mount shares one in-flight batch, cached loads make no requests, and **Retry** forces a fresh fetch.

### Enrichment

Apple's `country` field is the storefront, not where a band formed, so `normalizeTrack` adds three fields from a curated map of 165 artists (`src/utils/artistMetadata.ts`):

- **`originCountry`** and **`originFlag`**, e.g. `"Israel"` / 🇮🇱
- **`subgenre`**, e.g. `"Oriental / Folk Metal"`

Matching uses Apple's artist id first, then the name with accents and case ignored. That means a hip-hop "Ghost" never becomes Sweden's Ghost, and "Solstafir" still matches Sólstafir. Unlisted artists get an honest **"Unknown" 🌐** origin and a style derived from the iTunes genre; a country is never guessed.

### Browser storage

| Key | Contents |
| --- | --- |
| `rmv:catalog:v6` | Cached catalog (6 h TTL; the version is bumped whenever the catalog rules change) |
| `rmv:setlist` | Your festival setlist (full tracks, re-validated on load) |
| `rmv:arena:high-score`, `rmv:arena:best-streak` | All-time Riff Blind-Test records |

## Project structure

```
src/
├── api/itunes.ts            # Request plan, progressive batch, caches
├── audio/playerEngine.ts    # App-wide player: one <audio> + Web Audio graph + store
├── hooks/usePlayer.ts       # useSyncExternalStore subscription (+ usePlayerSelector)
├── components/              # Navbar, TrackCard, FilterBar, MoodCapsules, AudioPreviewPlayer,
│                            # RiffTabPanel, MiniPlayer, SetlistButton, FestivalPoster,
│                            # BlindTestGame, HeadToHead, TrackSelect, StatusMessage,
│                            # CardPlayButton, LineupPlayback, StreamingLinks, StageBackdrop,
│                            # RelatedTracks
├── pages/                   # CatalogPage, TrackDetailPage, SetlistPage, ArenaPage,
│                            # PlaylistBuilderPage, NotFoundPage
├── types/                   # track.ts, riff.ts, audio.ts (strict types, no `any`)
├── utils/                   # Pure, unit-tested logic (+ *.test.ts)
├── test/fixtures/           # mockTracks.json: 10 sample iTunes records, imported by tests only
├── App.tsx                  # Routes + shared state (catalog, filters, setlist)
├── index.css                # Design tokens & base styles
└── App.css                  # Component styles
scripts/
├── test-ui.mjs              # npm run test:ui: Vitest UI, opened with its auth token
└── log-prompt.mjs           # Logs each prompt to PROMPTS.md (agent hook)
```

## Rubric map (where to look)

| Requirement | Where |
| --- | --- |
| `fetch` inside `useEffect` | [`src/App.tsx:42-77`](src/App.tsx#L42-L77) calls `fetchCatalog()`, whose `fetch()` is at [`src/api/itunes.ts:104`](src/api/itunes.ts#L104); `AbortController` cleanup and a Retry counter |
| 3 screen states: loading / error / has data | `FetchStatus = 'loading' \| 'error' \| 'success'` ([`src/types/track.ts:160`](src/types/track.ts#L160)), set in [`src/App.tsx`](src/App.tsx#L32) and rendered with `StatusMessage` in [`src/pages/CatalogPage.tsx:115-137`](src/pages/CatalogPage.tsx#L115-L137) (also Detail, Arena, Builder) |
| Data from the API, not pasted | Every track comes from `itunes.apple.com/search` and `/lookup`; the sample JSON lives in `src/test/fixtures/` and is imported by tests only |
| React Router | `<BrowserRouter>` + routes `/`, `/tracks/:id`, `/setlist`, `/arena`, `/builder`, `*` in [`src/App.tsx:107-184`](src/App.tsx#L107-L184) |
| `useParams` | [`src/pages/TrackDetailPage.tsx:35`](src/pages/TrackDetailPage.tsx#L35) |
| `NavLink` with active style | [`src/components/Navbar.tsx`](src/components/Navbar.tsx#L17) |
| `.map()` with a unique `key` | [`src/pages/CatalogPage.tsx:164-165`](src/pages/CatalogPage.tsx#L164-L165) (`key={track.id}`), and every other list |
| ≥ 4 reusable components with typed props | 18 files in [`src/components/`](src/components/), e.g. `Navbar`, `TrackCard`, `FilterBar`, `StatusMessage`, `AudioPreviewPlayer`, each exporting a `…Props` interface |
| TypeScript, zero `any` | Strict mode; no `any`, `@ts-ignore`, `@ts-expect-error` or `console.*` in `src` |
| Unit tests (Vitest + UI) | 208 tests in 8 `*.test.ts` files; `npm test` and `npm run test:ui` |
| Docs | [PRD.md](PRD.md) ("When I…, I see…"), [tasks.md](tasks.md) (12 tasks), [docs/architecture.md](docs/architecture.md), [PROMPTS.md](PROMPTS.md) |

## Project documentation

- **[PRD.md](PRD.md):** product requirements, pages, and acceptance criteria ("When I…, I see…").
- **[tasks.md](tasks.md):** the build plan: 12 tasks in build order, each with a `Done when:` line.
- **[docs/architecture.md](docs/architecture.md):** component hierarchy, TypeScript types, state management, the player and fetch design, and a table of every tested utility.
- **[PROMPTS.md](PROMPTS.md):** the log of prompts used to build the project with the AI agent.
- **[AGENTS.md](AGENTS.md):** the working rules the agent followed.

## Credits & notes

- Track data, 30-second previews and artwork © Apple / the respective rights holders, via the public iTunes Search API. Previews only; no full tracks.
- Signature riff tabs are short, simplified excerpts for practice. Every other tab is an original practice riff in the track's style, not a transcription.

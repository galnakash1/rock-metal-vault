# 🤘 Rock & Metal Vault

**Rock & Metal Vault** is a dark, stage-lit web app for rock and metal fans. You can explore rock, metal and metalcore tracks from around the world, and play their 30-second previews through an amp console with EQ presets and a live visualizer. Each track has a 6-string riff tab you can play along with. You can turn your favourite tracks into a festival poster, and test your ears in a 5-round riff guessing game.

It is a front-end-only single-page app built with **React 19 + TypeScript + Vite**. All music data comes from Apple's public, keyless **iTunes Search & Lookup API**. There is no backend, no login and no API key.

> Built as a full-stack course project, one task at a time with an AI coding agent. See [Project documentation](#project-documentation).

---

## Pages & routes

| Route | Page | What you can do |
| --- | --- | --- |
| `/` | **Vault Catalog** | Browse ~290 tracks as cards. Search live, pick a Sonic Mood Capsule, filter by origin country / style / artist, sort, and add tracks to your setlist. |
| `/tracks/:id` | **Track Detail** | 600×600 artwork and track facts, the **Amp Console** (preview player with live EQ and visualizer), and the **6-String Guitar Riff Tab** with a playhead that follows the music. |
| `/setlist` | **Festival Lineup & Poster Builder** | Your saved tracks become a festival poster (Headliners and Main Stage) in one of 3 themes, with a running order you can edit. |
| `/arena` | **Riff Arena** | The **Riff Blind-Test** game (5 rounds, 3 amp-tube lives, final scoreboard) and the **Head-to-Head Track Battle**. |
| `*` | **404** | "This track doesn't exist", with a link back to the Vault. |

A **Now Playing mini-player** stays at the bottom of every page, so a preview keeps playing while you browse.

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
- **🪧 Festival Poster Builder:** the bands you saved most become Headliners in huge type, and the rest form the Main Stage underbill. It shows track, band and runtime stats, with three themes: **Foggy Woodland**, **Blood Moon** and **Vintage Tour**.
- **🎯 Riff Blind-Test Challenge:**
  - A hidden preview plays while the artwork unblurs from 24px to 0px over 30 seconds. You pick the track from 4 options; the 3 decoys are realistic (same style or country first).
  - Faster correct guesses score more (up to 1,000 points per round, 5,000 per set).
  - A set is **5 rounds with 3 amp-tube lives**. A wrong answer or a timeout costs a life.
  - The **Final Scoreboard** shows your rank (Garage Roadie → Immortal Riff God), accuracy, streaks, your all-time high score and best streak (saved in `localStorage`), and a round-by-round recap with Add to Setlist buttons.
- **⚔️ Head-to-Head Track Battle:** pick any two tracks with searchable pickers. They're compared on duration (longer wins), release year (earlier wins), style, origin, guitar tuning and riff tempo. Each card has a preview button and a setlist toggle.

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19, TypeScript 6 (strict mode, **zero `any`**), Vite 8 |
| Routing | React Router 7 (`BrowserRouter`, `NavLink`, `useParams`) |
| Audio | HTML5 `<audio>` + Web Audio API |
| State | React state and props, plus one small external store for the player (`useSyncExternalStore`). No state library. |
| Persistence | `localStorage` (setlist, catalog cache, arena records) |
| Styling | Plain CSS with custom properties: a dark Rock/Metal theme, responsive from 375px. **No UI library.** |
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

# Open the interactive Vitest UI dashboard in your browser
npm run test:ui
```

There are **114 unit tests in 5 files**. They cover the app's pure logic and never touch the network:

| Test file | Covers |
| --- | --- |
| `src/utils/trackUtils.test.ts` | Duration formatting, artwork upgrade, response validation, normalization and de-duplication, band origin and style enrichment, the genre allowlist and namesake rejection, filtering, Sonic Mood Capsules (with boundaries), sorting, riff tabs and playhead, and the Riff Arena rules (rounds and decoys, blur, scoring, sets and lives, ranks, records, Head-to-Head metrics) |
| `src/utils/setlistUtils.test.ts` | Setlist toggle and remove, `localStorage` parsing (including corrupted data), and poster tiers (Headliners vs Main Stage) |
| `src/utils/catalogCache.test.ts` | The catalog cache TTL and validation, and the progressive merge |
| `src/utils/audioUtils.test.ts` | EQ presets, visualizer frequency bucketing, and mini-player visibility |
| `src/api/itunes.test.ts` | The request plan (stays under Apple's rate limit) |

The tests use `src/data/mockTracks.json` as a fixture: 10 real iTunes records, loaded through the same validation as live data.

## API & data architecture

### Endpoints (public, no API key)

| Endpoint | Used for |
| --- | --- |
| `https://itunes.apple.com/search?term=…&media=music&entity=song&limit=50` | Three broad searches (`rock`, `metal`, `metalcore`) for the mainstream catalog |
| `https://itunes.apple.com/lookup?id=…&entity=song&limit=3` | 3 songs from each of 61 curated international bands, by Apple artist id (4 parallel lookups of ~16 ids each) |

Preview audio and artwork are served with `Access-Control-Allow-Origin: *`, which lets the Web Audio API analyse and EQ the previews.

### Loading pipeline

1. **Instant from cache.** The normalized catalog is cached in memory and in **`localStorage`** for 6 hours, and shared by every tab. A cached load renders the full catalog on the first frame, with no network requests.
2. **Progressive network load.** On a cold start, the 7 requests run in parallel. Tracks appear as soon as the fastest search returns (about 0.8 s in a production build); the rest merge in under a "Loading more bands…" note (the full catalog takes about 1.8 s). If one request fails, the others still load.
3. **Validate → normalize → enrich → de-duplicate → filter.** Responses are checked at runtime (`parseSearchResults`), mapped to the app's `Track` model, and enriched. Duplicate `trackId`s are dropped, so React keys are always unique. Off-genre hits like "Jingle Bell Rock" are filtered out.
4. **Rate-limit friendly.** Apple allows roughly 20 requests per minute. React StrictMode's double mount shares one in-flight batch, cached loads make no requests, and **Retry** forces a fresh fetch.

### Enrichment

Apple's `country` field is the storefront, not where a band formed, so `normalizeTrack` adds three fields from a curated map of 165 artists (`src/utils/artistMetadata.ts`):

- **`originCountry`** and **`originFlag`**, e.g. `"Israel"` / 🇮🇱
- **`subgenre`**, e.g. `"Oriental / Folk Metal"`

Matching uses Apple's artist id first, then the name with accents and case ignored. That means a hip-hop "Ghost" never becomes Sweden's Ghost, and "Solstafir" still matches Sólstafir. Unlisted artists get an honest **"Unknown" 🌐** origin and a style derived from the iTunes genre; a country is never guessed.

### Browser storage

| Key | Contents |
| --- | --- |
| `rmv:catalog:v3` | Cached catalog (6 h TTL) |
| `rmv:setlist` | Your festival setlist (full tracks, re-validated on load) |
| `rmv:arena:high-score`, `rmv:arena:best-streak` | All-time Riff Blind-Test records |

## Project structure

```
src/
├── api/itunes.ts            # Request plan, progressive batch, caches
├── audio/playerEngine.ts    # App-wide player: one <audio> + Web Audio graph + store
├── hooks/usePlayer.ts       # useSyncExternalStore subscription to the player
├── components/              # Navbar, TrackCard, FilterBar, MoodCapsules, AudioPreviewPlayer,
│                            # RiffTabPanel, MiniPlayer, SetlistButton, FestivalPoster,
│                            # BlindTestGame, HeadToHead, TrackSelect, StatusMessage
├── pages/                   # CatalogPage, TrackDetailPage, SetlistPage, ArenaPage, NotFoundPage
├── types/                   # track.ts, riff.ts, audio.ts (strict types, no `any`)
├── utils/                   # Pure, unit-tested logic (+ *.test.ts)
├── data/mockTracks.json     # Test fixture
├── App.tsx                  # Routes + shared state (catalog, filters, setlist)
├── index.css                # Design tokens & base styles
└── App.css                  # Component styles
```

## Project documentation

- **[PRD.md](PRD.md):** product requirements, pages, and acceptance criteria ("When I…, I see…").
- **[tasks.md](tasks.md):** the step-by-step build plan, one task at a time.
- **[docs/architecture.md](docs/architecture.md):** component hierarchy, TypeScript types, state management, the player and fetch design, and a table of every tested utility.
- **[PROMPTS.md](PROMPTS.md):** the log of prompts used to build the project with the AI agent.
- **[AGENTS.md](AGENTS.md):** the working rules the agent followed.

## Credits & notes

- Track data, 30-second previews and artwork © Apple / the respective rights holders, via the public iTunes Search API. Previews only; no full tracks.
- Signature riff tabs are short, simplified excerpts for practice. Every other tab is an original practice riff in the track's style, not a transcription.

# 🤘 Rock & Metal Vault

**Rock & Metal Vault** is a dark, stage-lit web app for rock and metal fans. You can explore rock, metal and metalcore tracks from around the world, and play their 30-second previews through an amp console with EQ presets and a live visualizer. Each track has a 6-string riff tab you can play along with. You can turn your favourite tracks into a festival poster with a world tour, test your ears in a 4-stage riff guessing tournament, and get a personal 10-track playlist from a 5-question Sonic Diagnostic.

It is a front-end-only single-page app built with **React 19 + TypeScript + Vite**. All music data comes from Apple's public, keyless **iTunes Search & Lookup API**. There is no backend, no login and no API key.

> Built as a full-stack course project, one task at a time with an AI coding agent. See [Project documentation](#project-documentation).

---

## Pages & routes

| Route | Page | What you can do |
| --- | --- | --- |
| `/` | **Vault Catalog** | Browse ~1,030 studio tracks as cards (rendered 48 at a time as you scroll, or with **Show More Tracks**). Search live, pick a Sonic Mood Capsule, filter by origin country / style / artist, sort, press ▶ on any card to queue the filtered list from that track, and add tracks to your setlist. |
| `/tracks/:id` | **Track Detail** | 600×600 artwork and track facts, full-song links (Apple Music, Spotify, YouTube), the **Amp Console** (preview player with live EQ and visualizer), and the **6-String Guitar Riff Tab** with a playhead that follows the music. |
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

# Open the interactive Vitest UI dashboard in your browser
npm run test:ui
```

There are **178 unit tests in 7 files**. They cover the app's pure logic and never touch the network:

| Test file | Covers |
| --- | --- |
| `src/utils/trackUtils.test.ts` | Duration formatting, artwork upgrade, response validation, the studio-only (no live) filter, the compilation filter, normalization and de-duplication, the catalog tiers, band origin and style enrichment, the genre allowlist and namesake rejection, filtering, Sonic Mood Capsules (with boundaries), sorting, riff tabs and playhead, and the Riff Arena rules (rounds and decoy modes, blur, scoring, tournament stages, stage pools, lives across stages, ranks, records, Head-to-Head metrics) |
| `src/utils/setlistUtils.test.ts` | Setlist toggle, remove and bulk add, `localStorage` parsing (including corrupted data), poster tiers (Headliners vs Main Stage), the 6 poster themes, and the world tour dates |
| `src/utils/builderUtils.test.ts` | The Sonic Diagnostic: questions, profile scoring, ranking, the 10-track playlist (max 2 per band), swapping, and Metal Personas |
| `src/utils/streamingLinks.test.ts` | Apple Music / Spotify / YouTube links and search queries |
| `src/utils/catalogCache.test.ts` | The catalog cache TTL and validation, the progressive merge, song-level de-duplication (the original release wins), the 25-songs-per-band cap, and canonical album artwork |
| `src/utils/audioUtils.test.ts` | EQ presets, visualizer frequency bucketing, mini-player visibility, and lineup queue navigation (⏮ / ⏭ / auto-advance) |
| `src/api/itunes.test.ts` | The request plan (deep, headliner and spotlight tiers; stays under Apple's rate limit) |

The tests use `src/data/mockTracks.json` as a fixture: 10 real iTunes records, loaded through the same validation as live data.

## API & data architecture

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
│                            # CardPlayButton, LineupPlayback, StreamingLinks, StageBackdrop
├── pages/                   # CatalogPage, TrackDetailPage, SetlistPage, ArenaPage,
│                            # PlaylistBuilderPage, NotFoundPage
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

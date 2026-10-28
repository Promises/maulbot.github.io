# Warcraft Maul website

Source of https://warcraftmaul.com, served by GitHub Pages from this repo (`Promises/maulbot.github.io`).
`master` holds the source; `gh-pages` holds the deployed build and is written only by `yarn deploy`.

## Scope
- This repo: the site, its build and deploy, the custom domain, and the runtime GitHub integration.
  The two in-browser tools live here too: the Maze Designer and the Loading Screen Studio.
- Not this repo: the map (`Promises/Warcraft-Maul-Reimagined`) and the host bot. The site only
  reads the map's published output and never edits the map's source.

## Commands
Use **yarn** (1.22.x), never npm. A clean checkout must pass `yarn install --frozen-lockfile`.

- `yarn start`: dev server on :3000
- `yarn build`: production build into `build/`. `postbuild` copies `index.html` to `404.html` so
  deep links like `/maze-designer` survive on Pages. Keep it.
- `CI=true yarn test --watchAll=false`: one run of the Jest suite
- `yarn deploy`: `predeploy` builds, then `gh-pages -d build` pushes `build/` to the `gh-pages` branch.
  This changes the public site.

The project builds on Node 24 with react-scripts 5 and needs no OpenSSL flag. The `fs.F_OK`
deprecation and stale caniuse-lite warnings are harmless.

## Rules for changes
- **Every deploy needs the operator's explicit go-ahead.** Pushes to `master` also need the operator's word.
  Build and test locally before a deploy, then check the live site afterwards.
- `public/CNAME` (`warcraftmaul.com`) is copied into `build/` and becomes the live custom domain.
  A deploy without it drops the domain. `warcraftmaul.com` is canonical, and the root `CNAME` and
  the `homepage` field in `package.json` say the same. `maulbot.com` is a redirect handled in
  Cloudflare on the operator's side, not in this repo, so don't try to set it up from here.
- Styling: Sass CSS Modules (`*.module.scss`) built on `src/styles/_tokens.scss` and, for the
  full-screen tools, `src/styles/_tool.scss`. No utility-class frameworks.
- Commit as the normal git identity, with no Claude attribution lines.

## Layout
- `src/App.tsx`, `src/routes.ts`: router. `/`, `/changelog`, `/lobbies` (the lobby log) and
  `/wc3-lobbies` use `Layout`. `/wc3-lobbies` lists every open lobby on every map. It is
  deliberately linked from nowhere and is kept out of search: the page adds a robots meta tag, and
  `scripts/hidden-page.js` writes a static `build/wc3-lobbies/index.html` with one at build time.
  Don't add it to `robots.txt`, which would advertise it. `/loading-screen` and
  `/maze-designer` are full-screen without the site chrome. The Maze Designer is lazy-loaded
  because of its tower data.
- `src/pages/`: one component per route. `src/components/`: Hero (the download button), the site
  header and footer, Changelog, Credits, the Discord sections and SourceSection.
- `src/content.ts`: content and config. It holds `MAP_REPO`, the bundled-map fallback, the Discord
  invite, the repo list, credits and `GAME_STATS`. `GAME_STATS` is hand-written and drifts from the
  map, so keep it honest. "Tower races" counts what the map's race picker offers in its normal tabs:
  races that are enabled, not random-only (the Loot Boxer), and in the Beginner, Intermediate or
  Advanced tier. That is fewer than the races marked `enabled` in `races.json`.
- `src/github/`: runtime GitHub client with tests.
- `src/lobbies/`: the lobby tracker client (see below), with the homepage's "Join us in-game"
  panel (`components/JoinPanel`) and the two lobby pages built on it. `components/ChipGroup` is the
  shared filter-button row.
- `src/mazeDesigner/`: grid, A* pathing (`pathing.ts`), analysis, walker. `races.json` is generated.
- `src/loadingScreen/`: renders a loading screen and encodes it as DXT5 DDS for the map.
- `src/assets/wc3/`: the undead Warcraft III UI skin.

## Lobby tracker
The lobby features read our own tracker from the visitor's browser. A signed-in WC3 client reads
Battle.net's custom game list, and wcm-lobby-api serves what it saw. Blizzard has no lobby API. The
API needs no auth and CORS is open.
- **Live feed** (`src/lobbies/feed.ts`): Phoenix channels at `wss://wc3.henning.tech/socket/websocket`,
  using the official `phoenix` client. The homepage panel joins `lobbies:our_map`, which leaves out
  unofficial copies server-side, and `/wc3-lobbies` joins `lobbies:all`. Each join pushes a `snapshot`
  of the open lobbies with `as_of` and `health`. Then come lobby events, each `{event, lobby}`:
  `appeared`, `players`, `meta`, `rehost` (the host made a new game in the same lobby, under the
  same id) and `ended`. Every push with a lobby in it is routed through the channel's `onMessage`,
  so a kind added later updates the lobby instead of being dropped; only `ended` ends one. Events
  carry the count as `players`, not `final_players`. A `health`
  push comes whenever the tracker's status changes. `liveSet.ts` applies all of this. If no snapshot
  arrives within 8s, or the socket drops, `useLiveFeed` reads `GET /v1/lobbies?live=true` every 30s
  until the feed is back.
- **REST** (`https://wc3.henning.tech/v1`, about 10 requests a second per IP): `/lobbies?live=true`
  for the fallback, `/our-map?since=&until=&limit=1000` for the log's history, and `/health`. The
  history includes open lobbies and is read a day at a time; seven quiet days in a row end it. Use
  `/our-map` rather than `map_like` on `/lobbies`, which makes the server scan every map's
  compressed history. An advert the tracker never saw end counts as closed at its `last_seen` once the
  API's derived `state` says `lost`. On a page left open, it also closes once it passes
  `live_window_s` from `/v1/health` since it was last seen. Never hard-code that window: a quiet
  lobby's `last_seen` stands still, and the tracker sets the window (60 min since 2026-10-25).
- `isOurs` keeps our map, which is listed as "Warcraft Maul: Reimagined …", "Warcraft Maul
  Reimagined ….w3x" and "WarcraftMaulReimagined-….w3x". Plain "WarCraft Maul" maps are other
  people's. `Warcraft_Maul_Reimagined_fixed.w3x` is a modified copy that the operator ruled is not
  ours, so the site never advertises or highlights it. The filter runs client-side as well as on the server.
- One lobby can be several adverts under new ids. Until 2026-10-25 14:41 UTC, the tracker's 90s
  resend of its list request made WC3 re-issue every lobby (fixed by wc3-re-3). The history before
  then is full of that churn, and a tracker restart still re-lists every open lobby once. Open
  lobbies carry `session_first_seen`, the tracker's start of the whole chain, and "open for" uses
  it. On the feed an ended advert still counts as open for 10s, which covers tracker restarts and
  keeps the join panel's card from blinking out. For the history, `sessions.ts` joins rows by host,
  name, map file and region when one starts within 5 minutes of the last ending; tracker restarts
  leave gaps of a minute or two.
- `locked` is true when a lobby has a password, false when it has none, and null when it isn't
  known; rows from before the tracker sent it are null. Locked lobbies get a padlock on both
  lobby pages. The join panel leaves our locked lobbies out, since a visitor can't join them, and
  decides on each lobby as it stands. On `/wc3-lobbies`, "Open only" hides lobbies *known* to
  have a password, so unknown ones stay.
- `final_players` is the current count while `ended_at` is null and includes the host. The regions
  are `eu`, `usw` and `kr`, or null. Whether a game started is not observable, so the log says
  "Closed" rather than guessing. `created_time` is the host-reported creation of the lobby's first game,
  frozen after that (one host was 2.3h off). It is neither a game start nor a lobby age; use
  `session_first_seen` for "open since".
- Realm fields that are nullable forever: `private`, `game_type`, `map_source`, `observers`,
  `map_size`, `map_crc` and `map_sha1`. Old lobbies never have them; live ones have since
  2026-10-28. The join panel leaves out `private` lobbies, as it does locked ones. `private` is
  the host's own toggle and is independent of the password. The realm marks every locked lobby
  private, and the few private lobbies without a password are mostly junk or test games, so the
  padlock is the only mark. If you ever count games per lobby (1 + its `rehost` events), skip a
  rehost whose `game_created_time` equals the previous game's: before tracker 8d28d7e the realm
  sometimes alternated one game between two ids. On `/wc3-lobbies`:
  - an eye beside the name when `observers` is `full`
  - "Melee" and "Blizzard map" tags in the Map column (both rare)
  - a Game filter (All / Custom / Melee), where "Custom" hides only known melee games
  `map_size`, `map_crc` and `map_sha1` aren't shown. Don't show `created_time` as lobby age: it
  disagrees with `first_seen` by minutes to hours on some lobbies, and wc3-re-3 is looking into it.
- Tests never connect: `src/__mocks__/phoenix.ts` stands in for the client, and `lobbies/testing.ts`
  drives it.

## Map-repo integration
Visitors' browsers read the map repo at runtime, unauthenticated, so each visitor IP gets 60 requests per hour:
- **Download button** (`fetchLatestMapRelease`): uses the newest non-draft release that carries a
  `.w3x` asset. It reads the release list rather than `/releases/latest` because betas are flagged
  prerelease. The site does no version comparison: whatever GitHub lists first is what players get.
  So a stale download is fixed by a map release, not by a site deploy.
- **Fallback**: while the request is loading, when no release has a `.w3x`, or when the request
  fails (rate limit, outage), the button links to the map repo's releases page and shows no
  version. That way the fallback can't go stale.
- `public/Warcraft_Maul_Reimagined_v4.4.3.w3x` stays deployed only so old direct links to it still
  work, by the operator's decision. Nothing in the site links to it. Don't reference it, update it,
  or delete it.
- **Changelog**: built from the map repo's `Quests/*.md`, one file per version.
- **Maze Designer data** is a build-time snapshot. After the map's races or towers change, run
  `node scripts/maze-designer-data.js <path to a Warcraft-Maul-Reimagined checkout>` and commit the
  regenerated `src/mazeDesigner/races.json`. It records the map commit it came from. The map keeps
  its units and items in `mapdata/*.json` and builds the World Editor binaries from them, so the
  checkout needs its `npm install`, or `node scripts/objdata-json.js import` run in it. The script
  refuses to write a `races.json` with no towers.

## Checking a deploy
The live bundle's TS sources can be compared with a local build through the source maps on
`gh-pages`. Hashed filenames differ between checkouts because CSS-module hashes depend on the path,
so a different `main.*.js` name alone does not mean different code.

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
- `src/App.tsx`, `src/routes.ts`: router. `/` and `/changelog` use `Layout`. `/loading-screen` and
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
- `src/mazeDesigner/`: grid, A* pathing (`pathing.ts`), analysis, walker. `races.json` is generated.
- `src/loadingScreen/`: renders a loading screen and encodes it as DXT5 DDS for the map.
- `src/assets/wc3/`: the undead Warcraft III UI skin.

## Map-repo integration
Visitors' browsers read the map repo at runtime, unauthenticated, so each visitor IP gets 60 requests per hour:
- **Download button** (`fetchLatestMapRelease`): uses the newest non-draft release that carries a
  `.w3x` asset. It reads the release list rather than `/releases/latest` because betas are flagged
  prerelease. The site does no version comparison: whatever GitHub lists first is what players get.
  So a stale download is fixed by a map release, not by a site deploy.
- **Fallback**: while the request is loading, or if it fails (rate limit, outage), the button shows
  the bundled `public/Warcraft_Maul_Reimagined_<BUNDLED_MAP_VERSION>.w3x`.
- **Changelog**: built from the map repo's `Quests/*.md`, one file per version.
- **Maze Designer data** is a build-time snapshot. After the map's races or towers change, run
  `node scripts/maze-designer-data.js <path to a Warcraft-Maul-Reimagined checkout>` and commit the
  regenerated `src/mazeDesigner/races.json`. It records the map commit it came from.

## Checking a deploy
The live bundle's TS sources can be compared with a local build through the source maps on
`gh-pages`. Hashed filenames differ between checkouts because CSS-module hashes depend on the path,
so a different `main.*.js` name alone does not mean different code.

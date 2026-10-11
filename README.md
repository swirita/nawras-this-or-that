# Nawras أيّهما؟

A presenter-laptop game built with Vite, vanilla JavaScript, HTML and CSS. Use Node **24** and npm.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open Vite's printed URL at `/nawras-this-or-that/`. Commands:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
npx.cmd playwright install chromium
npm.cmd run test:browser
```

On macOS/Linux use `npm`/`npx` instead of `npm.cmd`/`npx.cmd`.

## Play

Enter a trimmed, non-empty name to enable Start. Every player receives the same ten supplied questions, shuffled independently of their name. Both option positions are shuffled with Fisher-Yates. Grading uses permanent option IDs; each question permits one selection. Correct answers add ten points; wrong answers continue with zero. Feedback marks the correct answer and an incorrect selection with text/icons and color, then Next advances. Final score is out of 100.

The game uses Arabic RTL text and LTR `bdi` isolation for English labels, numbers and units. Source URLs are in [question-references.md](docs/question-references.md), without citation widgets in the displayed explanations. Data validation checks exactly ten unique question IDs, twenty unique option IDs, two options per question and matching correct IDs.

F toggles fullscreen outside typing controls; Escape keeps normal browser/dialog behavior. Smaller screens can scroll; reduced-motion preferences are respected.

The question card centers in the available space below the header and progress. Its front contains the question/options; its back contains status, the prominent correct answer, explanation and Next. A 550 ms vertical flip and a 120 ms reveal fade finish before Next becomes interactive. Hidden faces are inert and excluded from screen readers. Next replaces the hidden front before flipping back, so the old question never flashes. The fixed card footprint stays stable; smaller screens can scroll. Reduced motion removes entrance, flip and fade animations.

No sound assets were supplied. Lightweight Web Audio phrases provide a soft click, gentle correct/wrong tones and completion chime without music. Card flips and return transitions are silent; the airy effect has been removed. Each audible action cancels any preceding phrase; sounds within a phrase play sequentially. Audio initializes from Start. The corner sound icon remembers mute in the separate `nawras-this-or-that:muted:v1` key; clearing scores leaves this preference intact.

The centered Reset / Stop control below the gameplay card opens a matching modal with Home Screen, Reset Game, close X and Escape. Home Screen abandons the current round and clears name entry; Reset Game abandons it and starts a newly shuffled round with the same player and a new round ID. Neither action saves the unfinished round or changes saved scores. Closing the popup keeps question/reveal state. Unanswered timing continues while it is open. The modal blocks background interaction, contains keyboard focus and freezes scrolling/particles without shifting layout.

Answer labels are grid-centered without an empty feedback/icon row, with safe wrapping. Text-box trimming removes the font's excess space above and below the visible letters, without changing button dimensions or typography. Both card flips cancel any lingering notes and trigger no playback; correct/wrong feedback sounds play only after the reveal is ready. Browser tests inspect visible glyph pixels and trace audio sources during both transitions. A single shared layer of 40 more visible, gently fading particles uses the supplied sprite plus small pale-blue/cyan dots and occasional lavender sprites, with slow drift and fading. It stays behind every screen, ignores clicks and respects reduced motion. The landing NAWRAS title has a crisp bottom-only 8 px white shadow; branding images are unchanged. The square `nawras-small.png` favicon and touch icon use base-aware URLs.

## Timing and completion

`src/core/round.js` contains the independent engine. The UI enables answer buttons and calls `showQuestion()` after entrance/return animations finish and two rendering frames commit the new front. Timing uses monotonic `performance.now()`, stops immediately on selection, and excludes feedback, Next waiting and screen transitions. Active-question time continues during background tab switches, so changing tabs grants no free thinking time.

Final cumulative time is rounded once to integer centiseconds (`answerTimeCs`). Display and ranking both use this value, with seconds to two decimals. A unique `resultId` identifies each round. The engine calls completed-result persistence once; incomplete rounds and results re-renders never save. Storage failures are shown on results; the completed round is not retried automatically.

Play Again retains the player ID/name and starts a newly shuffled round with reset score/time/progress. Next Player clears name entry and creates a new UUID on the next Start. Matching names are separate players. Results always show this round; the embedded leaderboard highlights the current player's best result, identifies an earlier best when retained, and scrolls only its panel. The full leaderboard remains available and returns to results when opened from there.

## Storage and ranking

The dedicated key is `nawras-this-or-that:leaderboard:v2`, containing `version: 2` and `results`. Records contain `playerId`, `resultId`, `name`, `score` and integer `answerTimeCs`.

Existing v1 millisecond data is preserved: it is read when v2 is absent and rounded to centiseconds. The next completed save writes all valid best results to v2; the legacy key remains until Clear. Clear affects only this game's v1/v2 keys, with the existing Cancel/Clear confirmation, focus loop, Escape support, frozen background and stable layout.

Clear Leaderboard is available on both results and the full leaderboard, and is disabled when empty. Cancel, Escape and the close button preserve scores. Clearing from results keeps the completed round's metrics visible without saving it again; the leaderboard remains empty through navigation and refresh until a new round completes. The shared panel fits short lists and caps long lists with vertical scrolling, using one table for aligned sticky headings and rows without a reserved empty scrollbar gutter.

A player's best score wins, then shorter time. Equal score/time shares competition ranks (1, 2, 2, 4). All ranks 1–5, including ties at fifth, are highlighted. Malformed records and blocked browser storage are handled safely. Scores survive browser refresh. Names are rendered as text, never HTML. No demo scores are included.

## Assets and design

Original assets and design files are preserved. `nawras-name.png` is the logo; `nawras-small.png` is the source for the 16/32/48-pixel PNG favicons and multi-size `favicon.ico`; `pixel-particles.png` supplies ambient particles. Regenerate favicon variants with `node scripts/generate-favicon.mjs` after installing Chromium for Playwright. All URLs use Vite's Pages base. The supplied Slasher screenshot guides the icy grid, glow, translucent panels and matching buttons. Wordle/Memory references and custom font files were not supplied; typography uses local system fonts.

HTML icon links use root-relative public paths so Vite applies the repository base once in both development and production. The favicon regression check verifies image content types and decoding on both servers; an HTTP 200 alone can hide an HTML fallback from a bad icon path.

## GitHub and Pages

Existing origin: https://github.com/swirita/nawras-this-or-that

Vite base is `/nawras-this-or-that/`. Screens swap within one document; no server routing is needed. CI runs `npm ci`, unit tests, build, and Chromium browser checks on pushes and pull requests.

Pages remains **manual only**. Enable **Settings → Pages → Source → GitHub Actions**, then **Actions → Deploy GitHub Pages (manual) → Run workflow → main** when publication is intended. Connecting or pushing does not deploy. Automatic deployment can be added later.

## Verification

Unit tests cover supplied-data validation, ten unique shuffled questions, shuffled-option grading, wrong-answer continuation, 100-point maximum, duplicate selections/Next, exactly-once saving, monotonic answer time excluding feedback/transitions, best-result updates, ties, matching names, invalid/blocked storage and v1 migration.

Browser checks exercise actual playable rounds and results, replay and Next Player, double clicks, current-player scrolling, background timing, persistence, Clear confirmation, safe names, RTL/LTR content, laptop/mobile layouts, fullscreen, reduced motion and assets under the Pages base. Screenshots are written to ignored `test-results/`. Test fixtures are isolated browser records and never ship as saved scores.
